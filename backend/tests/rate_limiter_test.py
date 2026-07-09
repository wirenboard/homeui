from datetime import datetime, timedelta

import pytest
from wb.homeui_backend.rate_limiter import MAX_TRACKED_KEYS, RateLimiter


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


def test_stale_buckets_dropped_when_full():
    rl = RateLimiter()
    now = datetime.now()
    for i in range(MAX_TRACKED_KEYS):
        rl.check_call(f"auth/check|10.0.{i // 256}.{i % 256}", now, 5)
    assert len(rl.calls) == MAX_TRACKED_KEYS
    later = now + timedelta(seconds=61)
    assert rl.check_call("auth/check|10.1.0.1", later, 5) is True
    assert len(rl.calls) == 1


def test_prune_keeps_active_buckets():
    rl = RateLimiter()
    now = datetime.now()
    for i in range(MAX_TRACKED_KEYS - 1):
        rl.check_call(f"auth/check|10.0.{i // 256}.{i % 256}", now, 5)
    active_time = now + timedelta(seconds=30)
    for _ in range(3):
        rl.check_call("auth/check|active", active_time, 5)
    later = now + timedelta(seconds=61)
    assert rl.check_call("auth/check|new", later, 5) is True
    assert set(rl.calls) == {"auth/check|active", "auth/check|new"}
    assert rl.calls["auth/check|active"].calls_per_minute == 3


def test_flood_of_fresh_keys_stays_hard_bounded():
    """Over 10k distinct keys within one minute: the oldest bucket is evicted."""
    rl = RateLimiter()
    now = datetime.now()
    rl.check_call("auth/check|oldest", now, 5)
    for i in range(MAX_TRACKED_KEYS):
        rl.check_call(f"auth/check|10.1.{i // 256}.{i % 256}", now + timedelta(seconds=1), 5)
    assert len(rl.calls) == MAX_TRACKED_KEYS
    assert "auth/check|oldest" not in rl.calls
