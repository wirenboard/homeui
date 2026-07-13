import datetime
import os
import shutil
import stat
import subprocess
import tempfile
import time
import unittest
from unittest.mock import MagicMock, patch

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from wb.homeui_backend.cert import (
    CertificateCheckingThread,
    CertificateState,
    is_certificate_usable,
    remove_nginx_https_config,
    save_certificate,
)

WAIT_DEADLINE_S = 10

# One shared key: RSA generation is slow and the tests only care about cert validity.
_TEST_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _wait_for(predicate) -> bool:
    deadline = time.monotonic() + WAIT_DEADLINE_S
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.05)
    return False


class CertFileTestBase(unittest.TestCase):
    """Shared fixture: tmp SSL_CERT_PATH plus a self-signed certificate writer."""

    def setUp(self):
        tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp_dir)
        self.cert_path = os.path.join(tmp_dir, "sslip.pem")
        patcher = patch("wb.homeui_backend.cert.SSL_CERT_PATH", self.cert_path)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _write_cert(self, days_left, days_ago=1):
        now = datetime.datetime.now()
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "test.invalid")])
        cert = (
            x509.CertificateBuilder()
            .subject_name(name)
            .issuer_name(name)
            .public_key(_TEST_KEY.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(days=days_ago))
            .not_valid_after(now + datetime.timedelta(days=days_left))
            .sign(_TEST_KEY, hashes.SHA256())
        )
        with open(self.cert_path, "wb") as cert_file:
            cert_file.write(cert.public_bytes(serialization.Encoding.PEM))


class IsCertificateUsableTest(CertFileTestBase):
    def test_missing_file_is_not_usable(self):
        self.assertFalse(is_certificate_usable())

    def test_garbage_file_is_not_usable(self):
        with open(self.cert_path, "w", encoding="utf-8") as f:
            f.write("not a certificate")
        self.assertFalse(is_certificate_usable())

    def test_validity_window(self):
        """Any loadable certificate is usable — even expired (browser warns, channel
        stays encrypted); HTTP degradation is only for a missing/unreadable file."""
        for days_left in (-1, 30, 5):
            with self.subTest(days_left=days_left):
                self._write_cert(days_left, days_ago=10)
                self.assertTrue(is_certificate_usable())


class SaveCertificateTest(CertFileTestBase):
    def test_atomic_write_stores_content_mode_and_leaves_no_temp(self):
        """The cert lands with its content and 0644 mode, and no .tmp file is left behind."""
        save_certificate("cert-body")
        with open(self.cert_path, encoding="utf-8") as f:
            self.assertEqual(f.read(), "cert-body")
        self.assertEqual(stat.S_IMODE(os.stat(self.cert_path).st_mode), 0o644)
        self.assertEqual(os.listdir(os.path.dirname(self.cert_path)), ["sslip.pem"])


class RemoveNginxHttpsConfigTest(unittest.TestCase):
    def setUp(self):
        self.conf_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.conf_dir)
        self.https_conf = os.path.join(self.conf_dir, "https.conf")
        patcher = patch("wb.homeui_backend.cert.WB_DYNAMIC_NGINX_CONF_DIR", self.conf_dir)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_removes_config_and_reloads_nginx(self):
        """Default removal reloads nginx so the 443 listener drops immediately."""
        with open(self.https_conf, "w", encoding="utf-8") as f:
            f.write("server {}\n")
        with patch("wb.homeui_backend.cert.subprocess.run") as run_mock:
            remove_nginx_https_config()
        self.assertFalse(os.path.exists(self.https_conf))
        run_mock.assert_called_once_with(["systemctl", "reload", "nginx"], check=True)

    def test_reload_failure_does_not_raise_and_opt_out_skips_reload(self):
        """A failed reload is logged, not raised; reload_nginx=False skips it."""
        with open(self.https_conf, "w", encoding="utf-8") as f:
            f.write("server {}\n")
        with patch(
            "wb.homeui_backend.cert.subprocess.run",
            side_effect=subprocess.CalledProcessError(1, ["systemctl"]),
        ):
            remove_nginx_https_config()
        self.assertFalse(os.path.exists(self.https_conf))
        with open(self.https_conf, "w", encoding="utf-8") as f:
            f.write("server {}\n")
        with patch("wb.homeui_backend.cert.subprocess.run") as run_mock:
            remove_nginx_https_config(reload_nginx=False)
        self.assertFalse(os.path.exists(self.https_conf))
        run_mock.assert_not_called()

    def test_missing_config_is_noop(self):
        with patch("wb.homeui_backend.cert.subprocess.run") as run_mock:
            remove_nginx_https_config()
        run_mock.assert_not_called()


class CertificateCheckingThreadUsableTransitionsTest(CertFileTestBase):
    def setUp(self):
        super().setUp()
        self.callback = MagicMock()
        self.update_mock = None
        self.nginx_mock = None

    def _start_thread(self, update_cert=None):
        """Patch the cert renewal and nginx hooks, then start the checking thread."""
        update_patcher = patch("wb.homeui_backend.cert.update_cert", side_effect=update_cert)
        self.update_mock = update_patcher.start()
        self.addCleanup(update_patcher.stop)
        nginx_patcher = patch("wb.homeui_backend.cert.update_nginx_config")
        self.nginx_mock = nginx_patcher.start()
        self.addCleanup(nginx_patcher.stop)
        return CertificateCheckingThread(
            "TESTSN", allow_certificate_update=True, on_usable_change=self.callback
        )

    def test_becoming_usable_calls_callback_once(self):
        """No certificate at start; a successful update writes a valid one: the callback
        fires exactly once with True and a re-check of the same cert stays silent."""
        thread = self._start_thread(update_cert=lambda _sn: self._write_cert(days_left=30))
        self.assertTrue(_wait_for(lambda: self.callback.call_count == 1))
        self.callback.assert_called_once_with(True)
        thread.request_certificate()
        self.assertTrue(_wait_for(lambda: self.nginx_mock.call_count >= 2))
        self.assertEqual(self.callback.call_count, 1)
        self.assertTrue(thread.is_certificate_usable())

    def test_becoming_unusable_calls_callback_once(self):
        """A valid certificate disappears from disk and the update fails: usable goes
        True -> False and the callback fires exactly once with False (degradation)."""
        self._write_cert(days_left=30)
        thread = self._start_thread(update_cert=RuntimeError("offline"))
        self.assertTrue(thread.is_certificate_usable())
        self.assertTrue(_wait_for(lambda: self.nginx_mock.call_count >= 1))
        os.remove(self.cert_path)
        thread.request_certificate()
        self.assertTrue(_wait_for(lambda: self.callback.call_count == 1))
        self.callback.assert_called_once_with(False)
        thread.request_certificate()
        self.assertTrue(_wait_for(lambda: self.update_mock.call_count >= 2))
        self.assertEqual(self.callback.call_count, 1)
        self.assertFalse(thread.is_certificate_usable())

    def test_failed_callback_is_retried_on_next_cycle(self):
        """A raising callback must not kill the thread; the pending transition is
        retried on the next cycle and consumed once it succeeds."""
        self.callback.side_effect = [RuntimeError("nginx hiccup"), None]
        thread = self._start_thread(update_cert=lambda _sn: self._write_cert(days_left=30))
        self.assertTrue(_wait_for(lambda: self.callback.call_count == 1))
        thread.request_certificate()
        self.assertTrue(_wait_for(lambda: self.callback.call_count == 2))
        self.callback.assert_called_with(True)
        thread.request_certificate()
        self.assertTrue(_wait_for(lambda: self.nginx_mock.call_count >= 3))
        self.assertEqual(self.callback.call_count, 2)
        self.assertTrue(thread.is_certificate_usable())

    def test_transient_requesting_does_not_call_callback(self):
        """A manual re-check of a valid certificate passes through the transient
        REQUESTING state; usable never changes, so the callback must stay silent."""
        self._write_cert(days_left=30)
        thread = self._start_thread()
        self.assertTrue(_wait_for(lambda: self.nginx_mock.call_count >= 1))
        thread.request_certificate()
        self.assertTrue(_wait_for(lambda: self.nginx_mock.call_count >= 2))
        self.callback.assert_not_called()
        self.assertTrue(thread.is_certificate_usable())

    def test_failed_renewal_of_live_cert_does_not_call_callback(self):
        """A renewal-window certificate (alive but expiring soon) whose renewal fails
        stays usable and VALID: HTTPS must not be degraded, no callback."""
        self._write_cert(days_left=5)
        thread = self._start_thread(update_cert=RuntimeError("offline"))
        self.assertTrue(_wait_for(lambda: self.update_mock.call_count >= 1))
        thread.request_certificate()
        self.assertTrue(
            _wait_for(
                lambda: self.update_mock.call_count >= 2
                and thread.get_certificate_state() == CertificateState.VALID
            )
        )
        self.callback.assert_not_called()
        self.assertTrue(thread.is_certificate_usable())
