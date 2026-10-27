import hashlib
import sqlite3
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

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
    active_cloud_rp_ids,
    cloud_rp_id,
    discover_cloud_providers,
    is_cloud_tunnel_active,
    json_dumps,
    lan_rp_id,
    match_rp_id,
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

    added = storage.add_credential("user-id", "MacBook Touch ID", "wb.example.com", credential_data, 1)
    loaded = storage.get_credentials_by_user("user-id")

    assert len(loaded) == 1
    assert loaded[0].credential_id == added.credential_id
    assert loaded[0].credential_data == credential_data
    assert loaded[0].name == "MacBook Touch ID"
    assert loaded[0].domain == "wb.example.com"
    assert loaded[0].sign_count == 1
    assert loaded[0].last_used_at is None

    storage.update_last_use(added.credential_id, 2)
    updated = storage.get_credentials_by_user("user-id")[0]
    assert updated.sign_count == 2
    assert updated.last_used_at is not None

    assert storage.delete_credential("other-user", added.credential_id) is False
    assert storage.delete_credential("user-id", added.credential_id) is True
    assert storage.get_credentials_by_user("user-id") == []


def test_get_credential_by_id_finds_owner(storage):
    credential_data = make_credential()
    storage.add_credential("user-id", "MacBook Touch ID", "wb.example.com", credential_data, 1)

    found = storage.get_credential_by_id(credential_data.credential_id)

    assert found is not None
    assert found.user_id == "user-id"
    assert found.domain == "wb.example.com"
    assert found.credential_data == credential_data


def test_get_credential_by_id_unknown(storage):
    assert storage.get_credential_by_id(b"never-registered") is None


def test_has_any_credentials(storage):
    assert storage.has_any_credentials() is False

    storage.add_credential("user-id", "MacBook Touch ID", "wb.example.com", make_credential(), 1)

    assert storage.has_any_credentials() is True


def test_credentials_storage_deletes_all_credentials_for_user(storage):
    storage.add_credential("user-id", "First", "wb.example.com", make_credential(b"first"), 0)
    storage.add_credential("user-id", "Second", "wb.example.com", make_credential(b"second"), 0)

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


def test_authentication_options_unscoped(storage):
    """No credentials list is passed, so the browser can offer any resident
    credential for this rp_id without the server naming a login upfront."""
    service = WebAuthnService("wb.example.com", "https://wb.example.com", storage)

    ceremony = service.begin_authentication()

    assert "allowCredentials" not in ceremony["options"]["publicKey"]
    assert json_dumps(ceremony)


def test_authentication_unknown_credential(storage):
    """Simulates an assertion for a credential id the server has never stored —
    the discoverable flow must still reject it instead of trusting the client."""
    rp_id = "wb.example.com"
    origin = "https://wb.example.com"
    service = WebAuthnService(rp_id, origin, storage)
    authentication = service.begin_authentication()
    client_data = CollectedClientData.create(
        CollectedClientData.TYPE.GET,
        authentication["options"]["publicKey"]["challenge"],
        origin,
    )
    auth_data = AuthenticatorData.create(
        hashlib.sha256(rp_id.encode()).digest(),
        AuthenticatorData.FLAG.UP | AuthenticatorData.FLAG.UV,
        1,
    )

    with pytest.raises(ValueError, match="Unknown credential"):
        service.complete_authentication(
            authentication["challenge_id"],
            {
                "id": websafe_encode(b"never-registered"),
                "rawId": websafe_encode(b"never-registered"),
                "type": "public-key",
                "response": {
                    "clientDataJSON": websafe_encode(bytes(client_data)),
                    "authenticatorData": websafe_encode(bytes(auth_data)),
                    "signature": websafe_encode(b"sig"),
                    "userHandle": None,
                },
            },
        )


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


def complete_authentication(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    service, user, credential_data, private_key, relying_party, sign_count=1
):
    rp_id, origin = relying_party
    authentication = service.begin_authentication()
    client_data = CollectedClientData.create(
        CollectedClientData.TYPE.GET,
        authentication["options"]["publicKey"]["challenge"],
        origin,
    )
    authentication_auth_data = AuthenticatorData.create(
        hashlib.sha256(rp_id.encode()).digest(),
        AuthenticatorData.FLAG.UP | AuthenticatorData.FLAG.UV,
        sign_count,
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
    assert registered.domain == rp_id
    assert authenticated_user_id == user.user_id
    assert authenticated_credential.credential_id == credential_data.credential_id
    assert storage.get_credentials_by_user(user.user_id)[0].sign_count == 1


def test_authentication_stale_sign_counter(storage):
    """A cloned authenticator replays the same (or a lower) counter value —
    this is the WebAuthn clone-detection check and must reject the login."""
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
    complete_registration(service, user, credential_data, origin, rp_id)
    complete_authentication(service, user, credential_data, private_key, (rp_id, origin), sign_count=5)

    with pytest.raises(ValueError, match="Credential sign counter did not increase"):
        complete_authentication(service, user, credential_data, private_key, (rp_id, origin), sign_count=5)

    assert storage.get_credentials_by_user(user.user_id)[0].sign_count == 5


def test_credential_registered_on_one_lan_subdomain_authenticates_from_another(storage):
    """The whole point of rp_id being the registrable-domain parent: a passkey registered via
    one LAN-IP-mapped subdomain of `{sn}.ip.wirenboard.com` keeps authenticating from a
    different one, with no Related Origin Requests involved."""
    rp_id = "sn123.ip.wirenboard.com"
    registration_origin = "https://192-168-1-39.sn123.ip.wirenboard.com"
    login_origin = "https://10-200-200-1.sn123.ip.wirenboard.com"
    service = WebAuthnService(rp_id, registration_origin, storage)
    user = User("user-id", "admin", "hash", UserType.ADMIN, False)
    private_key = ec.generate_private_key(ec.SECP256R1())
    credential_data = AttestedCredentialData.create(
        Aaguid.NONE,
        b"credential-id",
        ES256.from_cryptography_key(private_key.public_key()),
    )
    complete_registration(service, user, credential_data, registration_origin, rp_id)

    authenticated_user_id, authenticated_credential = complete_authentication(
        service, user, credential_data, private_key, (rp_id, login_origin)
    )

    assert authenticated_user_id == user.user_id
    assert authenticated_credential.credential_id == credential_data.credential_id


def test_authentication_rejects_credential_registered_under_a_different_domain(storage):
    """Defense-in-depth: even though Fido2Server's own rp_id check would likely already catch
    a true cross-domain mismatch, a credential whose stored domain doesn't match the current
    service's rp_id must still be rejected explicitly."""
    rp_id = "wb.example.com"
    origin = "https://wb.example.com"
    service = WebAuthnService(rp_id, origin, storage)
    user = User("user-id", "admin", "hash", UserType.ADMIN, False)
    private_key = ec.generate_private_key(ec.SECP256R1())
    credential_data = make_credential()
    complete_registration(service, user, credential_data, origin, rp_id)
    # Simulate the credential having been registered under the other domain class.
    storage.db_connection.execute(
        "UPDATE webauthn_credentials SET domain = ? WHERE credential_id = ?",
        ("wb.http.wirenboard.cloud", credential_data.credential_id),
    )
    storage.db_connection.commit()

    with pytest.raises(ValueError, match="different domain"):
        complete_authentication(service, user, credential_data, private_key, (rp_id, origin))


def test_accepts_origin_allows_any_https_subdomain_of_rp_id(storage):
    service = WebAuthnService(
        "sn123.ip.wirenboard.com", "https://192-168-1-39.sn123.ip.wirenboard.com", storage
    )

    assert service.accepts_origin("https://192-168-1-39.sn123.ip.wirenboard.com") is True
    assert service.accepts_origin("https://10-200-200-1.sn123.ip.wirenboard.com") is True
    assert service.accepts_origin("https://sn123.ip.wirenboard.com") is True
    assert service.accepts_origin("https://unrelated.example.org") is False
    assert service.accepts_origin("http://192-168-1-39.sn123.ip.wirenboard.com") is False


@pytest.mark.parametrize(
    "sn,expected",
    [
        ("sn123", "sn123.ip.wirenboard.com"),
        ("  Mixed-Case-SN  ", "mixed-case-sn.ip.wirenboard.com"),
    ],
)
def test_lan_rp_id(sn, expected):
    assert lan_rp_id(sn) == expected


def test_cloud_rp_id():
    assert cloud_rp_id("Mixed-Case-SN", "wirenboard.cloud") == "mixed-case-sn.http.wirenboard.cloud"


@pytest.mark.parametrize(
    "host,candidates,expected",
    [
        ("sn123.ip.wirenboard.com", ["sn123.ip.wirenboard.com"], "sn123.ip.wirenboard.com"),
        (
            "192-168-1-39.sn123.ip.wirenboard.com",
            ["sn123.ip.wirenboard.com"],
            "sn123.ip.wirenboard.com",
        ),
        (
            "sn123.http.wirenboard.cloud",
            ["sn123.ip.wirenboard.com", "sn123.http.wirenboard.cloud"],
            "sn123.http.wirenboard.cloud",
        ),
        ("10.200.200.1", ["sn123.ip.wirenboard.com"], None),
        ("unrelated.example.org", ["sn123.ip.wirenboard.com"], None),
        # A domain that merely ends with the candidate's characters, not an actual subdomain
        # of it, must not match.
        ("evilsn123.ip.wirenboard.com", ["sn123.ip.wirenboard.com"], None),
        ("anything", [], None),
    ],
)
def test_match_rp_id(host, candidates, expected):
    assert match_rp_id(host, candidates) == expected


def write_frpc_conf(providers_dir: Path, provider: str, *, http_section=True, type_="tcp", local_port="80"):
    provider_dir = providers_dir / provider
    provider_dir.mkdir(parents=True, exist_ok=True)
    lines = ["[common]", "server_addr = example.com", ""]
    if http_section:
        lines += ["[http]", f"type = {type_}", f"local_port = {local_port}", ""]
    (provider_dir / "frpc.conf").write_text("\n".join(lines), encoding="utf-8")


def test_discover_cloud_providers_filters_to_http_port_80_tunnels(tmp_path):
    write_frpc_conf(tmp_path, "wirenboard.cloud")
    write_frpc_conf(tmp_path, "other-service", local_port="8080")
    write_frpc_conf(tmp_path, "no-http-section", http_section=False)
    (tmp_path / "not-a-dir.txt").write_text("x", encoding="utf-8")

    with patch("wb.homeui_backend.webauthn.CLOUD_PROVIDERS_DIR", str(tmp_path)):
        assert discover_cloud_providers() == ["wirenboard.cloud"]


def test_discover_cloud_providers_missing_directory_returns_empty():
    with patch("wb.homeui_backend.webauthn.CLOUD_PROVIDERS_DIR", "/this/does/not/exist"):
        assert not discover_cloud_providers()


@pytest.mark.parametrize(
    "stdout,returncode,expected",
    [
        ("active\n", 0, True),
        ("inactive\n", 3, False),
        ("unknown\n", 4, False),
    ],
)
def test_is_cloud_tunnel_active_reflects_systemctl_output(stdout, returncode, expected):
    completed = subprocess.CompletedProcess(args=[], returncode=returncode, stdout=stdout, stderr="")
    with patch("wb.homeui_backend.webauthn.subprocess.run", return_value=completed) as run_mock:
        assert is_cloud_tunnel_active("wirenboard.cloud") is expected
    run_mock.assert_called_once()
    assert run_mock.call_args.args[0] == [
        "/usr/bin/systemctl",
        "is-active",
        "wb-cloud-agent-frpc@wirenboard.cloud.service",
    ]


def test_is_cloud_tunnel_active_degrades_on_subprocess_error():
    """Missing systemctl binary, a timeout, a renamed unit, ... must report "not active" --
    this is an internal wb-cloud-agent detail, not a public contract, so it must never raise."""
    with patch("wb.homeui_backend.webauthn.subprocess.run", side_effect=OSError("no such file")):
        assert is_cloud_tunnel_active("wirenboard.cloud") is False


def test_active_cloud_rp_ids_only_includes_providers_with_an_active_tunnel():
    with (
        patch("wb.homeui_backend.webauthn.discover_cloud_providers", return_value=["a", "b"]),
        patch("wb.homeui_backend.webauthn.is_cloud_tunnel_active", side_effect=lambda p: p == "b"),
    ):
        assert active_cloud_rp_ids("SN123") == ["sn123.http.b"]
