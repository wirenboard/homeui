#!/usr/bin/env python3

import random
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from .users_storage import User, UsersStorage


@dataclass
class Session:
    id: str
    user: User
    start_date: datetime


class SessionsStorage:
    def __init__(self, db_connection):
        self.db_connection = db_connection

    def add_session(self, user: User) -> Session:
        session = Session(id=str(random.getrandbits(128)), user=user, start_date=datetime.now(timezone.utc))
        cursor = self.db_connection.cursor()
        cursor.execute(
            "INSERT INTO sessions (session_id, user_id, start_date) VALUES (?, ?, ?)",
            (session.id, user.user_id, int(session.start_date.timestamp())),
        )
        self.db_connection.commit()
        return session

    def get_session_by_id(self, session_id: str, users_storage: UsersStorage) -> Optional[Session]:
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT user_id, start_date FROM sessions WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        if row is None:
            return None
        user_id = row[0]
        start_date = datetime.fromtimestamp(row[1], tz=timezone.utc)
        user = users_storage.get_user_by_id(user_id)
        if user is None:
            return None
        return Session(id=session_id, user=user, start_date=start_date)

    def delete_session_by_id(self, session_id: str) -> None:
        cursor = self.db_connection.cursor()
        cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        self.db_connection.commit()

    def delete_sessions_by_user(self, user: User) -> None:
        cursor = self.db_connection.cursor()
        cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user.user_id,))
        self.db_connection.commit()

    def update_session_start_date(self, session: Session) -> None:
        cursor = self.db_connection.cursor()
        new_start_date = datetime.now(timezone.utc)
        cursor.execute(
            "UPDATE sessions SET start_date = ? WHERE session_id = ?",
            (int(new_start_date.timestamp()), session.id),
        )
        self.db_connection.commit()
        session.start_date = new_start_date
