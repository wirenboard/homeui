import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from wb.homeui_backend.dashboards import (
    DEFAULT_BOARD_SUFFIX,
    DashboardsStore,
    DashboardWriteOutcome,
    SeedConfigError,
    dashboard_content_hash,
    detect_board,
)

SVG_MARKUP = "<svg><rect/></svg>"
OTHER_SVG_MARKUP = "<svg><circle/></svg>"


def make_config() -> dict:
    """A config with one text dashboard and one SVG dashboard (inline svg.current)."""
    return {
        "dashboards": [
            {
                "id": "dashboard1",
                "isSvg": False,
                "name": "Text",
                "widgets": ["widget1"],
            },
            {
                "id": "dashboard2",
                "isSvg": True,
                "name": "SVG",
                "svg_url": "local",
                "svg_fullwidth": True,
                "widgets": [],
                "svg": {
                    "current": SVG_MARKUP,
                    "params": [{"id": "p1"}],
                },
            },
        ],
        "widgets": [{"id": "widget1", "name": "W1", "cells": []}],
        "defaultDashboardId": "dashboard1",
        "isShowWidgetsPage": True,
    }


def make_text_dashboard(dashboard_id: str, name: str = "Text") -> dict:
    return {"id": dashboard_id, "isSvg": False, "name": name, "widgets": []}


def make_svg_dashboard(dashboard_id: str, markup: str, name: str = "SVG") -> dict:
    return {
        "id": dashboard_id,
        "isSvg": True,
        "name": name,
        "widgets": [],
        "svg": {"current": markup, "params": [{"id": "p1"}]},
    }


class DashboardsStoreFixture(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp_dir, ignore_errors=True)
        self.config_path = os.path.join(self.tmp_dir, "wb-webui.conf")
        self.board_dir = os.path.join(self.tmp_dir, "board")
        self.state_path = os.path.join(self.tmp_dir, "state", "default-dashboards.state")
        os.makedirs(self.board_dir, exist_ok=True)
        self.store = DashboardsStore(
            config_path=self.config_path,
            board_config_dir=self.board_dir,
            baseline_state_path=self.state_path,
        )

    def write_config(self, config: dict) -> None:
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(config, f)

    def read_config(self) -> dict:
        with open(self.config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def write_board_config(self, suffix: str, config: dict) -> None:
        path = os.path.join(self.board_dir, f"config.{suffix}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(config, f)

    def read_state(self) -> dict:
        with open(self.state_path, "r", encoding="utf-8") as f:
            return json.load(f)


class GetIndexTest(DashboardsStoreFixture):
    def test_index_strips_svg_current_keeps_rest(self):
        """The index drops every svg.current but keeps svg.params, widgets, settings."""
        self.write_config(make_config())

        index = self.store.get_index()

        svg_dashboard = next(d for d in index["dashboards"] if d["id"] == "dashboard2")
        self.assertNotIn("current", svg_dashboard["svg"])
        self.assertEqual(svg_dashboard["svg"]["params"], [{"id": "p1"}])
        self.assertEqual(index["widgets"], [{"id": "widget1", "name": "W1", "cells": []}])
        self.assertEqual(index["defaultDashboardId"], "dashboard1")
        self.assertTrue(index["isShowWidgetsPage"])

    def test_index_does_not_mutate_disk(self):
        """Reading the index must not strip svg.current from the on-disk config."""
        self.write_config(make_config())
        self.store.get_index()
        self.assertEqual(self.read_config()["dashboards"][1]["svg"]["current"], SVG_MARKUP)


class GetSvgTest(DashboardsStoreFixture):
    def test_returns_markup_for_svg_dashboard(self):
        self.write_config(make_config())
        self.assertEqual(self.store.get_svg("dashboard2"), SVG_MARKUP)

    def test_returns_none_for_non_svg_dashboard(self):
        self.write_config(make_config())
        self.assertIsNone(self.store.get_svg("dashboard1"))

    def test_returns_none_for_missing_dashboard(self):
        self.write_config(make_config())
        self.assertIsNone(self.store.get_svg("nope"))

    def test_returns_none_when_svg_has_no_current(self):
        """An SVG dashboard whose svg object lacks current yields None (404 upstream)."""
        config = make_config()
        del config["dashboards"][1]["svg"]["current"]
        self.write_config(config)
        self.assertIsNone(self.store.get_svg("dashboard2"))


class ReplaceCollectionTest(DashboardsStoreFixture):
    def test_writes_text_dashboards_settings_and_order(self):
        """A PUT writes text dashboards + settings and honors the body order of dashboards."""
        self.write_config(make_config())

        new_config = make_config()
        # Reorder: SVG dashboard first, then a renamed text dashboard.
        new_config["dashboards"] = [
            make_svg_dashboard("dashboard2", "<svg>IGNORED</svg>"),
            make_text_dashboard("dashboard1", "Renamed Text"),
        ]
        new_config["defaultDashboardId"] = "dashboard2"
        new_config["isShowWidgetsPage"] = False
        new_config["description"] = "hello"
        new_config["widgets"] = [{"id": "widget1", "name": "W1 v2", "cells": []}]

        self.store.replace_collection(new_config)

        on_disk = self.read_config()
        self.assertEqual([d["id"] for d in on_disk["dashboards"]], ["dashboard2", "dashboard1"])
        text = next(d for d in on_disk["dashboards"] if d["id"] == "dashboard1")
        self.assertEqual(text["name"], "Renamed Text")
        self.assertEqual(on_disk["defaultDashboardId"], "dashboard2")
        self.assertFalse(on_disk["isShowWidgetsPage"])
        self.assertEqual(on_disk["description"], "hello")
        self.assertEqual(on_disk["widgets"], [{"id": "widget1", "name": "W1 v2", "cells": []}])

    def test_ignores_svg_dashboard_body_content_taking_from_disk(self):
        """An SVG dashboard's content (incl. svg.current/params/name) is taken from disk, body ignored."""
        self.write_config(make_config())

        new_config = make_config()
        svg_entry = new_config["dashboards"][1]
        svg_entry["name"] = "Body name"
        svg_entry["svg"]["current"] = "<svg>EVIL</svg>"
        svg_entry["svg"]["params"] = [{"id": "evil"}]

        self.store.replace_collection(new_config)

        on_disk = next(d for d in self.read_config()["dashboards"] if d["id"] == "dashboard2")
        self.assertEqual(on_disk["name"], "SVG")
        self.assertEqual(on_disk["svg"]["current"], SVG_MARKUP)
        self.assertEqual(on_disk["svg"]["params"], [{"id": "p1"}])

    def test_strips_stray_svg_current_from_text_dashboard(self):
        """A text dashboard carrying a stray svg.current in the body has it stripped on write."""
        self.write_config(make_config())

        new_config = make_config()
        new_config["dashboards"][0]["svg"] = {"current": "<svg>stray</svg>"}

        self.store.replace_collection(new_config)

        text = next(d for d in self.read_config()["dashboards"] if d["id"] == "dashboard1")
        self.assertNotIn("current", text.get("svg", {}))

    def test_does_not_change_svg_dashboard_existence(self):
        """An SVG dashboard present on disk stays present and unchanged regardless of the body."""
        self.write_config(make_config())

        new_config = make_config()
        # Body still lists the SVG dashboard but with garbage content.
        new_config["dashboards"][1] = {"id": "dashboard2", "isSvg": True}

        self.store.replace_collection(new_config)

        on_disk = next(d for d in self.read_config()["dashboards"] if d["id"] == "dashboard2")
        self.assertEqual(on_disk["svg"]["current"], SVG_MARKUP)

    def test_deletes_nothing_when_body_omits_a_dashboard(self):
        """A dashboard present on disk but absent from the body is preserved, not deleted."""
        self.write_config(make_config())

        new_config = make_config()
        # Body carries only the text dashboard (e.g. a race dropped the SVG one).
        new_config["dashboards"] = [make_text_dashboard("dashboard1")]

        self.store.replace_collection(new_config)

        on_disk = {d["id"]: d for d in self.read_config()["dashboards"]}
        self.assertIn("dashboard2", on_disk)
        self.assertEqual(on_disk["dashboard2"]["svg"]["current"], SVG_MARKUP)

    def test_preserved_omitted_dashboards_are_appended(self):
        """Omitted on-disk dashboards are appended after the body-ordered ones."""
        config = make_config()
        config["dashboards"].append(make_svg_dashboard("dashboard3", OTHER_SVG_MARKUP, "Other SVG"))
        self.write_config(config)

        new_config = make_config()
        new_config["dashboards"] = [make_text_dashboard("dashboard1")]

        self.store.replace_collection(new_config)

        ids = [d["id"] for d in self.read_config()["dashboards"]]
        self.assertEqual(ids[0], "dashboard1")
        self.assertEqual(set(ids), {"dashboard1", "dashboard2", "dashboard3"})

    def test_duplicate_id_in_body_keeps_first_occurrence_only(self):
        """A body listing the same id twice stores exactly one record (first occurrence wins)."""
        self.write_config(make_config())

        new_config = make_config()
        new_config["dashboards"] = [
            make_text_dashboard("dup", "First"),
            make_text_dashboard("dup", "Second"),
        ]

        self.store.replace_collection(new_config)

        dashboards = [d for d in self.read_config()["dashboards"] if d["id"] == "dup"]
        self.assertEqual(len(dashboards), 1)
        self.assertEqual(dashboards[0]["name"], "First")

    def test_does_not_lose_unopened_svg(self):
        """A second, never-opened SVG dashboard keeps its markup across a PUT."""
        config = make_config()
        config["dashboards"].append(make_svg_dashboard("dashboard3", OTHER_SVG_MARKUP, "Other SVG"))
        self.write_config(config)

        # Body lists all three but with no svg.current (client hasn't loaded any SVG).
        new_config = make_config()
        new_config["dashboards"][1] = {"id": "dashboard2", "isSvg": True, "svg": {"params": []}}
        new_config["dashboards"].append({"id": "dashboard3", "isSvg": True, "svg": {"params": []}})

        self.store.replace_collection(new_config)

        on_disk = {d["id"]: d for d in self.read_config()["dashboards"]}
        self.assertEqual(on_disk["dashboard2"]["svg"]["current"], SVG_MARKUP)
        self.assertEqual(on_disk["dashboard3"]["svg"]["current"], OTHER_SVG_MARKUP)


class PutDashboardTest(DashboardsStoreFixture):
    def test_create_on_new_id_returns_created(self):
        """PUT on an id with no record creates it verbatim (incl. svg.current) -> CREATED."""
        self.write_config(make_config())

        new = make_svg_dashboard("dashboard3", "<svg>NEW</svg>", "New SVG")
        outcome = self.store.put_dashboard("dashboard3", new)

        self.assertEqual(outcome, DashboardWriteOutcome.CREATED)
        on_disk = {d["id"]: d for d in self.read_config()["dashboards"]}
        self.assertEqual(on_disk["dashboard3"]["svg"]["current"], "<svg>NEW</svg>")

    def test_replace_existing_returns_replaced_in_place(self):
        """PUT over an existing id replaces it in place (same index) -> REPLACED."""
        self.write_config(make_config())

        replacement = make_svg_dashboard("dashboard2", "<svg>NEW</svg>", "SVG v2")
        outcome = self.store.put_dashboard("dashboard2", replacement)

        self.assertEqual(outcome, DashboardWriteOutcome.REPLACED)
        on_disk = self.read_config()["dashboards"]
        self.assertEqual([d["id"] for d in on_disk], ["dashboard1", "dashboard2"])
        self.assertEqual(on_disk[1]["name"], "SVG v2")
        self.assertEqual(on_disk[1]["svg"]["current"], "<svg>NEW</svg>")

    def test_rename_moves_record_and_drops_old_id_keeping_position(self):
        """A rename (url id != body id) keeps the record's position, drops the old id, others intact."""
        self.write_config(make_config())

        renamed = make_svg_dashboard("renamed", "<svg>NEW</svg>", "Renamed")
        outcome = self.store.put_dashboard("dashboard2", renamed)

        self.assertEqual(outcome, DashboardWriteOutcome.REPLACED)
        on_disk = self.read_config()["dashboards"]
        self.assertEqual([d["id"] for d in on_disk], ["dashboard1", "renamed"])
        self.assertEqual(on_disk[1]["svg"]["current"], "<svg>NEW</svg>")
        # The untouched text dashboard is unchanged.
        self.assertEqual(on_disk[0]["name"], "Text")

    def test_rename_onto_taken_id_returns_conflict_unchanged(self):
        """Renaming onto an id held by another dashboard -> CONFLICT, config unchanged."""
        self.write_config(make_config())
        before = self.read_config()

        renamed = make_svg_dashboard("dashboard1", "<svg>NEW</svg>")
        outcome = self.store.put_dashboard("dashboard2", renamed)

        self.assertEqual(outcome, DashboardWriteOutcome.CONFLICT)
        self.assertEqual(self.read_config(), before)

    def test_create_onto_taken_id_returns_conflict_unchanged(self):
        """Creating at a fresh url but with a body id already taken -> CONFLICT, config unchanged."""
        self.write_config(make_config())
        before = self.read_config()

        new = make_svg_dashboard("dashboard1", "<svg>NEW</svg>")
        outcome = self.store.put_dashboard("dashboard3", new)

        self.assertEqual(outcome, DashboardWriteOutcome.CONFLICT)
        self.assertEqual(self.read_config(), before)

    def test_body_without_id_falls_back_to_url_id(self):
        """A body without an id is written under the url id."""
        self.write_config(make_config())

        replacement = {"isSvg": True, "name": "No id body", "svg": {"current": "<svg>NEW</svg>"}}
        outcome = self.store.put_dashboard("dashboard2", replacement)

        self.assertEqual(outcome, DashboardWriteOutcome.REPLACED)
        on_disk = {d["id"]: d for d in self.read_config()["dashboards"]}
        self.assertEqual(on_disk["dashboard2"]["name"], "No id body")
        self.assertEqual(on_disk["dashboard2"]["svg"]["current"], "<svg>NEW</svg>")

    def test_shared_widgets_array_untouched(self):
        """A single-dashboard PUT leaves the shared widgets array alone."""
        self.write_config(make_config())

        self.store.put_dashboard("dashboard2", make_svg_dashboard("dashboard2", "<svg>NEW</svg>"))

        self.assertEqual(self.read_config()["widgets"], [{"id": "widget1", "name": "W1", "cells": []}])

    def test_idempotent_replace(self):
        """Repeating an identical PUT leaves the same on-disk content."""
        self.write_config(make_config())
        replacement = make_svg_dashboard("dashboard2", "<svg>NEW</svg>", "SVG v2")

        self.store.put_dashboard("dashboard2", replacement)
        first = self.read_config()
        self.store.put_dashboard("dashboard2", replacement)
        second = self.read_config()

        self.assertEqual(first, second)


class PatchDashboardTest(DashboardsStoreFixture):
    def test_updates_only_given_fields_keeping_svg_current(self):
        """PATCH changes visibility/swipe/svg_fullwidth and leaves svg.current intact."""
        self.write_config(make_config())

        outcome = self.store.patch_dashboard(
            "dashboard2",
            {"options": {"isHidden": True}, "swipe": False, "svg_fullwidth": False},
        )

        self.assertEqual(outcome, DashboardWriteOutcome.UPDATED)
        on_disk = next(d for d in self.read_config()["dashboards"] if d["id"] == "dashboard2")
        self.assertTrue(on_disk["options"]["isHidden"])
        self.assertFalse(on_disk["swipe"])
        self.assertFalse(on_disk["svg_fullwidth"])
        # Markup untouched.
        self.assertEqual(on_disk["svg"]["current"], SVG_MARKUP)

    def test_merges_options_without_dropping_siblings(self):
        """PATCH merges options so a sibling option key survives an isHidden update."""
        config = make_config()
        config["dashboards"][1]["options"] = {"isHidden": False, "color": "red"}
        self.write_config(config)

        self.store.patch_dashboard("dashboard2", {"options": {"isHidden": True}})

        on_disk = next(d for d in self.read_config()["dashboards"] if d["id"] == "dashboard2")
        self.assertEqual(on_disk["options"], {"isHidden": True, "color": "red"})

    def test_ignores_svg_in_patch(self):
        """An svg key in a PATCH body is ignored — the on-disk markup is never rewritten."""
        self.write_config(make_config())

        self.store.patch_dashboard("dashboard2", {"svg": {"current": "<svg>EVIL</svg>"}})

        on_disk = next(d for d in self.read_config()["dashboards"] if d["id"] == "dashboard2")
        self.assertEqual(on_disk["svg"]["current"], SVG_MARKUP)

    def test_rename_via_id(self):
        """PATCH with a new id renames the record (others untouched), keeping svg.current."""
        self.write_config(make_config())

        outcome = self.store.patch_dashboard("dashboard2", {"id": "renamed"})

        self.assertEqual(outcome, DashboardWriteOutcome.UPDATED)
        on_disk = {d["id"]: d for d in self.read_config()["dashboards"]}
        self.assertIn("renamed", on_disk)
        self.assertNotIn("dashboard2", on_disk)
        self.assertEqual(on_disk["renamed"]["svg"]["current"], SVG_MARKUP)

    def test_rename_onto_taken_id_returns_conflict_unchanged(self):
        """A PATCH rename onto another dashboard's id -> CONFLICT, config unchanged."""
        self.write_config(make_config())
        before = self.read_config()

        outcome = self.store.patch_dashboard("dashboard2", {"id": "dashboard1"})

        self.assertEqual(outcome, DashboardWriteOutcome.CONFLICT)
        self.assertEqual(self.read_config(), before)

    def test_missing_dashboard_returns_not_found(self):
        """PATCH on an absent id -> NOT_FOUND, config unchanged."""
        self.write_config(make_config())
        before = self.read_config()

        outcome = self.store.patch_dashboard("nope", {"swipe": True})

        self.assertEqual(outcome, DashboardWriteOutcome.NOT_FOUND)
        self.assertEqual(self.read_config(), before)


class DeleteDashboardTest(DashboardsStoreFixture):
    def test_removes_dashboard_with_inline_svg_keeping_others(self):
        """DELETE removes the dashboard (and its inline svg); other dashboards survive."""
        self.write_config(make_config())

        self.store.delete_dashboard("dashboard2")

        on_disk = self.read_config()
        self.assertEqual([d["id"] for d in on_disk["dashboards"]], ["dashboard1"])

    def test_leaves_shared_widgets_alone(self):
        """DELETE does not prune the shared widgets array."""
        self.write_config(make_config())

        self.store.delete_dashboard("dashboard1")

        self.assertEqual(self.read_config()["widgets"], [{"id": "widget1", "name": "W1", "cells": []}])

    def test_repeat_delete_is_harmless(self):
        """A repeated DELETE of an already-absent id is a no-op, not an error."""
        self.write_config(make_config())

        self.store.delete_dashboard("dashboard2")
        # The second call must not raise nor corrupt the config.
        self.store.delete_dashboard("dashboard2")

        self.assertEqual([d["id"] for d in self.read_config()["dashboards"]], ["dashboard1"])


class AtomicWriteTest(DashboardsStoreFixture):
    def test_no_temp_file_left_after_write(self):
        """A successful write leaves no temp file in the config directory."""
        self.write_config(make_config())
        self.store.put_dashboard("dashboard2", make_svg_dashboard("dashboard2", "<svg>NEW</svg>"))
        leftovers = [n for n in os.listdir(self.tmp_dir) if n.startswith(".wb-homeui-")]
        self.assertEqual(leftovers, [])

    def test_failed_replace_keeps_original_and_leaves_no_temp(self):
        """If os.replace raises, the live config is untouched and no temp file remains."""
        self.write_config(make_config())

        with patch("wb.homeui_backend.dashboards.os.replace", side_effect=OSError("boom")):
            with self.assertRaises(OSError):
                self.store.put_dashboard("dashboard2", make_svg_dashboard("dashboard2", "<svg>NEW</svg>"))

        # Original content intact.
        self.assertEqual(self.read_config()["dashboards"][1]["svg"]["current"], SVG_MARKUP)
        # No temp file left behind.
        leftovers = [n for n in os.listdir(self.tmp_dir) if n.startswith(".wb-homeui-")]
        self.assertEqual(leftovers, [])


class SeedingTest(DashboardsStoreFixture):
    def test_seeds_from_board_config_when_absent(self):
        """With no config present, seeding creates it from config.<board>.json and a baseline."""
        board_config = make_config()
        self.write_board_config("wb6", board_config)
        self.assertFalse(os.path.exists(self.config_path))

        self.store.seed_and_reconcile("wb6")

        self.assertTrue(os.path.exists(self.config_path))
        self.assertEqual(self.read_config(), board_config)
        state = self.read_state()
        self.assertEqual(set(state["hashes"].keys()), {"dashboard1", "dashboard2"})

    def test_seeding_is_idempotent(self):
        """An existing config is not overwritten by seeding (reconcile path runs instead).

        Also guards the migration path against duplicating ids: with no baseline yet and the
        defaults already present in live, reconcile must leave exactly one dashboard per id.
        """
        existing = make_config()
        existing["dashboards"][0]["name"] = "User edited"
        self.write_config(existing)
        # Board config differs, but no baseline => reconcile must not touch existing ids.
        self.write_board_config("wb6", make_config())

        self.store.seed_and_reconcile("wb6")

        dashboards = self.read_config()["dashboards"]
        self.assertEqual(dashboards[0]["name"], "User edited")
        # Exactly one dashboard per id (no duplicate copies appended on the no-baseline path).
        ids = [d["id"] for d in dashboards]
        self.assertEqual(len(dashboards), 2)
        self.assertEqual(sorted(ids), ["dashboard1", "dashboard2"])

    def test_missing_board_config_raises(self):
        """No board config file => seeding fails hard (no silent skip); config stays absent.

        Raises the dedicated SeedConfigError so the service can tell this unrecoverable case
        (exit 3, no restart) apart from a transient write failure (exit 1, systemd retries).
        """
        with self.assertRaises(SeedConfigError):
            self.store.seed_and_reconcile("wb6")
        self.assertFalse(os.path.exists(self.config_path))


class ReconciliationTest(DashboardsStoreFixture):
    def _seed_baseline(self, board_config: dict) -> None:
        """Seed config + baseline from a board config (simulates first install)."""
        self.write_board_config("wb6", board_config)
        self.store.seed_and_reconcile("wb6")

    def test_adds_default_not_in_baseline(self):
        """A new default (id never installed here) is added with its widgets, baseline recorded."""
        self._seed_baseline(make_config())

        upgraded = make_config()
        upgraded["dashboards"].append(
            {"id": "dashboard9", "isSvg": False, "name": "New", "widgets": ["widget9"]}
        )
        upgraded["widgets"].append({"id": "widget9", "name": "W9", "cells": []})
        self.write_board_config("wb6", upgraded)

        self.store.seed_and_reconcile("wb6")

        on_disk = self.read_config()
        ids = [d["id"] for d in on_disk["dashboards"]]
        self.assertIn("dashboard9", ids)
        widget_ids = [w["id"] for w in on_disk["widgets"]]
        self.assertIn("widget9", widget_ids)
        self.assertIn("dashboard9", self.read_state()["hashes"])

    def test_updates_unmodified_default(self):
        """An unmodified default (live hash == baseline) is updated to the new default."""
        self._seed_baseline(make_config())

        upgraded = make_config()
        upgraded["dashboards"][0]["name"] = "New default name"
        self.write_board_config("wb6", upgraded)

        self.store.seed_and_reconcile("wb6")

        on_disk = {d["id"]: d for d in self.read_config()["dashboards"]}
        self.assertEqual(on_disk["dashboard1"]["name"], "New default name")
        # Baseline advanced to the new content.
        self.assertEqual(
            self.read_state()["hashes"]["dashboard1"],
            dashboard_content_hash(upgraded["dashboards"][0]),
        )

    def test_leaves_user_modified_default(self):
        """A user-modified default (live hash != baseline) is left untouched."""
        self._seed_baseline(make_config())

        # User edits dashboard1 in the live config.
        live = self.read_config()
        live["dashboards"][0]["name"] = "User edited"
        self.write_config(live)

        upgraded = make_config()
        upgraded["dashboards"][0]["name"] = "New default name"
        self.write_board_config("wb6", upgraded)

        self.store.seed_and_reconcile("wb6")

        on_disk = {d["id"]: d for d in self.read_config()["dashboards"]}
        self.assertEqual(on_disk["dashboard1"]["name"], "User edited")

    def test_does_not_readd_user_deleted_default(self):
        """A default the user deleted (id in baseline, absent from config) is not re-added."""
        self._seed_baseline(make_config())

        # User deletes dashboard1.
        live = self.read_config()
        live["dashboards"] = [d for d in live["dashboards"] if d["id"] != "dashboard1"]
        self.write_config(live)

        # New release ships an updated dashboard1.
        upgraded = make_config()
        upgraded["dashboards"][0]["name"] = "New default name"
        self.write_board_config("wb6", upgraded)

        self.store.seed_and_reconcile("wb6")

        ids = [d["id"] for d in self.read_config()["dashboards"]]
        self.assertNotIn("dashboard1", ids)
        # Baseline preserved so it never resurrects on later upgrades.
        self.assertIn("dashboard1", self.read_state()["hashes"])

    def test_corrupt_live_config_is_left_untouched(self):
        """An unreadable (invalid JSON) live config makes reconcile a no-op, not a crash."""
        self._seed_baseline(make_config())

        corrupt = "{not valid json"
        with open(self.config_path, "w", encoding="utf-8") as f:
            f.write(corrupt)

        # New release ships an updated dashboard1; reconcile must bail out gracefully.
        upgraded = make_config()
        upgraded["dashboards"][0]["name"] = "New default name"
        self.write_board_config("wb6", upgraded)

        self.store.seed_and_reconcile("wb6")

        with open(self.config_path, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), corrupt)


class MigrationReconcileTest(DashboardsStoreFixture):
    """No-baseline-yet path: a controller upgrading from a pre-baseline version.

    The live /etc/wb-webui.conf already exists but no baseline-state file does, so
    state.hashes is empty. Reconcile must adopt the default hash as the baseline without
    duplicating or clobbering already-present dashboards.
    """

    def test_present_default_is_not_duplicated_and_unchanged(self):
        """A default already present in live is neither duplicated nor rewritten; baseline records it."""
        self.write_config(make_config())
        self.write_board_config("wb6", make_config())
        self.assertFalse(os.path.exists(self.state_path))

        self.store.seed_and_reconcile("wb6")

        dashboards = self.read_config()["dashboards"]
        ids = [d["id"] for d in dashboards]
        self.assertEqual(len(dashboards), 2)
        self.assertEqual(sorted(ids), ["dashboard1", "dashboard2"])
        self.assertEqual(self.read_config(), make_config())
        self.assertEqual(set(self.read_state()["hashes"].keys()), {"dashboard1", "dashboard2"})

    def test_user_modified_present_default_survives_two_runs(self):
        """A user edit predating the baseline is preserved across two consecutive reconciles.

        Proves adopting baseline = default_hash on the no-baseline path never clobbers a
        pre-existing edit: on the second run the live hash != default_hash, so the user-modified
        branch keeps it untouched.
        """
        live = make_config()
        live["dashboards"][0]["name"] = "User edited before baseline"
        self.write_config(live)
        # The board ships a different default for the same id.
        upgraded = make_config()
        upgraded["dashboards"][0]["name"] = "New default name"
        self.write_board_config("wb6", upgraded)

        self.store.seed_and_reconcile("wb6")
        self.assertEqual(self.read_config()["dashboards"][0]["name"], "User edited before baseline")

        self.store.seed_and_reconcile("wb6")
        self.assertEqual(self.read_config()["dashboards"][0]["name"], "User edited before baseline")

    def test_genuinely_new_default_absent_from_live_is_added(self):
        """On the no-baseline path, a default absent from live is added exactly once (with widgets)."""
        self.write_config(make_config())
        upgraded = make_config()
        upgraded["dashboards"].append(
            {"id": "dashboard9", "isSvg": False, "name": "New", "widgets": ["widget9"]}
        )
        upgraded["widgets"].append({"id": "widget9", "name": "W9", "cells": []})
        self.write_board_config("wb6", upgraded)

        self.store.seed_and_reconcile("wb6")

        ids = [d["id"] for d in self.read_config()["dashboards"]]
        self.assertEqual(ids, ["dashboard1", "dashboard2", "dashboard9"])
        widget_ids = [w["id"] for w in self.read_config()["widgets"]]
        self.assertIn("widget9", widget_ids)
        self.assertIn("dashboard9", self.read_state()["hashes"])


class FormatCompatibilityTest(DashboardsStoreFixture):
    def test_writes_keep_inline_svg_and_shape(self):
        """A single-dashboard PUT keeps svg.current inline and preserves the wb-webui.conf shape."""
        self.write_config(make_config())

        self.store.put_dashboard("dashboard2", make_svg_dashboard("dashboard2", OTHER_SVG_MARKUP))

        on_disk = self.read_config()
        self.assertEqual(set(on_disk.keys()), set(make_config().keys()))
        svg_dashboard = on_disk["dashboards"][1]
        self.assertIn("current", svg_dashboard["svg"])
        self.assertIn("params", svg_dashboard["svg"])

    def test_seeding_keeps_inline_svg(self):
        """Seeding writes the board config verbatim, svg.current still inline."""
        self.write_board_config("wb6", make_config())
        self.store.seed_and_reconcile("wb6")
        self.assertEqual(self.read_config()["dashboards"][1]["svg"]["current"], SVG_MARKUP)


class DetectBoardTest(unittest.TestCase):
    def _run_with_matches(self, matched_compatible):
        """Patch subprocess.run so of_machine_match returns 0 only for matched_compatible."""

        # check= is unused by the stub but must stay in the signature: of_machine_match calls
        # subprocess.run(..., check=False) by keyword, so the side_effect must accept it.
        def fake_run(args, check):  # pylint: disable=unused-argument
            command = args[2]
            result = MagicMock()
            result.returncode = 0 if f'"{matched_compatible}"' in command else 1
            return result

        with patch("wb.homeui_backend.board.subprocess.run", side_effect=fake_run):
            return detect_board()

    def test_detects_each_model(self):
        cases = {
            "wirenboard,wirenboard-85x": "wb85",
            "wirenboard,wirenboard-8xx": "wb8",
            "wirenboard,wirenboard-74x": "wb74",
            "wirenboard,wirenboard-720": "wb7",
            "contactless,imx6ul-wirenboard60": "wb6",
            "contactless,imx28-wirenboard50": "wb5",
        }
        for compatible, expected in cases.items():
            with self.subTest(compatible=compatible):
                self.assertEqual(self._run_with_matches(compatible), expected)

    def test_85x_checked_before_8xx(self):
        """When the board matches both 85x and 8xx, 85x wins (it is checked first)."""

        # check= is unused by the stub but must stay in the signature: of_machine_match calls
        # subprocess.run(..., check=False) by keyword, so the side_effect must accept it.
        def fake_run(args, check):  # pylint: disable=unused-argument
            command = args[2]
            matches_85x_or_8xx = (
                '"wirenboard,wirenboard-85x"' in command or '"wirenboard,wirenboard-8xx"' in command
            )
            result = MagicMock()
            result.returncode = 0 if matches_85x_or_8xx else 1
            return result

        with patch("wb.homeui_backend.board.subprocess.run", side_effect=fake_run):
            self.assertEqual(detect_board(), "wb85")

    def test_default_fallback_when_nothing_matches(self):
        result = MagicMock()
        result.returncode = 1
        with patch("wb.homeui_backend.board.subprocess.run", return_value=result):
            self.assertEqual(detect_board(), DEFAULT_BOARD_SUFFIX)

    def test_probe_error_is_skipped_and_later_match_wins(self):
        """If an earlier probe raises, detection continues and returns a later matching suffix."""

        def fake_match(compatible):
            if compatible == "wirenboard,wirenboard-85x":
                raise OSError("of_machine_match blew up")
            return compatible == "contactless,imx6ul-wirenboard60"

        with patch("wb.homeui_backend.dashboards.of_machine_match", side_effect=fake_match):
            self.assertEqual(detect_board(), "wb6")

    def test_default_fallback_when_every_probe_raises(self):
        """If every probe raises, detection falls back to the default suffix."""
        with patch(
            "wb.homeui_backend.dashboards.of_machine_match",
            side_effect=OSError("of_machine_match blew up"),
        ):
            self.assertEqual(detect_board(), DEFAULT_BOARD_SUFFIX)


class ConfigCacheTest(DashboardsStoreFixture):
    def test_out_of_band_change_is_picked_up(self):
        """A direct rewrite of the config is served fresh, not from a stale parse cache."""
        self.write_config(make_config())
        self.assertEqual(self.store.get_index()["dashboards"][0]["name"], "Text")

        changed = make_config()
        changed["dashboards"][0]["name"] = "Changed externally"
        self.write_config(changed)

        self.assertEqual(self.store.get_index()["dashboards"][0]["name"], "Changed externally")

    def test_returned_config_is_isolated_from_cache(self):
        """Mutating a returned config must not corrupt a later read (reads return copies)."""
        self.write_config(make_config())
        first = self.store.get_index()
        first["dashboards"].clear()

        self.assertEqual(len(self.store.get_index()["dashboards"]), 2)

    def test_get_svg_reflects_store_write(self):
        """After put_dashboard the cache is invalidated, so a store read returns the new markup."""
        self.write_config(make_config())
        self.assertEqual(self.store.get_svg("dashboard2"), SVG_MARKUP)

        self.store.put_dashboard("dashboard2", make_svg_dashboard("dashboard2", OTHER_SVG_MARKUP))

        self.assertEqual(self.store.get_svg("dashboard2"), OTHER_SVG_MARKUP)

    def test_get_config_mtime_none_when_absent(self):
        """get_config_mtime returns None when the config file does not exist."""
        self.assertIsNone(self.store.get_config_mtime())

    def test_get_config_mtime_matches_stat_after_write(self):
        """get_config_mtime returns the file's mtime in epoch seconds once it exists."""
        self.write_config(make_config())
        self.assertEqual(self.store.get_config_mtime(), os.stat(self.config_path).st_mtime)


class AtomicWriteSymlinkTest(DashboardsStoreFixture):
    def test_write_follows_symlinked_config(self):
        """WB symlinks /etc/wb-webui.conf -> /mnt/data/...; a write must update the real file
        and keep the symlink, not replace the link with a regular file (off the data part)."""
        real_dir = os.path.join(self.tmp_dir, "data")
        os.makedirs(real_dir, exist_ok=True)
        real_path = os.path.join(real_dir, "wb-webui.conf")
        with open(real_path, "w", encoding="utf-8") as f:
            json.dump(make_config(), f)
        link_path = os.path.join(self.tmp_dir, "linked.conf")
        os.symlink(real_path, link_path)
        store = DashboardsStore(
            config_path=link_path,
            board_config_dir=self.board_dir,
            baseline_state_path=self.state_path,
        )

        store.put_dashboard("dashboard2", make_svg_dashboard("dashboard2", OTHER_SVG_MARKUP))

        self.assertTrue(os.path.islink(link_path))
        with open(real_path, "r", encoding="utf-8") as f:
            on_disk = json.load(f)
        svg_dashboard = next(d for d in on_disk["dashboards"] if d["id"] == "dashboard2")
        self.assertEqual(svg_dashboard["svg"]["current"], OTHER_SVG_MARKUP)
