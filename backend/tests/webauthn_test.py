import hashlib
import sqlite3
from datetime import datetime, timedelta, timezone

import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from fido2.cose import ES256
from fido2.utils import websafe_encode
from fido2.webauthn import (
    Aaguid,
    AttestationObject,
    AttestedCredentialData,
    AuthenticatorData,
    CollectedClientData,
)
from wb.homeui_backend.db import create_tables, migration_3
from wb.homeui_backend.users_storage import User, UserType
from wb.homeui_backend.webauthn import (
    WebAuthnChallengeStore,
    WebAuthnChallengeType,
    WebAuthnService,
    json_dumps,
)
from wb.homeui_backend.webauthn_storage import WebAuthnCredentialsStorage


def make_credential(credential_id: bytes = b"credential-id") -> AttestedCredentialData:
    private_key = ec.generate_private_key(ec.SECP256R1())
    return AttestedCredentialData.create(
        Aaguid.NONE,
        credential_id,
        ES256.from_cryptography_key(private_key.public_key()),
    )


@pytest.fixture(name="storage")
def storage_fixture():
    connection = sqlite3.connect(":memory:")
    create_tables(connection)
    return WebAuthnCredentialsStorage(connection)


def test_credentials_storage_lifecycle(storage):
    credential_data = make_credential()

    added = storage.add_credential("user-id", "MacBook Touch ID", credential_data, 1)
    loaded = storage.get_credentials_by_user("user-id")

    assert len(loaded) == 1
    assert loaded[0].credential_id == added.credential_id
    assert loaded[0].credential_data == credential_data
    assert loaded[0].name == "MacBook Touch ID"
    assert loaded[0].sign_count == 1
    assert loaded[0].last_used_at is None

    storage.update_last_use(added.credential_id, 2)
    updated = storage.get_credentials_by_user("user-id")[0]
    assert updated.sign_count == 2
    assert updated.last_used_at is not None

    assert storage.delete_credential("other-user", added.credential_id) is False
    assert storage.delete_credential("user-id", added.credential_id) is True
    assert storage.get_credentials_by_user("user-id") == []


def test_credentials_storage_deletes_all_credentials_for_user(storage):
    storage.add_credential("user-id", "First", make_credential(b"first"), 0)
    storage.add_credential("user-id", "Second", make_credential(b"second"), 0)

    storage.delete_credentials_by_user("user-id")

    assert storage.get_credentials_by_user("user-id") == []


def test_migration_3_creates_credentials_table():
    connection = sqlite3.connect(":memory:")

    migration_3(connection)

    version = connection.execute("PRAGMA user_version").fetchone()[0]
    table = connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'webauthn_credentials'"
    ).fetchone()
    assert version == 3
    assert table == ("webauthn_credentials",)


def test_challenge_is_one_time():
    challenge_store = WebAuthnChallengeStore()
    challenge_id = challenge_store.add(WebAuthnChallengeType.REGISTRATION, "user-id", {"a": 1})

    challenge = challenge_store.consume(challenge_id, WebAuthnChallengeType.REGISTRATION)

    assert challenge is not None
    assert challenge.user_id == "user-id"
    assert challenge_store.consume(challenge_id, WebAuthnChallengeType.REGISTRATION) is None


def test_expired_challenge_is_rejected():
    challenge_store = WebAuthnChallengeStore()
    challenge_id = challenge_store.add(WebAuthnChallengeType.AUTHENTICATION, "user-id", {})
    challenge = challenge_store.challenges[challenge_id]
    challenge_store.challenges[challenge_id] = challenge.__class__(
        challenge.challenge_type,
        challenge.user_id,
        challenge.state,
        datetime.now(timezone.utc) - timedelta(seconds=1),
    )

    assert challenge_store.consume(challenge_id, WebAuthnChallengeType.AUTHENTICATION) is None


def test_registration_options_are_json_serializable(storage):
    service = WebAuthnService("wb.example.com", "https://wb.example.com", storage)
    user = User("user-id", "admin", "hash", UserType.ADMIN, False)

    ceremony = service.begin_registration(user)

    assert ceremony["challenge_id"]
    assert "publicKey" in ceremony["options"]
    assert json_dumps(ceremony)


def test_authentication_requires_registered_credential(storage):
    service = WebAuthnService("wb.example.com", "https://wb.example.com", storage)
    user = User("user-id", "admin", "hash", UserType.ADMIN, False)

    with pytest.raises(ValueError, match="No credentials configured"):
        service.begin_authentication(user)


@pytest.mark.parametrize(
    "rp_id,origin",
    [
        ("https://wb.example.com", "https://wb.example.com"),
        ("wb.example.com", "http://wb.example.com"),
        ("wb.example.com", "https://other.example.com"),
        ("wb.example.com", "https://wb.example.com/path"),
    ],
)
def test_invalid_relying_party_configuration_is_rejected(storage, rp_id, origin):
    with pytest.raises(ValueError):
        WebAuthnService(rp_id, origin, storage)


def complete_registration(service, user, credential_data, origin, rp_id):
    registration = service.begin_registration(user)
    client_data = CollectedClientData.create(
        CollectedClientData.TYPE.CREATE,
        registration["options"]["publicKey"]["challenge"],
        origin,
    )
    registration_auth_data = AuthenticatorData.create(
        hashlib.sha256(rp_id.encode()).digest(),
        AuthenticatorData.FLAG.UP | AuthenticatorData.FLAG.UV | AuthenticatorData.FLAG.AT,
        0,
        credential_data,
    )
    attestation = AttestationObject.create("none", registration_auth_data, {})
    return service.complete_registration(
        user,
        registration["challenge_id"],
        "MacBook Touch ID",
        {
            "id": websafe_encode(credential_data.credential_id),
            "rawId": websafe_encode(credential_data.credential_id),
            "type": "public-key",
            "response": {
                "clientDataJSON": websafe_encode(bytes(client_data)),
                "attestationObject": websafe_encode(bytes(attestation)),
            },
        },
    )


def complete_authentication(service, user, credential_data, private_key, relying_party):
    rp_id, origin = relying_party
    authentication = service.begin_authentication(user)
    client_data = CollectedClientData.create(
        CollectedClientData.TYPE.GET,
        authentication["options"]["publicKey"]["challenge"],
        origin,
    )
    authentication_auth_data = AuthenticatorData.create(
        hashlib.sha256(rp_id.encode()).digest(),
        AuthenticatorData.FLAG.UP | AuthenticatorData.FLAG.UV,
        1,
    )
    signature = private_key.sign(
        bytes(authentication_auth_data) + client_data.hash,
        ec.ECDSA(hashes.SHA256()),
    )
    return service.complete_authentication(
        authentication["challenge_id"],
        {
            "id": websafe_encode(credential_data.credential_id),
            "rawId": websafe_encode(credential_data.credential_id),
            "type": "public-key",
            "response": {
                "clientDataJSON": websafe_encode(bytes(client_data)),
                "authenticatorData": websafe_encode(bytes(authentication_auth_data)),
                "signature": websafe_encode(signature),
                "userHandle": websafe_encode(user.user_id.encode()),
            },
        },
    )


def test_registration_and_authentication_ceremonies(storage):
    rp_id = "wb.example.com"
    origin = "https://wb.example.com"
    service = WebAuthnService(rp_id, origin, storage)
    user = User("user-id", "admin", "hash", UserType.ADMIN, False)
    private_key = ec.generate_private_key(ec.SECP256R1())
    credential_data = AttestedCredentialData.create(
        Aaguid.NONE,
        b"credential-id",
        ES256.from_cryptography_key(private_key.public_key()),
    )

    registered = complete_registration(service, user, credential_data, origin, rp_id)
    authenticated_user_id, authenticated_credential = complete_authentication(
        service, user, credential_data, private_key, (rp_id, origin)
    )

    assert registered.credential_id == credential_data.credential_id
    assert authenticated_user_id == user.user_id
    assert authenticated_credential.credential_id == credential_data.credential_id
    assert storage.get_credentials_by_user(user.user_id)[0].sign_count == 1
