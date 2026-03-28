#!/usr/bin/env python3

from datetime import datetime, timezone


class AuthLogStorage:
    def __init__(self, db_connection):
        self.db_connection = db_connection

    def add_entry(self, login: str, success: bool, ip: str, user_agent: str) -> None:
        # Truncate login to 255 chars to prevent log pollution from malicious input
        login_to_log = login[:255]
        # Use context manager for atomic INSERT + DELETE (both commit or both rollback)
        with self.db_connection:
            cursor = self.db_connection.cursor()
            cursor.execute(
                "INSERT INTO auth_log (timestamp, login, success, ip, user_agent) VALUES (?, ?, ?, ?, ?)",
                (int(datetime.now(timezone.utc).timestamp()), login_to_log, int(success), ip, user_agent),
            )
            cursor.execute(
                "DELETE FROM auth_log WHERE id NOT IN (SELECT id FROM auth_log ORDER BY id DESC LIMIT 1000)"
            )

    def get_entries(self, limit: int = 100, offset: int = 0) -> list[dict]:
        cursor = self.db_connection.cursor()
        cursor.execute(
            (
                "SELECT id, timestamp, login, success, ip, user_agent "
                "FROM auth_log ORDER BY id DESC LIMIT ? OFFSET ?"
            ),
            (limit, offset),
        )
        return [
            {
                "id": row[0],
                "timestamp": row[1],
                "login": row[2],
                "success": bool(row[3]),
                "ip": row[4],
                "user_agent": row[5],
            }
            for row in cursor.fetchall()
        ]

    def get_total_count(self) -> int:
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM auth_log")
        return cursor.fetchone()[0]
