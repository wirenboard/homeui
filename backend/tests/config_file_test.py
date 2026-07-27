import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from wb.homeui_backend.config_file import Config
from wb.homeui_backend.users_storage import UsersStorage


class ConfigInitTest(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp_dir, ignore_errors=True)
        self.config_path = os.path.join(self.tmp_dir, "wb-homeui-backend.conf")
        patcher = patch("wb.homeui_backend.config_file.CONFIG_FILE", self.config_path)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.users_storage = MagicMock(spec=UsersStorage)

    def read_config(self) -> dict:
        with open(self.config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def test_recreates_config_when_empty(self):
        """An existing but empty config file is recreated as if it were missing."""
        with open(self.config_path, "w", encoding="utf-8"):
            pass
        self.users_storage.has_users.return_value = True

        config = Config(self.users_storage)

        self.assertTrue(config.is_https_enabled())
        self.assertEqual(self.read_config(), {"enable_https": True})
