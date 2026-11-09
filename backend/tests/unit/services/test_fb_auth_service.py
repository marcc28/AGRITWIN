from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from fastapi import HTTPException

from services import fb_auth_service as fb


@pytest.fixture(autouse=True)
def configured_facebook_env(monkeypatch):
    monkeypatch.setattr(fb, "FB_CLIENT_ID", "client-id")
    monkeypatch.setattr(fb, "FB_CLIENT_SECRET", "client-secret")
    monkeypatch.setattr(fb, "FB_REDIRECT_URI", "https://localhost:8081/callback")
    monkeypatch.setattr(fb, "FB_GRAPH_VERSION", "v21.0")


def make_httpx_client_mock(responses):
    client = AsyncMock()
    client.get = AsyncMock(side_effect=responses)

    context_manager = MagicMock()
    context_manager.__aenter__ = AsyncMock(return_value=client)
    context_manager.__aexit__ = AsyncMock(return_value=None)

    client_factory = MagicMock(return_value=context_manager)
    return client, client_factory


def test_authorization_url_contains_required_parameters():
    url = fb.FacebookAuthService.authorization_url("state-value")

    assert url.startswith(
        "https://www.facebook.com/v21.0/dialog/oauth?"
    )
    assert "client_id=client-id" in url
    assert "redirect_uri=https%3A%2F%2Flocalhost%3A8081%2Fcallback" in url
    assert "response_type=code" in url
    assert "scope=email%2Cpublic_profile" in url
    assert "state=state-value" in url


def test_authorization_url_requires_configuration(monkeypatch):
    monkeypatch.setattr(fb, "FB_CLIENT_ID", None)

    with pytest.raises(HTTPException) as exc:
        fb.FacebookAuthService.authorization_url("state-value")

    assert exc.value.status_code == 503
    assert exc.value.detail == "Facebook OAuth is not configured"


@pytest.mark.asyncio
async def test_fetch_identity_exchanges_code_and_returns_identity(monkeypatch):
    token_response = MagicMock()
    token_response.raise_for_status = MagicMock()
    token_response.json.return_value = {
        "access_token": "facebook-token",
    }

    user_response = MagicMock()
    user_response.raise_for_status = MagicMock()
    user_response.json.return_value = {
        "id": "fb-123",
        "name": "Test User",
        "email": "user@example.com",
    }

    client, client_factory = make_httpx_client_mock(
        [token_response, user_response]
    )

    monkeypatch.setattr(fb.httpx, "AsyncClient", client_factory)

    identity = await fb.FacebookAuthService.fetch_identity("auth-code")

    assert identity == {
        "id": "fb-123",
        "name": "Test User",
        "email": "user@example.com",
    }

    client_factory.assert_called_once_with(timeout=10.0)

    token_call = client.get.call_args_list[0]
    assert token_call.args[0] == (
        "https://graph.facebook.com/v21.0/oauth/access_token"
    )
    assert token_call.kwargs["params"] == {
        "client_id": "client-id",
        "client_secret": "client-secret",
        "redirect_uri": "https://localhost:8081/callback",
        "code": "auth-code",
    }

    user_call = client.get.call_args_list[1]
    assert user_call.args[0] == "https://graph.facebook.com/v21.0/me"
    assert user_call.kwargs["params"] == {
        "fields": "id,name,email",
        "access_token": "facebook-token",
    }


@pytest.mark.asyncio
async def test_fetch_identity_requires_configuration(monkeypatch):
    monkeypatch.setattr(fb, "FB_CLIENT_SECRET", None)

    with pytest.raises(HTTPException) as exc:
        await fb.FacebookAuthService.fetch_identity("auth-code")

    assert exc.value.status_code == 503
    assert exc.value.detail == "Facebook OAuth is not configured"


@pytest.mark.asyncio
async def test_fetch_identity_raises_when_access_token_missing(monkeypatch):
    token_response = MagicMock()
    token_response.raise_for_status = MagicMock()
    token_response.json.return_value = {}

    client, client_factory = make_httpx_client_mock([token_response])

    monkeypatch.setattr(fb.httpx, "AsyncClient", client_factory)

    with pytest.raises(HTTPException) as exc:
        await fb.FacebookAuthService.fetch_identity("auth-code")

    assert exc.value.status_code == 502
    assert exc.value.detail == "Facebook access token missing"


@pytest.mark.asyncio
async def test_fetch_identity_handles_http_status_error(monkeypatch):
    request = httpx.Request(
        "GET",
        "https://graph.facebook.com/v21.0/oauth/access_token",
    )

    response = httpx.Response(
        400,
        request=request,
        json={"error": "invalid_code"},
    )

    error = httpx.HTTPStatusError(
        "Bad response",
        request=request,
        response=response,
    )

    client, client_factory = make_httpx_client_mock([error])
    monkeypatch.setattr(fb.httpx, "AsyncClient", client_factory)

    with pytest.raises(HTTPException) as exc:
        await fb.FacebookAuthService.fetch_identity("bad-code")

    assert exc.value.status_code == 502
    assert exc.value.detail == "Facebook returned an authentication error"


@pytest.mark.asyncio
async def test_fetch_identity_handles_request_error(monkeypatch):
    client, client_factory = make_httpx_client_mock(
        [httpx.ConnectError("connection failed")]
    )

    monkeypatch.setattr(fb.httpx, "AsyncClient", client_factory)

    with pytest.raises(HTTPException) as exc:
        await fb.FacebookAuthService.fetch_identity("auth-code")

    assert exc.value.status_code == 502
    assert exc.value.detail == "Could not communicate with Facebook"


@pytest.mark.asyncio
async def test_fetch_identity_requires_facebook_id(monkeypatch):
    token_response = MagicMock()
    token_response.raise_for_status = MagicMock()
    token_response.json.return_value = {
        "access_token": "facebook-token",
    }

    user_response = MagicMock()
    user_response.raise_for_status = MagicMock()
    user_response.json.return_value = {
        "name": "Test User",
        "email": "user@example.com",
    }

    client, client_factory = make_httpx_client_mock(
        [token_response, user_response]
    )

    monkeypatch.setattr(fb.httpx, "AsyncClient", client_factory)

    with pytest.raises(HTTPException) as exc:
        await fb.FacebookAuthService.fetch_identity("auth-code")

    assert exc.value.status_code == 502
    assert exc.value.detail == "Facebook account information is incomplete"