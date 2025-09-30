#!/usr/bin/env python3

import uuid
from enum import Enum
from typing import Optional


class UserType(Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    USER = "user"


class User:
    def __init__(self, user_id: str, login: str, pwd_hash: str, user_type: UserType, autologin: bool):
        self.user_id: str = user_id
        self.login: str = login
        self.pwd_hash: str = pwd_hash

        self._type: UserType = user_type
        self._autologin: bool = autologin
        if not self.supports_autologin():
            self._autologin = False

    def __eq__(self, other):
        if not isinstance(other, User):
            return False
        return (
            self.user_id == other.user_id
            and self.login == other.login
            and self.pwd_hash == other.pwd_hash
            and self.type == other.type
            and self.autologin == other.autologin
        )

    @property
    def type(self) -> UserType:
        return self._type

    @type.setter
    def type(self, value: UserType):
        self._type = value
        if not self.supports_autologin():
            self.autologin = False

    @property
    def autologin(self) -> bool:
        return self._autologin

    @autologin.setter
    def autologin(self, value: bool):
        if self.supports_autologin():
            self._autologin = value

    def supports_autologin(self) -> bool:
        return self.type == UserType.USER

    def has_access_to(self, required_type: UserType) -> bool:
        if self.type == UserType.ADMIN:
            return True
        if self.type == UserType.OPERATOR:
            return required_type in [UserType.OPERATOR, UserType.USER]
        return self.type == required_type


class UsersStorage:
    def __init__(self, db_connection):
        self.db_connection = db_connection

    def add_user(self, user: User) -> None:
        cursor = self.db_connection.cursor()
        if user.autologin:
            cursor.execute("UPDATE users SET autologin=0")
        user_uuid = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO users (user_id, login, pwd_hash, type, autologin) VALUES (?, ?, ?, ?, ?)",
            (user_uuid, user.login, user.pwd_hash, user.type.value, 1 if user.autologin else 0),
        )
        self.db_connection.commit()
        user.user_id = user_uuid

    def delete_user(self, user_id: str) -> None:
        cursor = self.db_connection.cursor()
        cursor.execute("DELETE FROM users WHERE user_id=?", (user_id,))
        self.db_connection.commit()

    def update_user(self, user: User) -> None:
        cursor = self.db_connection.cursor()
        if user.autologin:
            cursor.execute("UPDATE users SET autologin=0")
        cursor.execute(
            "UPDATE users SET login=?, pwd_hash=?, type=?, autologin=? WHERE user_id=?",
            (user.login, user.pwd_hash, user.type.value, user.autologin, user.user_id),
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
        cursor.execute("SELECT user_id, pwd_hash, type, autologin FROM users WHERE login=?", (user_login,))
        result = cursor.fetchone()
        if result is not None:
            return User(result[0], user_login, result[1], UserType(result[2]), result[3] == 1)
        return None

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        if user_id is None:
            return None
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT login, pwd_hash, type, autologin FROM users WHERE user_id=?", (user_id,))
        result = cursor.fetchone()
        if result is not None:
            return User(user_id, result[0], result[1], UserType(result[2]), result[3] == 1)
        return None

    def count_users_by_type(self, user_type: UserType) -> int:
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM users WHERE type=?", (user_type.value,))
        return cursor.fetchone()[0]

    def get_users(self):
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT user_id, login, type, autologin FROM users")
        return [
            User(user_id, login, "", UserType(type), autologin == 1)
            for user_id, login, type, autologin in cursor.fetchall()
        ]

    def get_autologin_user(self) -> Optional[User]:
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT user_id, login, pwd_hash, type, autologin FROM users WHERE autologin=1")
        result = cursor.fetchone()
        if result is not None:
            return User(result[0], result[1], result[2], UserType(result[3]), result[4] == 1)
        return None
