from dataclasses import dataclass
from datetime import datetime
from typing import Optional

# Past this many tracked keys, stale buckets are pruned before inserting a new one.
MAX_TRACKED_KEYS = 10000


@dataclass
class CallStatistics:
    endpoint: str
    interval_start_time: datetime
    calls_per_minute: int = 1


class RateLimiter:  # pylint: disable=too-few-public-methods
    def __init__(self):
        self.calls: dict[str, CallStatistics] = {}

    def check_call(self, endpoint: str, current_time: datetime, call_per_minute_limit: Optional[int]) -> bool:
        if call_per_minute_limit is None or call_per_minute_limit <= 0:
            return True

        if endpoint not in self.calls:
            if len(self.calls) >= MAX_TRACKED_KEYS:
                self._drop_stale(current_time)
            if len(self.calls) >= MAX_TRACKED_KEYS:
                # Nothing stale (fresh-key flood): evict the oldest bucket to stay hard-bounded.
                self.calls.pop(min(self.calls, key=lambda k: self.calls[k].interval_start_time))
            self.calls[endpoint] = CallStatistics(endpoint=endpoint, interval_start_time=current_time)
            return True

        endpoint_stats = self.calls[endpoint]

        if (current_time - endpoint_stats.interval_start_time).total_seconds() > 60:
            endpoint_stats.interval_start_time = current_time
            endpoint_stats.calls_per_minute = 1
            return True

        if endpoint_stats.calls_per_minute < call_per_minute_limit:
            endpoint_stats.calls_per_minute += 1
            return True

        return False

    def _drop_stale(self, current_time: datetime) -> None:
        self.calls = {
            key: stats
            for key, stats in self.calls.items()
            if (current_time - stats.interval_start_time).total_seconds() <= 60
        }
