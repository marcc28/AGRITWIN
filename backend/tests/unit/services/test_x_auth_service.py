import time
from unittest.mock import AsyncMock, MagicMock
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

from fastapi import HTTPException

from services import xauth_service as x


# =========================================================
# HELPERS
# =========================================================

def make_response(
    json_data=None,
    status_code=200,
):
    response = MagicMock()

    response.json.return_value = json_data or {}
    response.status_code = status_code

    response.raise_for_status = MagicMock()

    return response


def make_http_error(status_code=400):
    request = httpx.Request(
        "POST",
        "https://api.x.com/2/oauth2/token",
    )

    response = httpx.Response(
        status_code=status_code,
        request=request,
    )

    return httpx.HTTPStatusError(
        "HTTP error",
        request=request,
        response=response,
    )


def make_request_error():
    return httpx.RequestError(
        "Connection error",
        request=httpx.Request(
            "POST",
            "https://api.x.com/2/oauth2/token",
        ),
    )


def make_async_client_mock(monkeypatch, post=None, get=None):
    client = MagicMock()

    client.post = post or AsyncMock()
    client.get = get or AsyncMock()

    context = MagicMock()

    context.__aenter__ = AsyncMock(return_value=client)
    context.__aexit__ = AsyncMock(return_value=None)

    monkeypatch.setattr(
        x.httpx,
        "AsyncClient",
        MagicMock(return_value=context),
    )

    return client


@pytest.fixture
def valid_token():
    return {
        "access_token": "access-token",
        "refresh_token": "refresh-token",
        "token_type": "bearer",
        "expires_in": 3600,
    }


@pytest.fixture
def request_mock():
    request = MagicMock()
    request.session = {}
    request.app.state = MagicMock()
    request.app.state.x_oauth_tokens = {}
    return request


# =========================================================
# AUTHORIZATION URL
# =========================================================

def test_authorization_url_success(monkeypatch):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    monkeypatch.setattr(
        x,
        "X_REDIRECT_URI",
        "https://backend.example.com/api/v1/x/callback",
    )

    url = x.XAuthService.authorization_url(
        "test-state",
        "test-challenge",
    )

    parsed = urlparse(url)
    params = parse_qs(parsed.query)

    assert parsed.scheme == "https"
    assert parsed.netloc == "x.com"
    assert parsed.path == "/i/oauth2/authorize"

    assert params["response_type"] == ["code"]
    assert params["client_id"] == ["client-id"]

    assert params["redirect_uri"] == [
        "https://backend.example.com/api/v1/x/callback"
    ]

    assert params["scope"] == [
        " ".join(x.X_SCOPES)
    ]

    assert params["state"] == ["test-state"]
    assert params["code_challenge"] == ["test-challenge"]
    assert params["code_challenge_method"] == ["S256"]


def test_authorization_url_without_client_id(monkeypatch):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        None,
    )

    with pytest.raises(HTTPException) as exc:
        x.XAuthService.authorization_url(
            "state",
            "challenge",
        )

    assert exc.value.status_code == 503
    assert exc.value.detail == "X OAuth client ID is not configured"


# =========================================================
# CLIENT AUTH
# =========================================================

def test_client_auth_with_secret(monkeypatch):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    monkeypatch.setattr(
        x,
        "X_CLIENT_SECRET",
        "client-secret",
    )

    form = {
        "grant_type": "authorization_code",
    }

    auth = x.XAuthService._client_auth(form)

    assert auth == (
        "client-id",
        "client-secret",
    )

    assert "client_id" not in form


def test_client_auth_without_secret(monkeypatch):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    monkeypatch.setattr(
        x,
        "X_CLIENT_SECRET",
        None,
    )

    form = {
        "grant_type": "authorization_code",
    }

    auth = x.XAuthService._client_auth(form)

    assert auth is None
    assert form["client_id"] == "client-id"


# =========================================================
# PREPARE TOKEN
# =========================================================

def test_prepare_token_success():
    token = {
        "access_token": "access-token",
        "expires_in": 3600,
    }

    before = time.time()

    response = x.XAuthService._prepare_token(token)

    after = time.time()

    assert response["access_token"] == "access-token"

    assert before + 3600 <= response["expires_at"] <= after + 3600


def test_prepare_token_without_expiration():
    token = {
        "access_token": "access-token",
    }

    response = x.XAuthService._prepare_token(token)

    assert response == {
        "access_token": "access-token",
    }


def test_prepare_token_without_access_token():
    with pytest.raises(HTTPException) as exc:
        x.XAuthService._prepare_token(
            {
                "refresh_token": "refresh-token",
            }
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "X did not return an access token"


# =========================================================
# EXCHANGE CODE
# =========================================================

@pytest.mark.asyncio
async def test_exchange_code_success(
    monkeypatch,
    valid_token,
):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    monkeypatch.setattr(
        x,
        "X_CLIENT_SECRET",
        "client-secret",
    )

    monkeypatch.setattr(
        x,
        "X_REDIRECT_URI",
        "https://backend.example.com/callback",
    )

    response = make_response(valid_token)

    post = AsyncMock(return_value=response)

    client = make_async_client_mock(
        monkeypatch,
        post=post,
    )

    prepare_token = MagicMock(
        return_value={
            "access_token": "access-token",
            "refresh_token": "refresh-token",
            "expires_at": 123456,
        }
    )

    monkeypatch.setattr(
        x.XAuthService,
        "_prepare_token",
        prepare_token,
    )

    result = await x.XAuthService.exchange_code(
        "authorization-code",
        "code-verifier",
    )

    assert result["access_token"] == "access-token"

    args = post.call_args.kwargs

    assert args["data"] == {
        "grant_type": "authorization_code",
        "code": "authorization-code",
        "redirect_uri": "https://backend.example.com/callback",
        "code_verifier": "code-verifier",
    }

    assert args["auth"] == (
        "client-id",
        "client-secret",
    )

    assert client.post.await_count == 1

    prepare_token.assert_called_once_with(valid_token)


@pytest.mark.asyncio
async def test_exchange_code_without_client_id(monkeypatch):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        None,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.exchange_code(
            "authorization-code",
            "verifier",
        )

    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_exchange_code_http_error(monkeypatch):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    post = AsyncMock(
        side_effect=make_http_error(400)
    )

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.exchange_code(
            "authorization-code",
            "verifier",
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "X rejected the OAuth token exchange"


@pytest.mark.asyncio
async def test_exchange_code_connection_error(monkeypatch):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    post = AsyncMock(
        side_effect=make_request_error()
    )

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.exchange_code(
            "authorization-code",
            "verifier",
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "Could not communicate with X"


@pytest.mark.asyncio
async def test_exchange_code_missing_access_token(monkeypatch):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    response = make_response(
        {
            "refresh_token": "refresh-token",
        }
    )

    post = AsyncMock(return_value=response)

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.exchange_code(
            "authorization-code",
            "verifier",
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "X did not return an access token"


# =========================================================
# REFRESH ACCESS TOKEN
# =========================================================

@pytest.mark.asyncio
async def test_refresh_access_token_success(
    monkeypatch,
):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    monkeypatch.setattr(
        x,
        "X_CLIENT_SECRET",
        "client-secret",
    )

    response = make_response(
        {
            "access_token": "new-access-token",
            "expires_in": 3600,
        }
    )

    post = AsyncMock(return_value=response)

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    result = await x.XAuthService.refresh_access_token(
        {
            "access_token": "old-access-token",
            "refresh_token": "old-refresh-token",
        }
    )

    assert result["access_token"] == "new-access-token"

    # Si X no retorna un refresh token nou,
    # es conserva l'anterior.
    assert result["refresh_token"] == "old-refresh-token"

    assert post.call_args.kwargs["data"] == {
        "grant_type": "refresh_token",
        "refresh_token": "old-refresh-token",
    }


@pytest.mark.asyncio
async def test_refresh_access_token_uses_new_refresh_token(
    monkeypatch,
):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    response = make_response(
        {
            "access_token": "new-access-token",
            "refresh_token": "new-refresh-token",
        }
    )

    post = AsyncMock(return_value=response)

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    result = await x.XAuthService.refresh_access_token(
        {
            "refresh_token": "old-refresh-token",
        }
    )

    assert result["refresh_token"] == "new-refresh-token"


@pytest.mark.asyncio
async def test_refresh_access_token_without_refresh_token():
    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.refresh_access_token(
            {
                "access_token": "access-token",
            }
        )

    assert exc.value.status_code == 401
    assert exc.value.detail == (
        "X access token expired; reconnect your account"
    )


@pytest.mark.asyncio
async def test_refresh_access_token_http_error(monkeypatch):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    post = AsyncMock(
        side_effect=make_http_error(400)
    )

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.refresh_access_token(
            {
                "refresh_token": "refresh-token",
            }
        )

    assert exc.value.status_code == 401
    assert exc.value.detail == (
        "X token refresh failed; reconnect your account"
    )


@pytest.mark.asyncio
async def test_refresh_access_token_connection_error(monkeypatch):
    monkeypatch.setattr(
        x,
        "X_CLIENT_ID",
        "client-id",
    )

    post = AsyncMock(
        side_effect=make_request_error()
    )

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.refresh_access_token(
            {
                "refresh_token": "refresh-token",
            }
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "Could not communicate with X"


# =========================================================
# ACCESS TOKEN FOR REQUEST
# =========================================================

@pytest.mark.asyncio
async def test_access_token_for_request_success(
    request_mock,
):
    request_mock.session["x_token_id"] = "token-id"

    request_mock.app.state.x_oauth_tokens = {
        "token-id": {
            "access_token": "access-token",
        }
    }

    result = await x.XAuthService.access_token_for_request(
        request_mock
    )

    assert result == "access-token"


@pytest.mark.asyncio
async def test_access_token_for_request_without_token_id(
    request_mock,
):
    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.access_token_for_request(
            request_mock
        )

    assert exc.value.status_code == 401
    assert exc.value.detail == "Connect your X account first"


@pytest.mark.asyncio
async def test_access_token_for_request_unknown_token(
    request_mock,
):
    request_mock.session["x_token_id"] = "unknown-token"

    request_mock.app.state.x_oauth_tokens = {}

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.access_token_for_request(
            request_mock
        )

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_access_token_for_request_expired_token(
    monkeypatch,
    request_mock,
):
    request_mock.session["x_token_id"] = "token-id"

    old_token = {
        "access_token": "old-access-token",
        "refresh_token": "refresh-token",
        "expires_at": 100,
    }

    request_mock.app.state.x_oauth_tokens = {
        "token-id": old_token,
    }

    monkeypatch.setattr(
        x.time,
        "time",
        MagicMock(return_value=200),
    )

    refresh = AsyncMock(
        return_value={
            "access_token": "new-access-token",
            "refresh_token": "new-refresh-token",
            "expires_at": 500,
        }
    )

    monkeypatch.setattr(
        x.XAuthService,
        "refresh_access_token",
        refresh,
    )

    result = await x.XAuthService.access_token_for_request(
        request_mock
    )

    assert result == "new-access-token"

    refresh.assert_awaited_once_with(old_token)

    assert request_mock.app.state.x_oauth_tokens["token-id"] == {
        "access_token": "new-access-token",
        "refresh_token": "new-refresh-token",
        "expires_at": 500,
    }


@pytest.mark.asyncio
async def test_access_token_for_request_does_not_refresh_valid_token(
    monkeypatch,
    request_mock,
):
    request_mock.session["x_token_id"] = "token-id"

    request_mock.app.state.x_oauth_tokens = {
        "token-id": {
            "access_token": "access-token",
            "expires_at": 500,
        }
    }

    refresh = AsyncMock()

    monkeypatch.setattr(
        x.XAuthService,
        "refresh_access_token",
        refresh,
    )

    monkeypatch.setattr(
        x.time,
        "time",
        MagicMock(return_value=200),
    )

    result = await x.XAuthService.access_token_for_request(
        request_mock
    )

    assert result == "access-token"
    refresh.assert_not_awaited()


# =========================================================
# CREATE POST
# =========================================================

@pytest.mark.asyncio
async def test_create_post_success(monkeypatch):
    response = make_response(
        {
            "data": {
                "id": "tweet-123",
                "text": "Hello X",
            }
        }
    )

    post = AsyncMock(return_value=response)

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    result = await x.XAuthService.create_post(
        "access-token",
        "Hello X",
    )

    assert result == {
        "data": {
            "id": "tweet-123",
            "text": "Hello X",
        }
    }

    args = post.call_args.kwargs

    assert args["json"] == {
        "text": "Hello X",
    }

    assert args["headers"] == {
        "Authorization": "Bearer access-token",
    }


@pytest.mark.asyncio
async def test_create_post_unauthorized(monkeypatch):
    post = AsyncMock(
        side_effect=make_http_error(401)
    )

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.create_post(
            "invalid-token",
            "Hello X",
        )

    assert exc.value.status_code == 401
    assert exc.value.detail == (
        "X access token is invalid; reconnect your account"
    )


@pytest.mark.asyncio
async def test_create_post_http_error(monkeypatch):
    post = AsyncMock(
        side_effect=make_http_error(500)
    )

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.create_post(
            "access-token",
            "Hello X",
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "X could not publish the post"


@pytest.mark.asyncio
async def test_create_post_connection_error(monkeypatch):
    post = AsyncMock(
        side_effect=make_request_error()
    )

    make_async_client_mock(
        monkeypatch,
        post=post,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.create_post(
            "access-token",
            "Hello X",
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "Could not communicate with X"


# =========================================================
# GET USER IDENTITY
# =========================================================

@pytest.mark.asyncio
async def test_get_user_identity_success(monkeypatch):
    response = make_response(
        {
            "data": {
                "id": "x-user-123",
                "username": "testuser",
                "name": "Test User",
            }
        }
    )

    get = AsyncMock(return_value=response)

    make_async_client_mock(
        monkeypatch,
        get=get,
    )

    result = await x.XAuthService.get_user_identity(
        "access-token"
    )

    assert result == {
        "id": "x-user-123",
        "username": "testuser",
        "name": "Test User",
    }

    args = get.call_args.kwargs

    assert args["params"] == {
        "user.fields": "name,username",
    }

    assert args["headers"] == {
        "Authorization": "Bearer access-token",
    }


@pytest.mark.asyncio
async def test_get_user_identity_without_optional_fields(
    monkeypatch,
):
    response = make_response(
        {
            "data": {
                "id": "x-user-123",
            }
        }
    )

    get = AsyncMock(return_value=response)

    make_async_client_mock(
        monkeypatch,
        get=get,
    )

    result = await x.XAuthService.get_user_identity(
        "access-token"
    )

    assert result == {
        "id": "x-user-123",
        "username": "",
        "name": "",
    }


@pytest.mark.asyncio
async def test_get_user_identity_http_error(monkeypatch):
    get = AsyncMock(
        side_effect=make_http_error(401)
    )

    make_async_client_mock(
        monkeypatch,
        get=get,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.get_user_identity(
            "access-token"
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == (
        "Could not retrieve X user identity"
    )


@pytest.mark.asyncio
async def test_get_user_identity_connection_error(monkeypatch):
    get = AsyncMock(
        side_effect=make_request_error()
    )

    make_async_client_mock(
        monkeypatch,
        get=get,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.get_user_identity(
            "access-token"
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == "Could not communicate with X"


@pytest.mark.asyncio
async def test_get_user_identity_without_data(monkeypatch):
    response = make_response(
        {
            "data": None,
        }
    )

    get = AsyncMock(return_value=response)

    make_async_client_mock(
        monkeypatch,
        get=get,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.get_user_identity(
            "access-token"
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == (
        "X did not return a valid user identity"
    )


@pytest.mark.asyncio
async def test_get_user_identity_without_id(monkeypatch):
    response = make_response(
        {
            "data": {
                "username": "testuser",
                "name": "Test User",
            }
        }
    )

    get = AsyncMock(return_value=response)

    make_async_client_mock(
        monkeypatch,
        get=get,
    )

    with pytest.raises(HTTPException) as exc:
        await x.XAuthService.get_user_identity(
            "access-token"
        )

    assert exc.value.status_code == 502
    assert exc.value.detail == (
        "X did not return a valid user identity"
    )