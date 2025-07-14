import datetime
import json
import logging
import os
import shutil
import subprocess
import tempfile
import threading
from enum import Enum

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

CERT_REQUEST_URL = "https://acme.wirenboard.com/api/v1/issue"
SSL_CERT_PATH = "/etc/ssl/sslip.pem"
SSL_CERT_KEY_PATH = "/etc/ssl/sslip.key"
KEYSPEC_WB7_WB8 = "ATECCx08:00:02:C0:00"
KEYSPEC_WB6 = "ATECCx08:00:04:C0:00"
DEVICE_ORIGINAL_CERT = "/etc/ssl/certs/device_bundle.crt.pem"

NGINX_TEMPLATES_DIR = "/usr/share/wb-mqtt-homeui/nginx-templates"
WB_DYNAMIC_NGINX_CONF_DIR = "/var/lib/wb-homeui/nginx"
WB_NGINX_INCLUDES_DIR = "/etc/nginx/includes/default.wb.d"

CERT_CHECK_INTERVAL_S = 60 * 60 * 24  # 24 hours
MIN_DAYS_BEFORE_RENEW = 15
CURL_TIMEOUT_S = 120  # 2 minutes


def make_domain_name(sn: str) -> str:
    return f"*.{sn}.ip.wirenboard.com"


def get_keyspec() -> str:
    command = (
        '. /usr/lib/wb-utils/wb_env.sh && wb_source of && of_machine_match "contactless,imx6ul-wirenboard60"'
    )
    result = subprocess.run(["/bin/bash", "-c", command], check=False)
    if result.returncode == 0:
        return KEYSPEC_WB6
    return KEYSPEC_WB7_WB8


def load_certificate(cert_pem_file_name: str) -> x509.Certificate:
    with open(cert_pem_file_name, "rb") as cert_file:
        return x509.load_pem_x509_certificate(cert_file.read())


def has_enough_lifetime(cert: x509.Certificate) -> bool:
    return (cert.not_valid_after - datetime.datetime.now()).days >= MIN_DAYS_BEFORE_RENEW


def read_or_generate_private_key(file_name: str) -> rsa.RSAPrivateKey:
    try:
        with open(file_name, "rb") as key_file:
            private_key = serialization.load_pem_private_key(
                key_file.read(),
                password=None,
            )
            if isinstance(private_key, rsa.RSAPrivateKey):
                return private_key
            logging.debug("Data in %s is not RSA private key", file_name)
    except Exception as e:
        logging.debug("Error loading private key from file: %s", e)

    logging.debug("Generating private key")
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    with open(file_name, "wb") as file:
        file.write(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )
    return private_key


def generate_csr(private_key: rsa.RSAPrivateKey, domain_name: str) -> x509.CertificateSigningRequest:
    logging.debug("Generating CSR")
    return (
        x509.CertificateSigningRequestBuilder()
        .subject_name(
            x509.Name(
                [
                    x509.NameAttribute(NameOID.COMMON_NAME, domain_name),
                ]
            )
        )
        .add_extension(
            x509.SubjectAlternativeName(
                [
                    x509.DNSName(domain_name),
                ]
            ),
            critical=False,
        )
        .add_extension(
            x509.ExtendedKeyUsage(
                [
                    x509.ExtendedKeyUsageOID.SERVER_AUTH,
                    x509.ExtendedKeyUsageOID.CLIENT_AUTH,
                ]
            ),
            critical=False,
        )
        .sign(private_key, hashes.SHA256())
    )


def swap_certs(original_pem_file_name, resulting_pem_file_name):
    """
    Swap certificates in original file and store as a new file
    """
    logging.debug("Swapping certificates")
    with open(original_pem_file_name, "r", encoding="utf-8") as original_cert_file:
        certs_data = original_cert_file.read()

    cert_header = "-----BEGIN CERTIFICATE-----"
    certs = []
    for cert_data in certs_data.split(cert_header):
        if cert_data.strip():
            cert_data = cert_header + cert_data
            certs.append(cert_data)

    if len(certs) >= 2:
        certs = [certs[1], certs[0]]

    with open(resulting_pem_file_name, "w", encoding="utf-8") as request_cert_file:
        for cert in certs:
            request_cert_file.write(cert)


def request_certificate(cert_pem_file_name: str, keyspec: str, csr_file_name: str) -> str:
    logging.debug("Requesting certificate")

    with tempfile.NamedTemporaryFile() as output_file:
        curl_command = [
            "curl",
            "-s",
            "-o",
            output_file.name,
            "-w",
            "%{http_code}",
            "--cert",
            cert_pem_file_name,
            "--key",
            keyspec,
            "--engine",
            "ateccx08",
            "--key-type",
            "ENG",
            "-X",
            "POST",
            "-F",
            f"csr=@{csr_file_name}",
            CERT_REQUEST_URL,
            "-m",
            str(CURL_TIMEOUT_S),
        ]

        result = subprocess.run(
            curl_command, capture_output=True, text=True, check=True, timeout=1.5 * CURL_TIMEOUT_S
        )
        http_result_code = int(result.stdout.strip())
        if http_result_code != 200:
            raise RuntimeError(f"Error getting certificate. HTTP code: {http_result_code}")

        # Successfully got certificate
        output_file.seek(0)
        fullchain_pem = json.loads(output_file.read()).get("fullchain_pem")
        if not fullchain_pem:
            raise RuntimeError("fullchain_pem not found in the response")
        return fullchain_pem


def update_cert(sn: str) -> None:
    domain = make_domain_name(sn)
    private_key = read_or_generate_private_key(SSL_CERT_KEY_PATH)
    csr = generate_csr(private_key, domain)
    with tempfile.NamedTemporaryFile() as csr_file, tempfile.NamedTemporaryFile() as request_cert_file:
        csr_file.write(csr.public_bytes(serialization.Encoding.PEM))
        csr_file.flush()  # dump csr to disk to use it in curl request

        swap_certs(DEVICE_ORIGINAL_CERT, request_cert_file.name)

        fullchain_pem = request_certificate(request_cert_file.name, get_keyspec(), csr_file.name)
        with open(SSL_CERT_PATH, "w", encoding="utf-8") as cert_file:
            cert_file.write(fullchain_pem)

        logging.debug("Generating DH parameters")
        subprocess.run(["openssl", "dhparam", "-out", "/etc/ssl/dhparam.pem", "256"], check=True)

        logging.info("Certificate updated successfully")


def update_nginx_config(sn: str) -> None:
    https_conf_path = os.path.join(WB_DYNAMIC_NGINX_CONF_DIR, "https.conf")

    if os.path.exists(https_conf_path):
        logging.debug("Nginx HTTPS config is already present, skipping creation")
        return

    logging.debug("Nginx HTTPS config file does not exist, creating")

    # Make https config
    with open(f"{NGINX_TEMPLATES_DIR}/https.conf", "r", encoding="utf-8") as template_file:
        template_content = template_file.read()

    updated_content = template_content.format(short_sn=sn)

    os.makedirs(WB_DYNAMIC_NGINX_CONF_DIR, exist_ok=True)
    with open(https_conf_path, "w", encoding="utf-8") as https_conf_file:
        https_conf_file.write(updated_content)

    logging.info("Nginx HTTPS config updated successfully")

    subprocess.run(["systemctl", "reload", "nginx"], check=True)


class CertificateState(Enum):
    VALID = "valid"
    REQUESTING = "requesting"
    UNAVAILABLE = "unavailable"


class CertificateCheckingThread:
    def __init__(self, sn: str):
        self.sn = sn
        self._state_lock = threading.Lock()
        self._state: CertificateState = CertificateState.REQUESTING
        self._request_condition = threading.Condition(self._state_lock)
        self._thread = threading.Thread(target=self.run, daemon=True)
        self._thread.start()

    def get_state(self) -> CertificateState:
        with self._state_lock:
            return self._state

    def request_certificate(self) -> None:
        with self._request_condition:
            if self._state == CertificateState.REQUESTING:
                return
            self._state = CertificateState.REQUESTING
            self._request_condition.notify_all()

    def _set_state(self, state: CertificateState) -> None:
        with self._state_lock:
            self._state = state

    def run(self):
        logging.debug("Running certificate checking thread")
        while True:
            with self._request_condition:
                self._request_condition.wait_for(
                    lambda: self._state == CertificateState.REQUESTING, timeout=CERT_CHECK_INTERVAL_S
                )

            state_on_update_fail = CertificateState.UNAVAILABLE
            self._set_state(CertificateState.REQUESTING)
            try:
                cert = load_certificate(SSL_CERT_PATH)
                if has_enough_lifetime(cert):
                    self._set_state(CertificateState.VALID)
                    update_nginx_config(self.sn)
                    logging.debug("Certificate is valid")
                    continue
                state_on_update_fail = CertificateState.VALID
                logging.debug("Certificate needs renewal")
            except Exception as e:
                logging.debug("Error checking certificate: %s", e)

            try:
                update_cert(self.sn)
                update_nginx_config(self.sn)
                self._set_state(CertificateState.VALID)
            except Exception as e:
                logging.error("Error updating certificate: %s", e)
                self._set_state(state_on_update_fail)
