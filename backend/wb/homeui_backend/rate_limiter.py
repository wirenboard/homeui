from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class CallStatistics:
    endpoint: str
    interval_start_time: datetime
    calls_per_minute: int = 1


class RateLimiter:
    def __init__(self):
        self.calls: dict[str, CallStatistics] = {}

    def check_call(self, endpoint: str, current_time: datetime, call_per_minute_limit: Optional[int]) -> bool:
        if call_per_minute_limit is None or call_per_minute_limit <= 0:
            return True

        if endpoint not in self.calls:
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
