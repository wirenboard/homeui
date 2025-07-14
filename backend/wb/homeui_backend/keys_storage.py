#!/usr/bin/env python3

import secrets
import string


class KeysStorage:
    def __init__(self, db_connection) -> None:
        self.db_connection = db_connection
        cursor = db_connection.cursor()
        cursor.execute("CREATE TABLE IF NOT EXISTS keys (key TEXT NOT NULL)")
        db_connection.commit()

    def make_key(self) -> str:
        alphabet = string.ascii_letters + string.digits + string.punctuation
        key = "".join(secrets.choice(alphabet) for _ in range(32))
        return key

    def store_key(self, key: str) -> None:
        cursor = self.db_connection.cursor()
        cursor.execute("INSERT INTO keys (key) VALUES (?)", (key,))
        self.db_connection.commit()

    def get_key(self) -> str:
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT key FROM keys")
        result = cursor.fetchone()
        if result is not None:
            return result[0]
        key = self.make_key()
        self.store_key(key)
        return key
