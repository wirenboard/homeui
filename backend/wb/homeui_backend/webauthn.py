#!/usr/bin/env python3

import ipaddress
import secrets
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional
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
# python-fido2 keeps this parser behind a compatibility feature flag.
fido2.features.webauthn_json_mapping.enabled = True

LAN_RP_ID_SUFFIX = "ip.wirenboard.com"


def rp_id_for_host(host: str, sn: str) -> Optional[str]:
    """The relying-party domain for the host the UI was opened on, or None for an IP address
    (browsers refuse WebAuthn there). LAN addresses `<ip>.<sn>.ip.wirenboard.com` map to their
    parent `<sn>.ip.wirenboard.com`, so one passkey keeps working when the controller's IP
    changes and on every interface."""
    try:
        ipaddress.ip_address(host)
        return None
    except ValueError:
        pass
    lan_rp_id = f"{sn.strip().lower()}.{LAN_RP_ID_SUFFIX}"
    return lan_rp_id if host.endswith(f".{lan_rp_id}") else host


class UnknownCredentialError(ValueError):
    pass


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

    # --- Private ---

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
        credentials_storage: WebAuthnCredentialsStorage,
        challenges: WebAuthnChallengeStore,
    ):
        self.rp_id = rp_id
        self.credentials_storage = credentials_storage
        self.challenges = challenges
        self.server = Fido2Server(
            PublicKeyCredentialRpEntity(id=rp_id, name="Wiren Board"),
            verify_origin=self.accepts_origin,
        )

    def accepts_origin(self, request_origin: str) -> bool:
        """HTTPS origin equal to rp_id or a subdomain of it."""
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
    ) -> str:
        challenge = self.challenges.consume(challenge_id, WebAuthnChallengeType.AUTHENTICATION)
        if challenge is None:
            raise ValueError("Invalid or expired authentication challenge")
        authentication = AuthenticationResponse.from_dict(response)
        credential = self.credentials_storage.get_credential_by_id(authentication.id)
        if credential is None:
            raise UnknownCredentialError("Unknown credential")
        self.server.authenticate_complete(challenge.state, [credential.credential_data], response)
        new_sign_count = authentication.response.authenticator_data.counter
        if 0 < new_sign_count <= credential.sign_count:
            raise ValueError("Credential sign counter did not increase")
        self.credentials_storage.update_last_use(credential.credential_id, new_sign_count)
        return credential.user_id

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
