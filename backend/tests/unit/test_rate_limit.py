from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from services import rate_limit


@pytest.fixture(autouse=True)
def clear_buckets():
    rate_limit._requests.clear()
    yield
    rate_limit._requests.clear()


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("5/second", (5, 1.0)),
        (" 2 / MINUTES ", (2, 60.0)),
        ("3/hours", (3, 3600.0)),
        ("1/day", (1, 86400.0)),
    ],
)
def test_parse_rate_limit(monkeypatch, value, expected):
    monkeypatch.setenv("AI_LIMIT_USAGE", value)
    assert rate_limit._parse_rate_limit("AI_LIMIT_USAGE", "20/minute") == expected


@pytest.mark.parametrize("value", ["0/minute", "-1/second", "abc/minute", "3/week", ""])
def test_parse_rate_limit_rejects_invalid_values(monkeypatch, value):
    monkeypatch.setenv("AI_LIMIT_USAGE", value)

    with pytest.raises(RuntimeError, match="AI_LIMIT_USAGE must use a positive rate"):
        rate_limit._parse_rate_limit("AI_LIMIT_USAGE", "20/minute")


@pytest.mark.asyncio
async def test_enforce_limit_blocks_over_limit_and_expires_old_requests(monkeypatch):
    monkeypatch.setenv("TEST_LIMIT", "2/second")
    clock = iter([10.0, 10.2, 10.3, 11.0])
    monkeypatch.setattr(
        rate_limit,
        "time",
        SimpleNamespace(monotonic=lambda: next(clock, 11.0)),
    )

    await rate_limit._enforce_limit(
        scope="test", identity="alice", env_name="TEST_LIMIT", default="1/day"
    )
    await rate_limit._enforce_limit(
        scope="test", identity="alice", env_name="TEST_LIMIT", default="1/day"
    )

    with pytest.raises(HTTPException) as exc:
        await rate_limit._enforce_limit(
            scope="test", identity="alice", env_name="TEST_LIMIT", default="1/day"
        )

    assert exc.value.status_code == 429
    assert exc.value.headers == {"Retry-After": "1"}

    await rate_limit._enforce_limit(
        scope="test", identity="alice", env_name="TEST_LIMIT", default="1/day"
    )


@pytest.mark.asyncio
async def test_enforce_limit_separates_scope_and_identity(monkeypatch):
    monkeypatch.setenv("TEST_LIMIT", "1/minute")
    monkeypatch.setattr(rate_limit, "time", SimpleNamespace(monotonic=lambda: 5.0))

    await rate_limit._enforce_limit(
        scope="ai", identity="alice", env_name="TEST_LIMIT", default="1/day"
    )
    await rate_limit._enforce_limit(
        scope="forum", identity="alice", env_name="TEST_LIMIT", default="1/day"
    )
    await rate_limit._enforce_limit(
        scope="ai", identity="bob", env_name="TEST_LIMIT", default="1/day"
    )

    with pytest.raises(HTTPException):
        await rate_limit._enforce_limit(
            scope="ai", identity="alice", env_name="TEST_LIMIT", default="1/day"
        )


@pytest.mark.asyncio
async def test_ai_limit_is_per_user(monkeypatch):
    monkeypatch.setenv("AI_LIMIT_USAGE", "1/minute")
    monkeypatch.setattr(rate_limit, "time", SimpleNamespace(monotonic=lambda: 20.0))

    await rate_limit.enforce_ai_rate_limit(SimpleNamespace(id="account-1"))
    await rate_limit.enforce_ai_rate_limit(SimpleNamespace(id="account-2"))

    with pytest.raises(HTTPException) as exc:
        await rate_limit.enforce_ai_rate_limit(SimpleNamespace(id="account-1"))

    assert exc.value.status_code == 429


@pytest.mark.asyncio
async def test_forum_limit_uses_remote_address(monkeypatch):
    monkeypatch.setenv("FORUM_RATE_LIMIT", "1/minute")
    monkeypatch.setattr(rate_limit, "time", SimpleNamespace(monotonic=lambda: 20.0))

    def request_with_client(host):
        return Request(
            {
                "type": "http",
                "http_version": "1.1",
                "method": "GET",
                "scheme": "http",
                "path": "/",
                "raw_path": b"/",
                "query_string": b"",
                "headers": [],
                "client": (host, 1234),
                "server": ("test", 80),
            }
        )

    await rate_limit.enforce_forum_rate_limit(request_with_client("192.0.2.1"))
    await rate_limit.enforce_forum_rate_limit(request_with_client("192.0.2.2"))

    with pytest.raises(HTTPException) as exc:
        await rate_limit.enforce_forum_rate_limit(request_with_client("192.0.2.1"))

    assert exc.value.status_code == 429


@pytest.mark.asyncio
async def test_forum_limit_uses_unknown_when_client_is_missing(monkeypatch):
    monkeypatch.setenv("FORUM_RATE_LIMIT", "1/minute")
    monkeypatch.setattr(rate_limit, "time", SimpleNamespace(monotonic=lambda: 20.0))
    request = Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "headers": [],
            "client": None,
            "server": ("test", 80),
        }
    )

    await rate_limit.enforce_forum_rate_limit(request)
    with pytest.raises(HTTPException):
        await rate_limit.enforce_forum_rate_limit(request)
