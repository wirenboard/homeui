#!/usr/bin/env python3

from datetime import datetime, timezone
import json
from typing import List, Optional

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

    def add_entry(self, login: str, scope: str, event: dict) -> None:
        # Use context manager for atomic INSERT + DELETE (both commit or both rollback)
        with self.db_connection:
            cursor = self.db_connection.cursor()
            cursor.execute(
                "INSERT INTO audit_log (timestamp, login, scope, event) VALUES (?, ?, ?, ?)",
                (int(datetime.now(timezone.utc).timestamp()), login, scope, json.dumps(event)),
            )
            cursor.execute(
                "DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY id DESC LIMIT 1000)"
            )

    def get_entries(
        self,
        limit: int = 100,
        offset: int = 0,
        login_filter: Optional[str] = None,
        scope_filter: Optional[str] = None,
    ) -> List[dict]:
        cursor = self.db_connection.cursor()
        conditions = []
        params = []

        if login_filter:
            conditions.append("login = ?")
            params.append(login_filter)

        if scope_filter:
            conditions.append("scope = ?")
            params.append(scope_filter)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = f"SELECT id, timestamp, login, scope, event FROM audit_log {where} ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cursor.execute(query, tuple(params))
        entries = []
        for row in cursor.fetchall():
            raw_event = row[4]
            event: dict
            try:
                parsed_event = json.loads(raw_event)
                if isinstance(parsed_event, dict):
                    event = parsed_event
                else:
                    event = {"text": str(raw_event)}
            except Exception:  # pylint: disable=broad-exception-caught
                event = {"text": str(raw_event)}

            entries.append(
                {
                    "id": row[0],
                    "timestamp": row[1],
                    "login": row[2],
                    "scope": row[3],
                    "event": event,
                }
            )
        return entries

    def get_total_count(self, login_filter: Optional[str] = None, scope_filter: Optional[str] = None) -> int:
        cursor = self.db_connection.cursor()
        conditions = []
        params = []

        if login_filter:
            conditions.append("login = ?")
            params.append(login_filter)

        if scope_filter:
            conditions.append("scope = ?")
            params.append(scope_filter)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = f"SELECT COUNT(*) FROM audit_log {where}"
        cursor.execute(query, tuple(params))
        return cursor.fetchone()[0]

    def get_filter_options(self) -> dict:
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT DISTINCT login FROM audit_log ORDER BY login")
        users = [row[0] for row in cursor.fetchall()]
        cursor.execute("SELECT DISTINCT scope FROM audit_log ORDER BY scope")
        scopes = [row[0] for row in cursor.fetchall()]
        return {"users": users, "scopes": scopes}
