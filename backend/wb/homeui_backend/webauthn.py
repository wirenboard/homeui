#!/usr/bin/env python3

import json
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
# python-fido2 1.2 keeps this parser behind a compatibility feature flag.
fido2.features.webauthn_json_mapping.enabled = True


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
    def __init__(self, rp_id: str, origin: str, credentials_storage: WebAuthnCredentialsStorage):
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
        self.challenges = WebAuthnChallengeStore()
        self.server = Fido2Server(
            PublicKeyCredentialRpEntity(id=rp_id, name="Wiren Board"),
            verify_origin=lambda request_origin: request_origin == self.origin,
        )

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
        self.server.authenticate_complete(challenge.state, [credential.credential_data], response)
        new_sign_count = authentication.response.authenticator_data.counter
        if credential.sign_count > 0 and new_sign_count > 0:
            if new_sign_count <= credential.sign_count:
                raise ValueError("Credential sign counter did not increase")
        self.credentials_storage.update_last_use(credential.credential_id, new_sign_count)
        return credential.user_id, credential

    def list_credentials(self, user_id: str) -> list[WebAuthnCredential]:
        return self.credentials_storage.get_credentials_by_user(user_id)

    def has_credentials(self) -> bool:
        return self.credentials_storage.has_any_credentials()

    def delete_credential(self, user_id: str, credential_id: bytes) -> bool:
        return self.credentials_storage.delete_credential(user_id, credential_id)

    def delete_credentials_by_user(self, user_id: str) -> None:
        self.credentials_storage.delete_credentials_by_user(user_id)

    @staticmethod
    def credential_to_dict(credential: WebAuthnCredential) -> dict[str, Any]:
        return {
            "id": websafe_encode(credential.credential_id),
            "name": credential.name,
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
