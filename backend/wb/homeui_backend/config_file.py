#!/usr/bin/env python3

import json
import logging

from .users_storage import UsersStorage

CONFIG_FILE = "/etc/wb-homeui-backend.conf"
ENABLE_HTTPS_TAG = "enable_https"
CHUNK_SIZE = 64 * 1024


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


class Config:

    def __init__(self, users_storage: UsersStorage):
        self.enable_https = False
        if is_blank_file(CONFIG_FILE):
            self._create_config(users_storage)
        else:
            self._read_config(users_storage)

    def _create_config(self, users_storage: UsersStorage) -> None:
        logging.info("Creating config file")
        # If there are users configured and config is missing,
        # it is a transition from previous package versions.
        # Enable HTTPS, as it was always enabled in previous versions
        self.enable_https = users_storage.has_users()
        config_content = {ENABLE_HTTPS_TAG: self.enable_https}
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config_content, f)

    def _read_config(self, users_storage: UsersStorage) -> None:
        try:
            self.enable_https = load_https_flag()
            return
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
                return
            logging.error(
                "Disabling HTTPS since config file is missing or "
                "broken and there are no configured users: %s",
                str(e),
            )

    def is_https_enabled(self) -> bool:
        return self.enable_https

    def set_https_enabled(self, enabled: bool) -> None:
        self.enable_https = enabled
        config_content = {ENABLE_HTTPS_TAG: self.enable_https}
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config_content, f, indent=4)
            f.write("\n")
