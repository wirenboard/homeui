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

SSL_CERT_PATH = "/etc/ssl/sslip.pem"
SSL_CERT_KEY_PATH = "/etc/ssl/sslip.key"
KEYSPEC_WB7_WB8 = "ATECCx08:00:02:C0:00"
KEYSPEC_WB6 = "ATECCx08:00:04:C0:00"
DEVICE_ORIGINAL_CERT = "/etc/ssl/certs/device_bundle.crt.pem"

NGINX_TEMPLATES_DIR = "/usr/share/wb-mqtt-homeui/nginx-templates"
WB_DYNAMIC_NGINX_CONF_DIR = "/var/lib/wb-homeui/nginx"
WB_NGINX_INCLUDES_DIR = "/etc/nginx/includes/default.wb.d"


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


def is_about_to_expire(cert_pem_file_name: str) -> bool:
    with open(cert_pem_file_name, "rb") as cert_file:
        cert_data = x509.load_pem_x509_certificate(cert_file.read())
        return (cert_data.not_valid_after - datetime.datetime.now()).days < 15


def generate_private_key() -> rsa.RSAPrivateKey:
    logging.debug("Generating private key")
    return rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )


def save_private_key(file_name, private_key: rsa.RSAPrivateKey) -> None:
    with open(file_name, "wb") as file:
        file.write(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )


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
    with open(original_pem_file_name, "r", encoding="utf-8") as original_cert_file:
        cert_lines = original_cert_file.readlines()

    certs = []
    current_cert = []
    for line in cert_lines:
        if "BEGIN CERTIFICATE" in line:
            if current_cert:
                certs.append(current_cert)
                current_cert = []
        current_cert.append(line)
    if current_cert:
        certs.append(current_cert)

    if len(certs) >= 2:
        certs = [certs[1], certs[0]]

    with open(resulting_pem_file_name, "w", encoding="utf-8") as request_cert_file:
        for cert in certs:
            request_cert_file.writelines(cert)


def request_certificate(
    cert_pem_file_name: str, keyspec: str, csr_file_name: str, output_file_name: str
) -> str:
    logging.debug("Requesting certificate")

    curl_command = [
        "curl",
        "-s",
        "-o",
        output_file_name,
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
        "https://sslip-cert.wirenboard.com/api/v1/issue",
    ]

    result = subprocess.run(curl_command, capture_output=True, text=True, check=True)
    http_result_code = int(result.stdout.strip())
    if http_result_code != 200:
        raise RuntimeError(f"Error getting certificate. HTTP code: {http_result_code}")

    # Successfully got certificate
    with open(output_file_name, "r", encoding="utf-8") as output_file:
        fullchain_pem = json.loads(output_file.read()).get("fullchain_pem")
        if not fullchain_pem:
            raise RuntimeError("fullchain_pem not found in the response")
        return fullchain_pem


def update_cert(sn: str) -> None:
    domain = make_domain_name(sn)
    private_key = generate_private_key()
    csr = generate_csr(private_key, domain)
    with tempfile.NamedTemporaryFile() as csr_file:
        with tempfile.NamedTemporaryFile() as request_cert_file:
            with tempfile.NamedTemporaryFile() as output_temp_file:
                csr_file.write(csr.public_bytes(serialization.Encoding.PEM))
                csr_file.flush()
                swap_certs(DEVICE_ORIGINAL_CERT, request_cert_file.name)
                fullchain_pem = request_certificate(
                    request_cert_file.name, get_keyspec(), csr_file.name, output_temp_file.name
                )
                save_private_key(SSL_CERT_KEY_PATH, private_key)
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

    updated_content = template_content.replace("SHORT_SN", sn)

    os.makedirs(WB_DYNAMIC_NGINX_CONF_DIR, exist_ok=True)
    with open(https_conf_path, "w", encoding="utf-8") as https_conf_file:
        https_conf_file.write(updated_content)

    # Copy listen config
    source_path = os.path.join(NGINX_TEMPLATES_DIR, "listen-https.conf")
    destination_path = os.path.join(WB_NGINX_INCLUDES_DIR, "listen-https.conf")
    shutil.copy2(source_path, destination_path)

    logging.info("Nginx HTTPS config updated successfully")

    subprocess.run(["systemctl", "reload", "nginx"], check=True)


class CertificateState(Enum):
    VALID = "valid"
    REQUESTING = "requesting"
    UNAVAILABLE = "unavailable"
    EXPIRED = "expired"


class CertificateCheckingThread:
    def __init__(self, sn: str):
        self.sn = sn
        self._state_lock = threading.Lock()
        self._state: CertificateState = CertificateState.UNAVAILABLE
        self._run_condition = threading.Condition()
        self._thread = threading.Thread(target=self.run, daemon=True)
        self._thread.start()

    def get_state(self) -> CertificateState:
        with self._state_lock:
            return self._state

    def request_certificate(self) -> None:
        with self._state_lock:
            if self._state == CertificateState.REQUESTING:
                return
            self._set_state(CertificateState.REQUESTING)
        with self._run_condition:
            self._run_condition.notify()

    def _set_state(self, state: CertificateState) -> None:
        with self._state_lock:
            self._state = state

    def run(self):
        logging.debug("Running certificate checking thread")
        first_start = True
        while True:
            with self._run_condition:
                if not first_start:
                    self._run_condition.wait(60 * 60 * 24)
                first_start = False
                self._set_state(CertificateState.REQUESTING)
                try:
                    if is_about_to_expire(SSL_CERT_PATH):
                        state_on_fail = CertificateState.EXPIRED
                        logging.warning("Certificate is about to expire")
                    else:
                        self._set_state(CertificateState.VALID)
                        logging.debug("Certificate is valid")
                        continue
                except Exception as e:
                    state_on_fail = CertificateState.UNAVAILABLE
                    logging.debug("Error checking certificate: %s", e)
                try:
                    update_cert(self.sn)
                    self._set_state(CertificateState.VALID)
                    update_nginx_config(self.sn)
                except Exception as e:
                    logging.error("Error updating certificate: %s", e)
                    self._set_state(state_on_fail)
