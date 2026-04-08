#!/usr/bin/env python3

from datetime import datetime, timezone

# Support both ua-parser 0.x (Debian stable, API: user_agent_parser.Parse() returns dict)
# and ua-parser 1.x (pip, API: parse() returns dataclass Result).
# Normalize to a common dict format: {user_agent: {family, major, minor}, os: {...}, device: {...}}
try:
    from ua_parser import user_agent_parser as _ua_parser_legacy

    def _ua_parse(ua_string: str):
        return _ua_parser_legacy.Parse(ua_string)

except ImportError:
    try:
        from ua_parser import parse as _ua_parse_new

        def _ua_parse(ua_string: str):
            result = _ua_parse_new(ua_string)
            if result is None:
                return None
            # Convert dataclass Result to dict format used by 0.x API
            return {
                "user_agent": {
                    "family": result.user_agent.family if result.user_agent else "Other",
                    "major": result.user_agent.major if result.user_agent else None,
                    "minor": result.user_agent.minor if result.user_agent else None,
                },
                "os": {
                    "family": result.os.family if result.os else "Other",
                    "major": result.os.major if result.os else None,
                    "minor": result.os.minor if result.os else None,
                },
                "device": {
                    "family": result.device.family if result.device else "Other",
                },
            }
    except ImportError:
        def _ua_parse(_ua_string: str):
            return None


def _version_to_string(major, minor) -> str:
    if major is not None and minor is not None:
        return f"{major}.{minor}"
    if major is not None:
        return str(major)
    return ""


def format_user_agent(ua_string: str) -> str:
    try:
        result = _ua_parse(ua_string)
        if result is None:
            return ua_string[:100]

        device_family = result.get("device", {}).get("family")
        device_part = device_family if device_family and device_family != "Other" else None

        os_family = result.get("os", {}).get("family")
        os_version = _version_to_string(result.get("os", {}).get("major"), result.get("os", {}).get("minor"))
        os_part = " ".join(part for part in (os_family, os_version) if part)

        browser_family = result.get("user_agent", {}).get("family")
        browser_version = _version_to_string(
            result.get("user_agent", {}).get("major"),
            result.get("user_agent", {}).get("minor"),
        )
        browser_part = " ".join(part for part in (browser_family, browser_version) if part)

        parts = [part for part in (device_part, os_part, browser_part) if part]
        if not parts:
            return ua_string[:100]

        return " / ".join(parts)
    except Exception:
        return ua_string[:100]


class AuthLogStorage:
    def __init__(self, db_connection):
        self.db_connection = db_connection

    def add_entry(self, login: str, success: bool, ip: str, user_agent: str) -> None:
        # Truncate login to 255 chars to prevent log pollution from malicious input
        login_to_log = login[:255]
        # Parse user agent at write time so the pretty string is stored alongside the raw one
        user_agent_pretty = format_user_agent(user_agent)
        # Use context manager for atomic INSERT + DELETE (both commit or both rollback)
        with self.db_connection:
            cursor = self.db_connection.cursor()
            cursor.execute(
                "INSERT INTO auth_log (timestamp, login, success, ip, user_agent, user_agent_pretty) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (int(datetime.now(timezone.utc).timestamp()), login_to_log, int(success), ip,
                 user_agent, user_agent_pretty),
            )
            cursor.execute(
                "DELETE FROM auth_log WHERE id NOT IN (SELECT id FROM auth_log ORDER BY id DESC LIMIT 1000)"
            )

    def get_entries(self, limit: int = 100, offset: int = 0) -> list[dict]:
        cursor = self.db_connection.cursor()
        cursor.execute(
            (
                "SELECT id, timestamp, login, success, ip, user_agent, user_agent_pretty "
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
                "user_agent_pretty": row[6],
            }
            for row in cursor.fetchall()
        ]

    def get_total_count(self) -> int:
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM auth_log")
        return cursor.fetchone()[0]
