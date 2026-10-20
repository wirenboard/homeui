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

    def test_webauthn_domains_default_empty(self):
        """A freshly created config has no WebAuthn domains: the feature starts unconfigured,
        there is no installed base to migrate."""
        self.users_storage.has_users.return_value = False

        config = Config(self.users_storage)

        self.assertEqual(config.get_webauthn_domains(), [])
        self.assertIsNone(config.get_canonical_webauthn_domain())
        self.assertEqual(config.get_related_webauthn_domains(), [])


class ConfigWebAuthnDomainsTest(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp_dir, ignore_errors=True)
        self.config_path = os.path.join(self.tmp_dir, "wb-homeui-backend.conf")
        patcher = patch("wb.homeui_backend.config_file.CONFIG_FILE", self.config_path)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.users_storage = MagicMock(spec=UsersStorage)
        self.users_storage.has_users.return_value = False

    def read_config(self) -> dict:
        with open(self.config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def test_persists_and_reloads_domain_list_in_order(self):
        """Setting a domain list persists it to disk in order, and a freshly constructed
        Config reads the same order back — position is the only notion of "canonical"."""
        config = Config(self.users_storage)
        domains = ["wb.example.com", "other.example.net"]

        config.set_webauthn_domains(domains)

        self.assertEqual(self.read_config()["webauthn_domains"], domains)
        reloaded = Config(self.users_storage)
        self.assertEqual(reloaded.get_webauthn_domains(), domains)
        self.assertEqual(reloaded.get_canonical_webauthn_domain(), "wb.example.com")
        self.assertEqual(reloaded.get_related_webauthn_domains(), ["other.example.net"])

    def test_broken_domain_list_disables_webauthn_without_touching_https(self):
        """A broken webauthn_domains field falls back to an empty list rather than crashing
        the whole config load, and doesn't affect the (independently read) HTTPS flag."""
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump({"enable_https": True, "webauthn_domains": "not-a-list"}, f)

        config = Config(self.users_storage)

        self.assertTrue(config.is_https_enabled())
        self.assertEqual(config.get_webauthn_domains(), [])

    def test_malformed_domain_entry_disables_webauthn_without_touching_https(self):
        """The list itself can be well-formed while one entry's type is wrong (e.g. a
        hand-edited config file) — that must fall back the same way a broken list does, not
        raise out of Config's constructor."""
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(
                {"enable_https": True, "webauthn_domains": [123]},
                f,
            )

        config = Config(self.users_storage)

        self.assertTrue(config.is_https_enabled())
        self.assertEqual(config.get_webauthn_domains(), [])

    def test_set_https_enabled_preserves_webauthn_domains(self):
        """Persisting is a single atomic write of the whole state: toggling HTTPS must not
        clobber a previously saved WebAuthn domain list."""
        config = Config(self.users_storage)
        domains = ["wb.example.com"]
        config.set_webauthn_domains(domains)

        config.set_https_enabled(True)

        self.assertEqual(self.read_config()["webauthn_domains"], domains)
        reloaded = Config(self.users_storage)
        self.assertEqual(reloaded.get_webauthn_domains(), domains)


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
