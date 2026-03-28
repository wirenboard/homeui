#!/usr/bin/env python3

from datetime import datetime, timezone
import json

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


class AuditLogStorage:
    def __init__(self, db_connection):
        self.db_connection = db_connection

    def add_entry(self, login: str, action: str, argument: dict) -> None:
        # Use context manager for atomic INSERT + DELETE (both commit or both rollback)
        with self.db_connection:
            cursor = self.db_connection.cursor()
            cursor.execute(
                "INSERT INTO audit_log (timestamp, login, action, argument) VALUES (?, ?, ?, ?)",
                (int(datetime.now(timezone.utc).timestamp()), login, action, json.dumps(argument)),
            )
            cursor.execute(
                "DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY id DESC LIMIT 1000)"
            )

    def get_entries(self, limit: int = 100, offset: int = 0) -> list[dict]:
        cursor = self.db_connection.cursor()
        cursor.execute(
            "SELECT id, timestamp, login, action, argument FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        entries = []
        for row in cursor.fetchall():
            raw_argument = row[4]
            argument: dict
            try:
                parsed_argument = json.loads(raw_argument)
                if isinstance(parsed_argument, dict):
                    argument = parsed_argument
                else:
                    argument = {"type": "action", "text": str(raw_argument)}
            except Exception:  # pylint: disable=broad-exception-caught
                argument = {"type": "action", "text": str(raw_argument)}

            entries.append(
                {
                    "id": row[0],
                    "timestamp": row[1],
                    "login": row[2],
                    "action": row[3],
                    "argument": argument,
                }
            )
        return entries

    def get_total_count(self) -> int:
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM audit_log")
        return cursor.fetchone()[0]
