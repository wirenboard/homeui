#!/usr/bin/env python3

import json
import logging
import os
import tempfile
from typing import Any, Optional

from .users_storage import UsersStorage

CONFIG_FILE = "/etc/wb-homeui-backend.conf"
ENABLE_HTTPS_TAG = "enable_https"
WEBAUTHN_DOMAINS_TAG = "webauthn_domains"
CHUNK_SIZE = 64 * 1024


def atomic_write_json(path: str, data: Any) -> None:
    """Write JSON to path atomically (temp file in the same dir + os.replace).

    Resolves symlinks first: WB config files can point at /mnt/data, and os.replace onto a
    symlink would replace the link itself rather than its target.
    """
    real_path = os.path.realpath(path)
    directory = os.path.dirname(real_path) or "."
    os.makedirs(directory, exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=directory, prefix=".wb-homeui-", suffix=".tmp")
    try:
        # 0644 (mkstemp creates 0600) so other services can still read the config.
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


def is_blank_file(path: str) -> bool:
    try:
        with open(path, "rb") as f:
            while chunk := f.read(CHUNK_SIZE):
                if chunk.strip(b"\x00"):
                    return False
    except FileNotFoundError:
        return True
    return True


def load_https_flag() -> bool:
    """Read the HTTPS flag; only a real bool counts (no truthy coercion)."""
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        value = json.load(f)[ENABLE_HTTPS_TAG]
    if not isinstance(value, bool):
        raise TypeError(f"Invalid {ENABLE_HTTPS_TAG} field type")
    return value


def load_webauthn_domains() -> list[str]:
    """Read the WebAuthn domain list; missing field means "never configured" (empty list).

    Order matters: the first entry is the canonical relying-party domain (the one every
    passkey is actually bound to), every later one is a Related Origin Request domain. There
    is no separate "is canonical" flag — position in the list is the only source of truth.
    """
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f).get(WEBAUTHN_DOMAINS_TAG, [])
    if not isinstance(raw, list) or not all(isinstance(item, str) for item in raw):
        raise TypeError(f"Invalid {WEBAUTHN_DOMAINS_TAG} field type")
    return raw


class Config:

    def __init__(self, users_storage: UsersStorage):
        self.enable_https = False
        self.webauthn_domains: list[str] = []
        if is_blank_file(CONFIG_FILE):
            self._create_config(users_storage)
        else:
            self._read_config(users_storage)

    def is_https_enabled(self) -> bool:
        return self.enable_https

    def set_https_enabled(self, enabled: bool) -> None:
        self.enable_https = enabled
        self._persist()

    def get_webauthn_domains(self) -> list[str]:
        return self.webauthn_domains

    def get_canonical_webauthn_domain(self) -> Optional[str]:
        return self.webauthn_domains[0] if self.webauthn_domains else None

    def get_related_webauthn_domains(self) -> list[str]:
        return self.webauthn_domains[1:]

    def set_webauthn_domains(self, domains: list[str]) -> None:
        self.webauthn_domains = domains
        self._persist()

    # --- Private ---

    def _create_config(self, users_storage: UsersStorage) -> None:
        logging.info("Creating config file")
        # If there are users configured and config is missing,
        # it is a transition from previous package versions.
        # Enable HTTPS, as it was always enabled in previous versions.
        # WebAuthn is a new feature with no installed base to migrate, so it starts
        # unconfigured (empty domain list) regardless.
        self.enable_https = users_storage.has_users()
        atomic_write_json(CONFIG_FILE, {ENABLE_HTTPS_TAG: self.enable_https})

    def _read_config(self, users_storage: UsersStorage) -> None:
        self._read_https_flag(users_storage)
        self._read_webauthn_domains()

    def _read_https_flag(self, users_storage: UsersStorage) -> None:
        try:
            self.enable_https = load_https_flag()
        except Exception as e:  # pylint: disable=broad-exception-caught
            # Config file doesn't exist or is broken,
            # disable certificate update only if no users are configured
            if users_storage.has_users():
                logging.error(
                    "Enabling HTTPS since config file is missing or "
                    "broken and there are configured users: %s",
                    str(e),
                )
                self.enable_https = True
            else:
                logging.error(
                    "Disabling HTTPS since config file is missing or "
                    "broken and there are no configured users: %s",
                    str(e),
                )

    def _read_webauthn_domains(self) -> None:
        try:
            self.webauthn_domains = load_webauthn_domains()
        except Exception as e:  # pylint: disable=broad-exception-caught
            logging.error("Disabling WebAuthn since the domain list is missing or broken: %s", str(e))
            self.webauthn_domains = []

    def _persist(self) -> None:
        atomic_write_json(
            CONFIG_FILE,
            {
                ENABLE_HTTPS_TAG: self.enable_https,
                WEBAUTHN_DOMAINS_TAG: self.webauthn_domains,
            },
        )
