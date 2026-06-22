from datetime import datetime, timedelta

import pytest
from wb.homeui_backend.rate_limiter import RateLimiter


def test_first_call_allows():
    rl = RateLimiter()
    now = datetime.now()
    assert rl.check_call("api/test", now, 5) is True


@pytest.mark.parametrize(
    "limit,expected",
    [
        (None, True),
        (0, True),
        (-1, True),
    ],
)
def test_limits_allow(limit, expected):
    rl = RateLimiter()
    now = datetime.now()
    for _ in range(100):
        assert rl.check_call("api/test", now, limit) is expected


def test_within_limit_allows():
    rl = RateLimiter()
    now = datetime.now()
    for _ in range(5):
        assert rl.check_call("api/test", now, 5) is True


def test_exceed_limit_denies():
    rl = RateLimiter()
    now = datetime.now()
    for _ in range(5):
        assert rl.check_call("api/test", now, 5) is True
    assert rl.check_call("api/test", now, 5) is False


def test_reset_after_interval():
    rl = RateLimiter()
    now = datetime.now()
    for _ in range(5):
        assert rl.check_call("api/test", now, 5) is True
    # Exceed limit
    assert rl.check_call("api/test", now, 5) is False
    # After 61 seconds, should reset
    later = now + timedelta(seconds=61)
    assert rl.check_call("api/test", later, 5) is True


def test_multiple_endpoints_independent():
    rl = RateLimiter()
    now = datetime.now()
    for _ in range(5):
        assert rl.check_call("api/one", now, 5) is True
        assert rl.check_call("api/two", now, 5) is True
    assert rl.check_call("api/one", now, 5) is False
    assert rl.check_call("api/two", now, 5) is False
