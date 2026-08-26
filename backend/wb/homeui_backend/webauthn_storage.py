#!/usr/bin/env python3

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from fido2.webauthn import AttestedCredentialData


@dataclass(frozen=True)
class WebAuthnCredential:
    credential_id: bytes
    user_id: str
    name: str
    credential_data: AttestedCredentialData
    sign_count: int
    created_at: datetime
    last_used_at: Optional[datetime]


class WebAuthnCredentialsStorage:
    def __init__(self, db_connection):
        self.db_connection = db_connection

    def add_credential(
        self,
        user_id: str,
        name: str,
        credential_data: AttestedCredentialData,
        sign_count: int,
    ) -> WebAuthnCredential:
        now = datetime.now(timezone.utc)
        cursor = self.db_connection.cursor()
        cursor.execute(
            (
                "INSERT INTO webauthn_credentials "
                "(credential_id, user_id, name, credential_data, sign_count, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)"
            ),
            (
                credential_data.credential_id,
                user_id,
                name,
                bytes(credential_data),
                sign_count,
                int(now.timestamp()),
            ),
        )
        self.db_connection.commit()
        return WebAuthnCredential(
            credential_data.credential_id,
            user_id,
            name,
            credential_data,
            sign_count,
            now,
            None,
        )

    def get_credentials_by_user(self, user_id: str) -> list[WebAuthnCredential]:
        cursor = self.db_connection.cursor()
        cursor.execute(
            (
                "SELECT credential_id, name, credential_data, sign_count, created_at, last_used_at "
                "FROM webauthn_credentials WHERE user_id = ? ORDER BY created_at"
            ),
            (user_id,),
        )
        return [self._from_row(user_id, row) for row in cursor.fetchall()]

    def update_last_use(self, credential_id: bytes, sign_count: int) -> None:
        cursor = self.db_connection.cursor()
        cursor.execute(
            "UPDATE webauthn_credentials SET sign_count = ?, last_used_at = ? WHERE credential_id = ?",
            (sign_count, int(datetime.now(timezone.utc).timestamp()), credential_id),
        )
        self.db_connection.commit()

    def delete_credential(self, user_id: str, credential_id: bytes) -> bool:
        cursor = self.db_connection.cursor()
        cursor.execute(
            "DELETE FROM webauthn_credentials WHERE user_id = ? AND credential_id = ?",
            (user_id, credential_id),
        )
        self.db_connection.commit()
        return cursor.rowcount == 1

    def delete_credentials_by_user(self, user_id: str) -> None:
        cursor = self.db_connection.cursor()
        cursor.execute("DELETE FROM webauthn_credentials WHERE user_id = ?", (user_id,))
        self.db_connection.commit()

    @staticmethod
    def _from_row(user_id: str, row) -> WebAuthnCredential:
        last_used_at = None
        if row[5] is not None:
            last_used_at = datetime.fromtimestamp(row[5], tz=timezone.utc)
        return WebAuthnCredential(
            bytes(row[0]),
            user_id,
            row[1],
            AttestedCredentialData(bytes(row[2])),
            row[3],
            datetime.fromtimestamp(row[4], tz=timezone.utc),
            last_used_at,
        )
