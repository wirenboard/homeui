import datetime
import os
import shutil
import tempfile
import time
import unittest
from unittest.mock import patch

from cryptography.x509.oid import NameOID
from wb.homeui_backend.cert import (
    PLACEHOLDER_CERT_CN,
    CertificateCheckingThread,
    CertificateState,
    generate_placeholder_certificate,
    has_enough_lifetime,
    load_certificate,
    read_or_generate_private_key,
)


class GeneratePlaceholderCertificateTest(unittest.TestCase):
    def setUp(self):
        tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp_dir)
        self.cert_path = os.path.join(tmp_dir, "sslip.pem")
        self.key_path = os.path.join(tmp_dir, "sslip.key")

    def _generate(self):
        with patch("wb.homeui_backend.cert.SSL_CERT_PATH", self.cert_path), patch(
            "wb.homeui_backend.cert.SSL_CERT_KEY_PATH", self.key_path
        ):
            generate_placeholder_certificate()

    def test_writes_expired_self_signed_cert(self):
        """With no certificate on disk the placeholder must be a loadable PEM that
        is already expired (so the real certificate is still requested once updates
        are allowed) and must carry the placeholder CN."""
        self._generate()
        cert = load_certificate(self.cert_path)
        self.assertEqual(
            cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value, PLACEHOLDER_CERT_CN
        )
        self.assertLess(cert.not_valid_after, datetime.datetime.now())
        self.assertFalse(has_enough_lifetime(cert))

    def test_reuses_existing_private_key(self):
        """A pre-existing sslip.key must be reused, not regenerated: nginx configs
        reference the key path, and the real certificate obtained later must pair
        with the same key."""
        existing_key = read_or_generate_private_key(self.key_path)
        self._generate()
        cert = load_certificate(self.cert_path)
        self.assertEqual(cert.public_key().public_numbers(), existing_key.public_key().public_numbers())


class CertificateCheckingThreadPlaceholderTest(unittest.TestCase):
    def test_missing_cert_replaced_with_placeholder_and_reported_unavailable(self):
        """Starting the checking thread with no certificate on disk and updates
        disallowed (HTTPS off) must write the expired placeholder — so nginx TLS
        configs referencing sslip.* always load — and report the certificate as
        UNAVAILABLE rather than VALID."""
        with tempfile.TemporaryDirectory() as tmp:
            cert_path = os.path.join(tmp, "sslip.pem")
            key_path = os.path.join(tmp, "sslip.key")
            with patch("wb.homeui_backend.cert.SSL_CERT_PATH", cert_path), patch(
                "wb.homeui_backend.cert.SSL_CERT_KEY_PATH", key_path
            ):
                thread = CertificateCheckingThread("TESTSN", allow_certificate_update=False)
                deadline = time.monotonic() + 10
                while time.monotonic() < deadline:
                    if (
                        os.path.exists(cert_path)
                        and thread.get_certificate_state() == CertificateState.UNAVAILABLE
                    ):
                        break
                    time.sleep(0.05)
                self.assertTrue(os.path.exists(cert_path))
                self.assertEqual(thread.get_certificate_state(), CertificateState.UNAVAILABLE)
                self.assertFalse(has_enough_lifetime(load_certificate(cert_path)))
