from unittest.mock import MagicMock


def make_placeholder_context_deps():
    """Return the context deps that handler tests don't exercise (mock placeholders)."""
    return {
        "sn": "",
        "users_storage": MagicMock(),
        "sessions_storage": MagicMock(),
        "certificate_thread": MagicMock(),
        "security_check_thread": MagicMock(),
    }
