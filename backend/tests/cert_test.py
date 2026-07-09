import datetime
import os
import shutil
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
)

WAIT_DEADLINE_S = 10

# One shared key: RSA generation is slow and the tests only care about cert validity.
_TEST_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _write_self_signed_cert(cert_path, not_valid_before, not_valid_after):
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "test.invalid")])
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(_TEST_KEY.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(not_valid_before)
        .not_valid_after(not_valid_after)
        .sign(_TEST_KEY, hashes.SHA256())
    )
    with open(cert_path, "wb") as cert_file:
        cert_file.write(cert.public_bytes(serialization.Encoding.PEM))


def _wait_for(predicate) -> bool:
    deadline = time.monotonic() + WAIT_DEADLINE_S
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.05)
    return False


class IsCertificateUsableTest(unittest.TestCase):
    def setUp(self):
        tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp_dir)
        self.cert_path = os.path.join(tmp_dir, "sslip.pem")
        patcher = patch("wb.homeui_backend.cert.SSL_CERT_PATH", self.cert_path)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_missing_file_is_not_usable(self):
        self.assertFalse(is_certificate_usable())

    def test_garbage_file_is_not_usable(self):
        with open(self.cert_path, "w", encoding="utf-8") as f:
            f.write("not a certificate")
        self.assertFalse(is_certificate_usable())

    def test_expired_cert_is_not_usable(self):
        _write_self_signed_cert(self.cert_path, datetime.datetime(2000, 1, 1), datetime.datetime(2000, 1, 2))
        self.assertFalse(is_certificate_usable())

    def test_valid_cert_is_usable(self):
        now = datetime.datetime.now()
        _write_self_signed_cert(
            self.cert_path, now - datetime.timedelta(days=1), now + datetime.timedelta(days=30)
        )
        self.assertTrue(is_certificate_usable())

    def test_near_expiry_cert_is_still_usable(self):
        """Renewal-window certificates (less than MIN_DAYS_BEFORE_RENEW left) must stay
        usable: a failed renewal of a live certificate must not degrade HTTPS."""
        now = datetime.datetime.now()
        _write_self_signed_cert(
            self.cert_path, now - datetime.timedelta(days=1), now + datetime.timedelta(days=5)
        )
        self.assertTrue(is_certificate_usable())


class RemoveNginxHttpsConfigTest(unittest.TestCase):
    def setUp(self):
        self.conf_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.conf_dir)
        self.https_conf = os.path.join(self.conf_dir, "https.conf")
        patcher = patch("wb.homeui_backend.cert.WB_DYNAMIC_NGINX_CONF_DIR", self.conf_dir)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_removes_config_and_reloads_nginx(self):
        """Happy path: the existing https.conf is deleted and nginx reloaded once."""
        with open(self.https_conf, "w", encoding="utf-8") as f:
            f.write("server {}\n")
        with patch("wb.homeui_backend.cert.subprocess.run") as run_mock:
            remove_nginx_https_config()
        self.assertFalse(os.path.exists(self.https_conf))
        run_mock.assert_called_once_with(["systemctl", "reload", "nginx"], check=True)

    def test_missing_config_is_noop(self):
        with patch("wb.homeui_backend.cert.subprocess.run") as run_mock:
            remove_nginx_https_config()
        run_mock.assert_not_called()

    def test_reload_failure_does_not_raise(self):
        """While gates still reference the missing certificate the reload fails; the
        removal must survive so the follow-up gates re-render can fix nginx."""
        with open(self.https_conf, "w", encoding="utf-8") as f:
            f.write("server {}\n")
        with patch(
            "wb.homeui_backend.cert.subprocess.run",
            side_effect=subprocess.CalledProcessError(1, ["systemctl"]),
        ):
            remove_nginx_https_config()
        self.assertFalse(os.path.exists(self.https_conf))


class CertificateCheckingThreadUsableTransitionsTest(unittest.TestCase):
    def setUp(self):
        tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp_dir)
        self.cert_path = os.path.join(tmp_dir, "sslip.pem")
        patcher = patch("wb.homeui_backend.cert.SSL_CERT_PATH", self.cert_path)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.callback = MagicMock()

    def _write_cert(self, days_left):
        now = datetime.datetime.now()
        _write_self_signed_cert(
            self.cert_path, now - datetime.timedelta(days=1), now + datetime.timedelta(days=days_left)
        )

    def test_becoming_usable_calls_callback_once(self):
        """No certificate at start (usable False); a successful update writes a valid
        one. The callback must fire exactly once with True, and a subsequent check
        cycle over the same valid certificate must not fire it again."""

        def fake_update_cert(_sn):
            self._write_cert(days_left=30)

        with patch("wb.homeui_backend.cert.update_cert", side_effect=fake_update_cert), patch(
            "wb.homeui_backend.cert.update_nginx_config"
        ) as nginx_mock:
            thread = CertificateCheckingThread(
                "TESTSN", allow_certificate_update=True, on_usable_change=self.callback
            )
            self.assertTrue(_wait_for(lambda: self.callback.call_count == 1))
            self.callback.assert_called_once_with(True)
            thread.request_certificate()
            self.assertTrue(_wait_for(lambda: nginx_mock.call_count >= 2))
            self.assertEqual(self.callback.call_count, 1)
            self.assertTrue(thread.is_certificate_usable())

    def test_becoming_unusable_calls_callback_once(self):
        """A valid certificate disappears from disk and the update fails: usable goes
        True -> False and the callback fires exactly once with False (degradation)."""
        self._write_cert(days_left=30)
        with patch(
            "wb.homeui_backend.cert.update_cert", side_effect=RuntimeError("offline")
        ) as update_mock, patch("wb.homeui_backend.cert.update_nginx_config") as nginx_mock:
            thread = CertificateCheckingThread(
                "TESTSN", allow_certificate_update=True, on_usable_change=self.callback
            )
            self.assertTrue(thread.is_certificate_usable())
            self.assertTrue(_wait_for(lambda: nginx_mock.call_count >= 1))
            os.remove(self.cert_path)
            thread.request_certificate()
            self.assertTrue(_wait_for(lambda: self.callback.call_count == 1))
            self.callback.assert_called_once_with(False)
            thread.request_certificate()
            self.assertTrue(_wait_for(lambda: update_mock.call_count >= 2))
            self.assertEqual(self.callback.call_count, 1)
            self.assertFalse(thread.is_certificate_usable())

    def test_failed_callback_is_retried_on_next_cycle(self):
        """A raising callback must not kill the thread, and the transition stays
        pending: the next check cycle retries it; once it succeeds, it is consumed."""

        def fake_update_cert(_sn):
            self._write_cert(days_left=30)

        self.callback.side_effect = [RuntimeError("nginx hiccup"), None]
        with patch("wb.homeui_backend.cert.update_cert", side_effect=fake_update_cert), patch(
            "wb.homeui_backend.cert.update_nginx_config"
        ) as nginx_mock:
            thread = CertificateCheckingThread(
                "TESTSN", allow_certificate_update=True, on_usable_change=self.callback
            )
            self.assertTrue(_wait_for(lambda: self.callback.call_count == 1))
            thread.request_certificate()
            self.assertTrue(_wait_for(lambda: self.callback.call_count == 2))
            self.callback.assert_called_with(True)
            thread.request_certificate()
            self.assertTrue(_wait_for(lambda: nginx_mock.call_count >= 3))
            self.assertEqual(self.callback.call_count, 2)
            self.assertTrue(thread.is_certificate_usable())

    def test_transient_requesting_does_not_call_callback(self):
        """A manual re-check of a valid certificate passes through the transient
        REQUESTING state; usable never changes, so the callback must stay silent."""
        self._write_cert(days_left=30)
        with patch("wb.homeui_backend.cert.update_nginx_config") as nginx_mock:
            thread = CertificateCheckingThread(
                "TESTSN", allow_certificate_update=True, on_usable_change=self.callback
            )
            self.assertTrue(_wait_for(lambda: nginx_mock.call_count >= 1))
            thread.request_certificate()
            self.assertTrue(_wait_for(lambda: nginx_mock.call_count >= 2))
            self.callback.assert_not_called()
            self.assertTrue(thread.is_certificate_usable())

    def test_failed_renewal_of_live_cert_does_not_call_callback(self):
        """A certificate in the renewal window (alive but expiring soon) whose renewal
        fails stays usable and VALID: HTTPS must not be degraded, no callback."""
        self._write_cert(days_left=5)
        with patch(
            "wb.homeui_backend.cert.update_cert", side_effect=RuntimeError("offline")
        ) as update_mock, patch("wb.homeui_backend.cert.update_nginx_config"):
            thread = CertificateCheckingThread(
                "TESTSN", allow_certificate_update=True, on_usable_change=self.callback
            )
            self.assertTrue(_wait_for(lambda: update_mock.call_count >= 1))
            thread.request_certificate()
            self.assertTrue(
                _wait_for(
                    lambda: update_mock.call_count >= 2
                    and thread.get_certificate_state() == CertificateState.VALID
                )
            )
            self.callback.assert_not_called()
            self.assertTrue(thread.is_certificate_usable())
