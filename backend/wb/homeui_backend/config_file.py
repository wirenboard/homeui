#!/usr/bin/env python3

import json
import logging
import os

from .users_storage import UsersStorage

CONFIG_FILE = "/etc/wb-homeui-backend.conf"
ENABLE_HTTPS_TAG = "enable_https"


class Config:

    def __init__(self, users_storage: UsersStorage):
        self.enable_https = False
        if os.path.exists(CONFIG_FILE):
            self._read_config(users_storage)
        else:
            self._create_config(users_storage)

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
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                config_content = json.load(f)
                enable_https = config_content[ENABLE_HTTPS_TAG]
                if isinstance(enable_https, bool):
                    self.enable_https = enable_https
                    return
                raise TypeError(f"Invalid {ENABLE_HTTPS_TAG} field type")
        except Exception as e:
            # Config file doesn't exist or is broken,
            # disable certificate update only if no users are configured
            if users_storage.has_users():
                logging.error(
                    "Enabling HTTPS since config file is missing or broken and there are configured users: %s",
                    str(e),
                )
                self.enable_https = True
                return
            logging.error(
                "Disabling HTTPS since config file is missing or broken and there are no configured users: %s",
                str(e),
            )

    def is_https_enabled(self) -> bool:
        return self.enable_https

    def set_https_enabled(self, enabled: bool) -> None:
        self.enable_https = enabled
        config_content = {ENABLE_HTTPS_TAG: self.enable_https}
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config_content, f)
            json.dump(config_content, f)
