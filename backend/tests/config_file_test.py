import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from wb.homeui_backend.config_file import CHUNK_SIZE, Config, is_blank_file
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

    def test_recreates_config_filled_with_nul_bytes(self):
        """A config of the right size but full of NUL bytes is recreated as if it were missing."""
        with open(self.config_path, "wb") as f:
            f.write(bytes(23))
        self.users_storage.has_users.return_value = True

        config = Config(self.users_storage)

        self.assertTrue(config.is_https_enabled())
        self.assertEqual(self.read_config(), {"enable_https": True})


class IsBlankFileTest(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp_dir, ignore_errors=True)

    def write(self, content: bytes) -> str:
        path = os.path.join(self.tmp_dir, "file")
        with open(path, "wb") as f:
            f.write(content)
        return path

    def test_missing_file_is_blank(self):
        self.assertTrue(is_blank_file(os.path.join(self.tmp_dir, "missing")))

    def test_empty_file_is_blank(self):
        self.assertTrue(is_blank_file(self.write(b"")))

    def test_all_nul_file_is_blank(self):
        """A right-sized file of NUL bytes (a power cut before the data was flushed) is blank."""
        self.assertTrue(is_blank_file(self.write(bytes(24576))))

    def test_content_after_nul_chunks_is_not_blank(self):
        """Content past the first read chunk still counts, so the whole file gets scanned."""
        self.assertFalse(is_blank_file(self.write(bytes(CHUNK_SIZE * 2) + b'{"enable_https": true}')))

    def test_config_content_is_not_blank(self):
        self.assertFalse(is_blank_file(self.write(b'{"enable_https": true}')))

    def test_nul_padded_content_is_not_blank(self):
        """A partially written file keeps whatever data it has; only the caller may drop it."""
        self.assertFalse(is_blank_file(self.write(b'{"enable_https": true}' + bytes(4096))))
