#!/usr/bin/env python3

import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class UserType(Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    USER = "user"


@dataclass
class User:
    user_id: str
    login: str
    pwd_hash: str
    type: UserType

    def has_access_to(self, required_type: UserType) -> bool:
        if self.type == UserType.ADMIN:
            return True
        if self.type == UserType.OPERATOR:
            return required_type in [UserType.OPERATOR, UserType.USER]
        return self.type == required_type


class UsersStorage:
    def __init__(self, db_connection):
        self.db_connection = db_connection
        cursor = db_connection.cursor()
        cursor.execute(
            "CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY NOT NULL, login TEXT UNIQUE NOT NULL, pwd_hash TEXT NOT NULL, type TEXT NOT NULL)"
        )
        db_connection.commit()

    def add_user(self, user: User) -> None:
        cursor = self.db_connection.cursor()
        user_uuid = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO users (user_id, login, pwd_hash, type) VALUES (?, ?, ?, ?)",
            (user_uuid, user.login, user.pwd_hash, user.type.value),
        )
        self.db_connection.commit()
        user.user_id = user_uuid

    def delete_user(self, user_id: str) -> None:
        cursor = self.db_connection.cursor()
        cursor.execute("DELETE FROM users WHERE user_id=?", (user_id,))
        self.db_connection.commit()

    def update_user(self, user: User) -> None:
        cursor = self.db_connection.cursor()
        cursor.execute(
            "UPDATE users SET login=?, pwd_hash=?, type=? WHERE user_id=?",
            (user.login, user.pwd_hash, user.type.value, user.user_id),
        )
        self.db_connection.commit()

    def has_users(self) -> bool:
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT EXISTS (SELECT 1 FROM users)")
        return cursor.fetchone()[0] == 1

    def get_user_by_login(self, user_login: str) -> Optional[User]:
        if user_login is None:
            return None
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT user_id, pwd_hash, type FROM users WHERE login=?", (user_login,))
        result = cursor.fetchone()
        if result is not None:
            return User(result[0], user_login, result[1], UserType(result[2]))
        return None

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        if user_id is None:
            return None
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT login, pwd_hash, type FROM users WHERE user_id=?", (user_id,))
        result = cursor.fetchone()
        if result is not None:
            return User(user_id, result[0], result[1], UserType(result[2]))
        return None

    def count_users_by_type(self, user_type: UserType) -> int:
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM users WHERE type=?", (user_type.value,))
        return cursor.fetchone()[0]

    def get_users(self):
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT user_id, login, type FROM users")
        return [User(user_id, login, "", UserType(type)) for user_id, login, type in cursor.fetchall()]
