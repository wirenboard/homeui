#!/usr/bin/env python3

import copy
import enum
import hashlib
import json
import logging
import os
import tempfile
import threading
from dataclasses import dataclass
from typing import Any, Optional

from .board import of_machine_match

DEFAULT_CONFIG_PATH = "/etc/wb-webui.conf"
DEFAULT_BOARD_CONFIG_DIR = "/usr/share/wb-mqtt-homeui"
DEFAULT_BASELINE_STATE_PATH = "/var/lib/wb-homeui/default-dashboards.state"

DEFAULT_BOARD_SUFFIX = "default"


class DashboardWriteOutcome(enum.Enum):
    """Result of a single-dashboard write, mapped to an HTTP status by the handlers."""

    CREATED = "created"
    REPLACED = "replaced"
    UPDATED = "updated"
    CONFLICT = "conflict"
    NOT_FOUND = "not_found"


class SeedConfigError(RuntimeError):
    """Unrecoverable seeding failure: the board config is missing/undetected/unreadable."""


# Device-tree `compatible` -> board config suffix, in match order (85x before 8xx).
BOARD_MATCHES: list[tuple[str, str]] = [
    ("wirenboard,wirenboard-85x", "wb85"),
    ("wirenboard,wirenboard-8xx", "wb8"),
    ("wirenboard,wirenboard-74x", "wb74"),
    ("wirenboard,wirenboard-720", "wb7"),
    ("contactless,imx6ul-wirenboard60", "wb6"),
    ("contactless,imx28-wirenboard50", "wb5"),
]


def detect_board() -> str:
    """Return the board config suffix via of_machine_match, or "default" if none matches."""
    for compatible, suffix in BOARD_MATCHES:
        try:
            if of_machine_match(compatible):
                return suffix
        except Exception as e:  # pylint: disable=broad-exception-caught
            logging.error("Failed to match board %s: %s", compatible, e)
    return DEFAULT_BOARD_SUFFIX


def dashboard_content_hash(dashboard: dict) -> str:
    """Stable content hash of a dashboard, computed identically at write and compare time."""
    # Persisted contract: changing this canonicalization invalidates every stored baseline,
    # so it must stay stable across releases.
    normalized = json.dumps(dashboard, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


@dataclass
class BaselineState:
    # dashboard id -> content hash recorded when the default was last installed/updated
    hashes: dict[str, str]

    @classmethod
    def from_dict(cls, data: Any) -> "BaselineState":
        hashes: dict[str, str] = {}
        if isinstance(data, dict):
            raw_hashes = data.get("hashes")
            if isinstance(raw_hashes, dict):
                hashes = {k: v for k, v in raw_hashes.items() if isinstance(v, str)}
        return cls(hashes=hashes)

    def to_dict(self) -> dict:
        return {"hashes": self.hashes}


def _atomic_write_json(path: str, data: Any) -> None:
    """Write JSON to path atomically (temp file in the same dir + os.replace).

    Resolves symlinks first: WB points /etc/wb-webui.conf at /mnt/data, and os.replace onto a
    symlink would replace the link itself rather than its target.
    """
    real_path = os.path.realpath(path)
    directory = os.path.dirname(real_path) or "."
    os.makedirs(directory, exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=directory, prefix=".wb-homeui-", suffix=".tmp")
    try:
        # 0644 (mkstemp creates 0600) so confed can still read wb-webui.conf.
        os.fchmod(tmp_fd, 0o644)
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        os.replace(tmp_path, real_path)
    except Exception:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise


def _strip_svg_current(config: dict) -> dict:
    """Strip svg.current from every dashboard in place, returning the same config object."""
    for dashboard in config.get("dashboards", []):
        if isinstance(dashboard, dict):
            svg = dashboard.get("svg")
            if isinstance(svg, dict):
                svg.pop("current", None)
    return config


class DashboardsStore:
    """Owns /etc/wb-webui.conf: reads the lightweight index, serves/writes inline SVG.

    The on-disk format is unchanged (svg.current stays inline) for rollback safety. Writes are
    atomic and serialized with a lock so concurrent read-modify-writes can't corrupt the config.
    """

    def __init__(
        self,
        config_path: str = DEFAULT_CONFIG_PATH,
        board_config_dir: str = DEFAULT_BOARD_CONFIG_DIR,
        baseline_state_path: str = DEFAULT_BASELINE_STATE_PATH,
    ):
        self._config_path = config_path
        self._board_config_dir = board_config_dir
        self._baseline_state_path = baseline_state_path
        self._lock = threading.Lock()
        # Parsed-config cache keyed by content hash (not mtime, so out-of-band edits and rapid
        # successive writes are detected); skips re-parsing the SVG-laden config when unchanged.
        self._cached_config: Optional[dict] = None
        self._cached_digest: Optional[str] = None

    def get_index(self) -> dict:
        """Lightweight config: full config with svg.current removed from every dashboard."""
        with self._lock:
            config = self._read_config()
        # _read_config returns an owned deepcopy, so strip in place.
        return _strip_svg_current(config)

    def get_svg(self, dashboard_id: str) -> Optional[str]:
        """Raw svg.current for the dashboard, or None if missing/not SVG/no current."""
        with self._lock:
            config = self._read_config()
        dashboard = self._find_dashboard(config, dashboard_id)
        if dashboard is None or not dashboard.get("isSvg"):
            return None
        svg = dashboard.get("svg")
        if not isinstance(svg, dict):
            return None
        current = svg.get("current")
        return current if isinstance(current, str) else None

    def get_config_mtime(self) -> Optional[float]:
        """Config file mtime in epoch seconds for HTTP Last-Modified, or None if absent."""
        try:
            return os.stat(self._config_path).st_mtime
        except OSError:
            return None

    def replace_collection(self, new_config: dict) -> None:
        """Rewrite the collection structure + text dashboards (PUT /api/dashboards).

        Rebuilds the dashboards list in body order: SVG dashboards are taken from disk verbatim
        (body content ignored), text dashboards come from the body with any stray svg.current
        stripped. On-disk dashboards omitted by the body are kept (deletion is only via DELETE).
        Top-level widgets/defaultDashboardId/description/isShowWidgetsPage come from the body.
        """
        with self._lock:
            current_config = self._read_config()
            disk_by_id = {
                d["id"]: d for d in current_config.get("dashboards", []) if isinstance(d, dict) and "id" in d
            }

            merged = current_config  # owned deepcopy from _read_config; reused as the merge base
            new_dashboards: list = []
            seen_ids: set = set()
            for entry in new_config.get("dashboards", []):
                if not isinstance(entry, dict):
                    continue
                entry_id = entry.get("id")
                # First occurrence of a duplicate id wins; never store it twice.
                if entry_id is not None and entry_id in seen_ids:
                    continue
                disk_dashboard = disk_by_id.get(entry_id)
                if disk_dashboard is not None and disk_dashboard.get("isSvg"):
                    # SVG dashboard: taken from disk as-is, never from the body.
                    new_dashboards.append(copy.deepcopy(disk_dashboard))
                else:
                    text_dashboard = copy.deepcopy(entry)
                    svg = text_dashboard.get("svg")
                    if isinstance(svg, dict):
                        svg.pop("current", None)
                    new_dashboards.append(text_dashboard)
                if entry_id is not None:
                    seen_ids.add(entry_id)

            # Preserve any on-disk dashboard the body omitted (delete nothing).
            for disk_dashboard in current_config.get("dashboards", []):
                if not isinstance(disk_dashboard, dict):
                    continue
                if disk_dashboard.get("id") not in seen_ids:
                    new_dashboards.append(copy.deepcopy(disk_dashboard))

            merged["dashboards"] = new_dashboards
            for key in ("widgets", "defaultDashboardId", "description", "isShowWidgetsPage"):
                if key in new_config:
                    merged[key] = copy.deepcopy(new_config[key])

            self._write_config(merged)

    def put_dashboard(self, url_id: str, dashboard: dict) -> DashboardWriteOutcome:
        """Create-or-replace one whole dashboard, incl. svg.current (PUT /api/dashboards/<id>).

        The new id comes from the body (or url_id). Renaming onto an id held by a different
        dashboard -> CONFLICT (config unchanged). A record at url_id is replaced in place (any
        stale url_id entry dropped), otherwise appended; other dashboards and widgets are
        untouched. Returns CREATED when url_id did not exist, else REPLACED (covers rename).
        """
        new_id = dashboard.get("id") or url_id
        with self._lock:
            config = self._read_config()
            dashboards: list = config.setdefault("dashboards", [])
            url_index = self._index_of(dashboards, url_id)

            if new_id != url_id:
                conflict_index = self._index_of(dashboards, new_id)
                if conflict_index is not None and conflict_index != url_index:
                    return DashboardWriteOutcome.CONFLICT

            record = copy.deepcopy(dashboard)
            record["id"] = new_id

            if url_index is None:
                dashboards.append(record)
                outcome = DashboardWriteOutcome.CREATED
            else:
                dashboards[url_index] = record
                outcome = DashboardWriteOutcome.REPLACED
                if new_id != url_id:
                    # Drop any other entry still carrying the old id.
                    config["dashboards"] = [
                        d
                        for i, d in enumerate(dashboards)
                        if i == url_index or not (isinstance(d, dict) and d.get("id") == url_id)
                    ]

            self._write_config(config)
            return outcome

    def patch_dashboard(self, url_id: str, patch: dict) -> DashboardWriteOutcome:
        """Partially update one dashboard without touching svg.current (PATCH /api/dashboards/<id>).

        Missing record -> NOT_FOUND; renaming onto another dashboard's id -> CONFLICT. options is
        merged; other provided fields are set; any svg key is ignored. Returns UPDATED on success.
        """
        with self._lock:
            config = self._read_config()
            dashboards: list = config.setdefault("dashboards", [])
            url_index = self._index_of(dashboards, url_id)
            if url_index is None:
                return DashboardWriteOutcome.NOT_FOUND

            new_id = patch.get("id")
            if new_id is not None and new_id != url_id:
                conflict_index = self._index_of(dashboards, new_id)
                if conflict_index is not None and conflict_index != url_index:
                    return DashboardWriteOutcome.CONFLICT

            dashboard = dashboards[url_index]
            for key, value in patch.items():
                if key == "svg":
                    continue
                if key == "options" and isinstance(value, dict):
                    options = dashboard.get("options")
                    if not isinstance(options, dict):
                        options = {}
                        dashboard["options"] = options
                    options.update(copy.deepcopy(value))
                    continue
                dashboard[key] = copy.deepcopy(value)

            self._write_config(config)
            return DashboardWriteOutcome.UPDATED

    def delete_dashboard(self, url_id: str) -> None:
        """Remove a dashboard and its inline svg (DELETE /api/dashboards/<id>); idempotent.

        The shared widgets array is left alone (widgets may be shared; cleanup is out of scope).
        """
        with self._lock:
            config = self._read_config()
            dashboards: list = config.get("dashboards", [])
            if self._index_of(dashboards, url_id) is None:
                return
            config["dashboards"] = [
                d for d in dashboards if not (isinstance(d, dict) and d.get("id") == url_id)
            ]
            self._write_config(config)

    def seed_and_reconcile(self, board_suffix: str) -> None:
        """Seed the config if absent, then reconcile defaults against the baseline state.

        Reconciliation adds defaults never installed here and updates unmodified ones, leaving
        user-modified or user-deleted ones untouched. Raises SeedConfigError if
        config.<board_suffix>.json cannot be read; transient IO failures propagate as-is.
        """
        with self._lock:
            board_config = self._read_board_config(board_suffix)
            if board_config is None:
                raise SeedConfigError(f"No board config for suffix '{board_suffix}'")

            if not os.path.exists(self._config_path):
                self._seed(board_config)
                return

            self._reconcile(board_config)

    # --- Private ---

    def _read_config(self) -> dict:
        with open(self._config_path, "rb") as f:
            raw = f.read()
        digest = hashlib.sha256(raw).hexdigest()
        if self._cached_config is None or digest != self._cached_digest:
            config = json.loads(raw.decode("utf-8"))
            if not isinstance(config, dict):
                raise TypeError("wb-webui.conf is not a JSON object")
            self._cached_config = config
            self._cached_digest = digest
        # Copy so callers can mutate without corrupting the cache (immutable SVG strings shared).
        return copy.deepcopy(self._cached_config)

    def _write_config(self, config: dict) -> None:
        _atomic_write_json(self._config_path, config)
        # Invalidate; the next read re-parses the file bytes.
        self._cached_config = None
        self._cached_digest = None

    def _read_board_config(self, board_suffix: str) -> Optional[dict]:
        path = os.path.join(self._board_config_dir, f"config.{board_suffix}.json")
        try:
            with open(path, "r", encoding="utf-8") as f:
                config = json.load(f)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logging.error("Failed to read board config %s: %s", path, e)
            return None
        if not isinstance(config, dict):
            logging.error("Board config %s is not a JSON object", path)
            return None
        return config

    def _read_baseline_state(self) -> BaselineState:
        try:
            with open(self._baseline_state_path, "r", encoding="utf-8") as f:
                return BaselineState.from_dict(json.load(f))
        except FileNotFoundError:
            return BaselineState(hashes={})
        except Exception as e:  # pylint: disable=broad-exception-caught
            logging.error("Failed to read baseline state %s: %s", self._baseline_state_path, e)
            return BaselineState(hashes={})

    def _write_baseline_state(self, state: BaselineState) -> None:
        _atomic_write_json(self._baseline_state_path, state.to_dict())

    def _seed(self, board_config: dict) -> None:
        logging.info("Seeding %s from board config", self._config_path)
        self._write_config(copy.deepcopy(board_config))
        state = BaselineState(hashes={})
        for dashboard in board_config.get("dashboards", []):
            if isinstance(dashboard, dict) and "id" in dashboard:
                state.hashes[dashboard["id"]] = dashboard_content_hash(dashboard)
        self._write_baseline_state(state)

    def _reconcile(self, board_config: dict) -> None:
        try:
            live_config = self._read_config()
        except Exception as e:  # pylint: disable=broad-exception-caught
            logging.error("Failed to read live config for reconciliation: %s", e)
            return

        state = self._read_baseline_state()
        live_dashboards: list = live_config.setdefault("dashboards", [])
        config_changed = False
        state_changed = False

        for default_dashboard in board_config.get("dashboards", []):
            if not isinstance(default_dashboard, dict) or "id" not in default_dashboard:
                continue
            dashboard_id = default_dashboard["id"]
            default_hash = dashboard_content_hash(default_dashboard)
            live_dashboard = self._find_dashboard(live_config, dashboard_id)

            if dashboard_id not in state.hashes:
                # No baseline memory: add it if absent from live; if already present (pre-baseline
                # migration), just adopt the hash so we neither duplicate nor clobber a user edit.
                if live_dashboard is None:
                    live_dashboards.append(copy.deepcopy(default_dashboard))
                    self._add_missing_widgets(board_config, live_config, default_dashboard)
                    config_changed = True
                state.hashes[dashboard_id] = default_hash
                state_changed = True
                continue

            if live_dashboard is None:
                # User-deleted: keep the baseline so it never resurrects.
                continue

            if dashboard_content_hash(live_dashboard) == state.hashes[dashboard_id]:
                # Unmodified default -> update to the new default (skip if already current).
                if state.hashes[dashboard_id] != default_hash:
                    live_dashboard.clear()
                    live_dashboard.update(copy.deepcopy(default_dashboard))
                    self._add_missing_widgets(board_config, live_config, default_dashboard)
                    state.hashes[dashboard_id] = default_hash
                    config_changed = True
                    state_changed = True
            # else: user-modified -> leave untouched.

        if config_changed:
            self._write_config(live_config)
        if state_changed:
            self._write_baseline_state(state)

    def _add_missing_widgets(self, board_config: dict, live_config: dict, dashboard: dict) -> None:
        referenced = dashboard.get("widgets", [])
        if not isinstance(referenced, list):
            return
        live_widgets: list = live_config.setdefault("widgets", [])
        live_widget_ids = {w["id"] for w in live_widgets if isinstance(w, dict) and "id" in w}
        default_widgets_by_id = {
            w["id"]: w for w in board_config.get("widgets", []) if isinstance(w, dict) and "id" in w
        }
        for widget_id in referenced:
            if widget_id in live_widget_ids:
                continue
            default_widget = default_widgets_by_id.get(widget_id)
            if default_widget is not None:
                live_widgets.append(copy.deepcopy(default_widget))
                live_widget_ids.add(widget_id)

    @staticmethod
    def _find_dashboard(config: dict, dashboard_id: str) -> Optional[dict]:
        for dashboard in config.get("dashboards", []):
            if isinstance(dashboard, dict) and dashboard.get("id") == dashboard_id:
                return dashboard
        return None

    @staticmethod
    def _index_of(dashboards: list, dashboard_id: str) -> Optional[int]:
        for index, dashboard in enumerate(dashboards):
            if isinstance(dashboard, dict) and dashboard.get("id") == dashboard_id:
                return index
        return None
