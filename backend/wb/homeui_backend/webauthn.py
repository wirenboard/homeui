#!/usr/bin/env python3

import configparser
import json
import logging
import os
import re
import secrets
import subprocess  # nosec B404 - needed to run systemctl is-active, matching gates.py's pattern
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional, Sequence
from urllib.parse import urlparse

import fido2.features
from fido2.server import Fido2Server
from fido2.utils import websafe_decode, websafe_encode
from fido2.webauthn import (
    AuthenticationResponse,
    PublicKeyCredentialRpEntity,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from .users_storage import User
from .webauthn_storage import WebAuthnCredential, WebAuthnCredentialsStorage

CHALLENGE_LIFETIME = timedelta(minutes=5)
MAX_CREDENTIAL_NAME_LENGTH = 80

# Browser responses use the WebAuthn JSON representation (base64url for binary fields).
# python-fido2 1.2 keeps this parser behind a compatibility feature flag.
fido2.features.webauthn_json_mapping.enabled = True

LAN_RP_ID_SUFFIX = "ip.wirenboard.com"

CLOUD_PROVIDERS_DIR = "/var/lib/wb-cloud-agent/providers"
CLOUD_FRPC_HTTP_SECTION = "http"
CLOUD_FRPC_HTTP_TYPE = "tcp"
CLOUD_FRPC_HTTP_LOCAL_PORT = "80"
CLOUD_TUNNEL_STATUS_TIMEOUT_S = 5

# wb-cloud-agent provider directory names end up in an rp_id/domain string; restrict to
# plausible DNS-label characters so a stray/malicious directory can't smuggle anything odd in.
_CLOUD_PROVIDER_NAME_RE = re.compile(r"^[A-Za-z0-9.-]+$")


def lan_rp_id(sn: str) -> str:
    """The LAN relying-party domain: the parent of the ACME wildcard cert domain
    (`cert.py: make_domain_name`). WebAuthn allows an rp_id to be a registrable-domain parent
    of the actual origin, so any LAN-IP-mapped subdomain of this is automatically the same
    relying party -- no admin domain list, no Related Origin Requests."""
    return f"{sn.strip().lower()}.{LAN_RP_ID_SUFFIX}"


def cloud_rp_id(sn: str, provider: str) -> str:
    """The cloud relying-party domain for one wb-cloud-agent provider: the provider's
    `[http]` FRP tunnel is a raw TCP passthrough to local port 80, so the browser's original
    Host header (this domain) survives unchanged all the way to local nginx."""
    return f"{sn.strip().lower()}.http.{provider}"


def _provider_has_http_tunnel(provider_dir: str) -> bool:
    """A provider only counts as a homeui cloud candidate if its frpc.conf declares an
    `[http]` tunnel proxying to local port 80 -- other tunnels (unrelated internal services)
    don't expose the web UI at all."""
    parser = configparser.ConfigParser()
    try:
        if not parser.read(os.path.join(provider_dir, "frpc.conf")):
            return False
        section = parser[CLOUD_FRPC_HTTP_SECTION]
        return (
            section.get("type", "").strip() == CLOUD_FRPC_HTTP_TYPE
            and section.get("local_port", "").strip() == CLOUD_FRPC_HTTP_LOCAL_PORT
        )
    except Exception as e:  # pylint: disable=broad-exception-caught  # frpc.conf's format isn't ours to trust
        logging.debug("Ignoring wb-cloud-agent provider at %s: %s", provider_dir, e)
        return False


def discover_cloud_providers() -> list[str]:
    """Provider names under `/var/lib/wb-cloud-agent/providers` that expose a homeui-facing
    `[http]` tunnel. Never raises: a missing/unreadable providers directory just means "no
    cloud candidates", not an error."""
    try:
        entries = sorted(os.listdir(CLOUD_PROVIDERS_DIR))
    except OSError as e:
        logging.debug("wb-cloud-agent providers directory unavailable: %s", e)
        return []
    providers = []
    for entry in entries:
        if not _CLOUD_PROVIDER_NAME_RE.match(entry):
            continue
        provider_dir = os.path.join(CLOUD_PROVIDERS_DIR, entry)
        if os.path.isdir(provider_dir) and _provider_has_http_tunnel(provider_dir):
            providers.append(entry)
    return providers


def is_cloud_tunnel_active(provider: str) -> bool:
    """Shells out to `systemctl is-active`, matching the existing subprocess-calling
    convention in gates.py (`nginx -t` / `systemctl reload`). This depends on a
    wb-cloud-agent-internal unit naming convention, not its public contract, so any failure
    (missing binary, unexpected output, a renamed unit, ...) must degrade to "not active",
    never raise -- the timeout guards against a hung call blocking this request indefinitely,
    unlike gates.py's one-off startup/toggle calls."""
    try:
        result = subprocess.run(  # nosec B603 - argv is fixed except for a regex-filtered provider name
            ["/usr/bin/systemctl", "is-active", f"wb-cloud-agent-frpc@{provider}.service"],
            capture_output=True,
            text=True,
            check=False,
            timeout=CLOUD_TUNNEL_STATUS_TIMEOUT_S,
        )
    except (OSError, subprocess.SubprocessError) as e:
        logging.debug("Could not check wb-cloud-agent-frpc@%s.service status: %s", provider, e)
        return False
    return result.stdout.strip() == "active"


def active_cloud_rp_ids(sn: str) -> list[str]:
    return [
        cloud_rp_id(sn, provider)
        for provider in discover_cloud_providers()
        if is_cloud_tunnel_active(provider)
    ]


def match_rp_id(host: str, candidates: Sequence[str]) -> Optional[str]:
    """The candidate domain whose registrable scope covers `host`: either `host` is exactly
    the candidate, or it's a subdomain of it (the LAN case: any `*.{candidate}` IP-mapped
    hostname)."""
    normalized_host = host.strip().lower().rstrip(".")
    for candidate in candidates:
        if normalized_host == candidate or normalized_host.endswith(f".{candidate}"):
            return candidate
    return None


class WebAuthnChallengeType(Enum):
    REGISTRATION = "registration"
    AUTHENTICATION = "authentication"


@dataclass(frozen=True)
class WebAuthnChallenge:
    challenge_type: WebAuthnChallengeType
    # None for an authentication challenge: with discoverable credentials the user is
    # identified from the assertion response, not known ahead of the challenge.
    user_id: Optional[str]
    state: dict[str, Any]
    expires_at: datetime


class WebAuthnChallengeStore:
    def __init__(self):
        self.challenges: dict[str, WebAuthnChallenge] = {}
        self.lock = threading.Lock()

    def add(
        self, challenge_type: WebAuthnChallengeType, user_id: Optional[str], state: dict[str, Any]
    ) -> str:
        challenge_id = secrets.token_urlsafe(32)
        with self.lock:
            self._delete_expired()
            self.challenges[challenge_id] = WebAuthnChallenge(
                challenge_type,
                user_id,
                state,
                datetime.now(timezone.utc) + CHALLENGE_LIFETIME,
            )
        return challenge_id

    def consume(
        self, challenge_id: str, challenge_type: WebAuthnChallengeType
    ) -> Optional[WebAuthnChallenge]:
        with self.lock:
            self._delete_expired()
            challenge = self.challenges.pop(challenge_id, None)
        if challenge is None or challenge.challenge_type != challenge_type:
            return None
        return challenge

    def _delete_expired(self) -> None:
        now = datetime.now(timezone.utc)
        self.challenges = {
            challenge_id: challenge
            for challenge_id, challenge in self.challenges.items()
            if challenge.expires_at > now
        }


class WebAuthnService:
    def __init__(
        self,
        rp_id: str,
        origin: str,
        credentials_storage: WebAuthnCredentialsStorage,
        # Caller-supplied so a persistent store can be shared across the short-lived
        # per-request WebAuthnService instances main.py builds (one per Host-resolved rp_id) --
        # a challenge from begin_*() must still be found by complete_*() on a later request.
        challenges: Optional[WebAuthnChallengeStore] = None,
    ):
        normalized_rp_id = rp_id.strip().lower().rstrip(".")
        normalized_origin = origin.strip().rstrip("/")
        parsed_origin = urlparse(normalized_origin)
        origin_host = (parsed_origin.hostname or "").lower().rstrip(".")
        if not normalized_rp_id or "/" in normalized_rp_id or ":" in normalized_rp_id:
            raise ValueError("Invalid WebAuthn relying party id")
        if parsed_origin.scheme != "https" or not origin_host:
            raise ValueError("WebAuthn origin must be an HTTPS origin")
        if origin_host != normalized_rp_id and not origin_host.endswith(f".{normalized_rp_id}"):
            raise ValueError("WebAuthn origin is outside the relying party domain")
        if parsed_origin.path or parsed_origin.params or parsed_origin.query or parsed_origin.fragment:
            raise ValueError("WebAuthn origin must not contain a path, query, or fragment")
        self.rp_id = normalized_rp_id
        self.origin = normalized_origin
        self.credentials_storage = credentials_storage
        self.challenges = challenges if challenges is not None else WebAuthnChallengeStore()
        self.server = Fido2Server(
            PublicKeyCredentialRpEntity(id=rp_id, name="Wiren Board"),
            verify_origin=self.accepts_origin,
        )

    def accepts_origin(self, request_origin: str) -> bool:
        """True for an HTTPS origin whose host is this service's rp_id itself or any subdomain
        of it -- WebAuthn's registrable-domain rule for an rp_id that is a parent of the real
        origin. This is what lets a passkey registered via one LAN-IP-mapped subdomain of
        `{sn}.ip.wirenboard.com` keep authenticating from a different one, with no related-origin
        list. Passed to `Fido2Server` as `verify_origin`; exposed publicly so it can be
        unit-tested directly."""
        parsed = urlparse(request_origin)
        if parsed.scheme != "https":
            return False
        host = (parsed.hostname or "").lower().rstrip(".")
        return host == self.rp_id or host.endswith(f".{self.rp_id}")

    def begin_registration(self, user: User) -> dict[str, Any]:
        credentials = self.credentials_storage.get_credentials_by_user(user.user_id)
        options, state = self.server.register_begin(
            {
                "id": user.user_id.encode("utf-8"),
                "name": user.login,
                "displayName": user.login,
            },
            [credential.credential_data for credential in credentials],
            resident_key_requirement=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        )
        return {
            "challenge_id": self.challenges.add(WebAuthnChallengeType.REGISTRATION, user.user_id, state),
            "options": dict(options),
        }

    def complete_registration(
        self, user: User, challenge_id: str, name: str, response: dict[str, Any]
    ) -> WebAuthnCredential:
        challenge = self.challenges.consume(challenge_id, WebAuthnChallengeType.REGISTRATION)
        if challenge is None or challenge.user_id != user.user_id:
            raise ValueError("Invalid or expired registration challenge")
        normalized_name = name.strip()
        if not normalized_name or len(normalized_name) > MAX_CREDENTIAL_NAME_LENGTH:
            raise ValueError("Invalid credential name")
        auth_data = self.server.register_complete(challenge.state, response)
        return self.credentials_storage.add_credential(
            user.user_id,
            normalized_name,
            self.rp_id,
            auth_data.credential_data,
            auth_data.counter,
        )

    def begin_authentication(self) -> dict[str, Any]:
        # No `credentials` list: the client discovers its own resident credentials for
        # this rp_id, so the browser can offer an account picker without a typed login.
        options, state = self.server.authenticate_begin(
            user_verification=UserVerificationRequirement.REQUIRED,
        )
        return {
            "challenge_id": self.challenges.add(WebAuthnChallengeType.AUTHENTICATION, None, state),
            "options": dict(options),
        }

    def complete_authentication(
        self, challenge_id: str, response: dict[str, Any]
    ) -> tuple[str, WebAuthnCredential]:
        challenge = self.challenges.consume(challenge_id, WebAuthnChallengeType.AUTHENTICATION)
        if challenge is None:
            raise ValueError("Invalid or expired authentication challenge")
        authentication = AuthenticationResponse.from_dict(response)
        credential = self.credentials_storage.get_credential_by_id(authentication.id)
        if credential is None:
            raise ValueError("Unknown credential")
        if credential.domain != self.rp_id:
            # Belt-and-braces: Fido2Server's own rp_id check below would likely already catch
            # a true cross-domain mismatch, but this makes the intent explicit and doesn't
            # depend on that library behavior.
            raise ValueError("Credential was registered for a different domain")
        self.server.authenticate_complete(challenge.state, [credential.credential_data], response)
        new_sign_count = authentication.response.authenticator_data.counter
        if credential.sign_count > 0 and new_sign_count > 0:
            if new_sign_count <= credential.sign_count:
                raise ValueError("Credential sign counter did not increase")
        self.credentials_storage.update_last_use(credential.credential_id, new_sign_count)
        return credential.user_id, credential

    def list_credentials(self, user_id: str) -> list[WebAuthnCredential]:
        return self.credentials_storage.get_credentials_by_user(user_id)

    def delete_credential(self, user_id: str, credential_id: bytes) -> bool:
        return self.credentials_storage.delete_credential(user_id, credential_id)

    def delete_credentials_by_user(self, user_id: str) -> None:
        self.credentials_storage.delete_credentials_by_user(user_id)

    @staticmethod
    def credential_to_dict(credential: WebAuthnCredential) -> dict[str, Any]:
        return {
            "id": websafe_encode(credential.credential_id),
            "name": credential.name,
            "domain": credential.domain,
            "created_at": credential.created_at.isoformat(),
            "last_used_at": credential.last_used_at.isoformat() if credential.last_used_at else None,
        }

    @staticmethod
    def decode_credential_id(credential_id: str) -> bytes:
        return websafe_decode(credential_id)


def json_dumps(value: Any) -> str:
    def default(item: Any):
        if isinstance(item, bytes):
            return websafe_encode(item)
        if isinstance(item, Enum):
            return item.value
        return dict(item)

    return json.dumps(value, default=default)
