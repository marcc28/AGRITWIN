import os
import re
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status

from api.v1.auth import get_current_user

_WINDOW_SECONDS = {
    "second": 1,
    "minute": 60,
    "hour": 3600,
    "day": 86400,
}
_RATE_PATTERN = re.compile(r"^\s*(\d+)\s*/\s*(second|minute|hour|day)s?\s*$", re.I)
_requests: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def _parse_rate_limit(env_name: str, default: str) -> tuple[int, float]:
    value = os.getenv(env_name, default)
    match = _RATE_PATTERN.fullmatch(value)
    if not match or int(match.group(1)) < 1:
        raise RuntimeError(f"{env_name} must use a positive rate such as '20/minute'")

    limit = int(match.group(1))
    window = float(_WINDOW_SECONDS[match.group(2).lower()])
    return limit, window


async def _enforce_limit(
    *,
    scope: str,
    identity: str,
    env_name: str,
    default: str,
) -> None:
    limit, window = _parse_rate_limit(env_name, default)
    now = time.monotonic()
    bucket = _requests[(scope, identity)]

    while bucket and now - bucket[0] >= window:
        bucket.popleft()

    if len(bucket) >= limit:
        retry_after = max(1, int(window - (now - bucket[0])))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    bucket.append(now)


async def enforce_ai_rate_limit(
    current_user=Depends(get_current_user),
) -> None:
    # Authenticated recommendation endpoints are limited per account.
    await _enforce_limit(
        scope="ai",
        identity=str(current_user.id),
        env_name="AI_LIMIT_USAGE",
        default="20/minute",
    )


async def enforce_forum_rate_limit(request: Request) -> None:
    identity = request.client.host if request.client else "unknown"
    await _enforce_limit(
        scope="forum",
        identity=identity,
        env_name="FORUM_RATE_LIMIT",
        default="10/minute",
    )
