import base64
import hashlib
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from fastapi.responses import JSONResponse, RedirectResponse

from api.v1 import xauth as x


@pytest.fixture
def request_mock():
    request = MagicMock()
    request.session = {}
    request.query_params = {}
    request.app.state = SimpleNamespace()
    return request


@pytest.fixture
def identity():
    return {
        "id": "x-user-123",
        "username": "testuser",
        "name": "Test User",
    }


@pytest.fixture
def token():
    return {
        "access_token": "x-access-token",
        "refresh_token": "x-refresh-token",
        "token_type": "bearer",
        "expires_at": 2000000000,
    }


# =========================================================
# PKCE
# =========================================================


def test_generate_pkce():
    verifier, challenge = x._generate_pkce()

    expected_challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode("ascii")
    )

    assert isinstance(verifier, str)
    assert isinstance(challenge, str)

    assert len(verifier) > 0
    assert challenge == expected_challenge


def test_generate_pkce_returns_different_values():
    verifier1, challenge1 = x._generate_pkce()
    verifier2, challenge2 = x._generate_pkce()

    assert verifier1 != verifier2
    assert challenge1 != challenge2


# =========================================================
# X LOGIN
# =========================================================


@pytest.mark.asyncio
async def test_x_auth_start_stores_state_and_verifier(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        x.secrets,
        "token_urlsafe",
        lambda size: "oauth-state" if size == 32 else "code-verifier",
    )

    authorization_url = MagicMock(return_value="https://x.com/i/oauth2/authorize")

    monkeypatch.setattr(
        x.XAuthService,
        "authorization_url",
        authorization_url,
    )

    response = await x.x_auth_start(request_mock)

    assert isinstance(response, RedirectResponse)

    assert response.headers["location"] == ("https://x.com/i/oauth2/authorize")

    assert request_mock.session["x_oauth_state"] == "oauth-state"
    assert request_mock.session["x_code_verifier"] == "code-verifier"

    assert "x_app_redirect_uri" not in request_mock.session

    authorization_url.assert_called_once()


@pytest.mark.asyncio
async def test_x_auth_start_generates_pkce(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        x.secrets,
        "token_urlsafe",
        lambda size: "oauth-state" if size == 32 else "code-verifier",
    )

    generate_pkce = MagicMock(return_value=("test-verifier", "test-challenge"))

    monkeypatch.setattr(
        x,
        "_generate_pkce",
        generate_pkce,
    )

    authorization_url = MagicMock(return_value="https://x.com/oauth")

    monkeypatch.setattr(
        x.XAuthService,
        "authorization_url",
        authorization_url,
    )

    await x.x_auth_start(request_mock)

    generate_pkce.assert_called_once_with()

    authorization_url.assert_called_once_with(
        "oauth-state",
        "test-challenge",
    )

    assert request_mock.session["x_code_verifier"] == "test-verifier"


@pytest.mark.asyncio
async def test_x_auth_start_stores_app_redirect_uri(
    monkeypatch,
    request_mock,
):
    app_uri = "https://localhost:8081/auth/oauth-callback?provider=x"

    monkeypatch.setattr(
        x.secrets,
        "token_urlsafe",
        lambda size: "oauth-state",
    )

    monkeypatch.setattr(
        x,
        "_generate_pkce",
        MagicMock(return_value=("verifier", "challenge")),
    )

    monkeypatch.setattr(
        x.XAuthService,
        "authorization_url",
        MagicMock(return_value="https://x.com/oauth"),
    )

    validate = MagicMock(return_value=app_uri)

    monkeypatch.setattr(
        x,
        "validate_app_redirect_uri",
        validate,
    )

    await x.x_auth_start(
        request_mock,
        app_redirect_uri=app_uri,
    )

    validate.assert_called_once_with(app_uri, "x")

    assert request_mock.session["x_app_redirect_uri"] == app_uri


@pytest.mark.asyncio
async def test_x_auth_start_rejects_invalid_app_redirect_uri(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        x.secrets,
        "token_urlsafe",
        lambda size: "oauth-state",
    )

    monkeypatch.setattr(
        x,
        "_generate_pkce",
        MagicMock(return_value=("verifier", "challenge")),
    )

    monkeypatch.setattr(
        x.XAuthService,
        "authorization_url",
        MagicMock(return_value="https://x.com/oauth"),
    )

    monkeypatch.setattr(
        x,
        "validate_app_redirect_uri",
        MagicMock(
            side_effect=HTTPException(
                status_code=400,
                detail="Invalid redirect URI",
            )
        ),
    )

    with pytest.raises(HTTPException) as exc:
        await x.x_auth_start(
            request_mock,
            app_redirect_uri="https://evil.com/callback",
        )

    assert exc.value.status_code == 400

    assert "x_oauth_state" in request_mock.session
    assert "x_code_verifier" in request_mock.session
    assert "x_app_redirect_uri" not in request_mock.session


# =========================================================
# X CALLBACK - VALIDATION
# =========================================================


@pytest.mark.asyncio
async def test_x_auth_callback_returns_provider_error(
    request_mock,
):
    request_mock.query_params = {
        "error": "access_denied",
    }

    with pytest.raises(HTTPException) as exc:
        await x.x_auth_callback(request_mock)

    assert exc.value.status_code == 400
    assert exc.value.detail == "X authorization was denied"


@pytest.mark.asyncio
async def test_x_auth_callback_rejects_missing_state(
    request_mock,
):
    request_mock.session["x_code_verifier"] = "verifier"

    request_mock.query_params = {
        "code": "auth-code",
        "state": "received-state",
    }

    with pytest.raises(HTTPException) as exc:
        await x.x_auth_callback(request_mock)

    assert exc.value.status_code == 400
    assert exc.value.detail == "X OAuth session expired or invalid"


@pytest.mark.asyncio
async def test_x_auth_callback_rejects_invalid_state(
    request_mock,
):
    request_mock.session.update(
        {
            "x_oauth_state": "expected-state",
            "x_code_verifier": "verifier",
        }
    )

    request_mock.query_params = {
        "code": "auth-code",
        "state": "wrong-state",
    }

    with pytest.raises(HTTPException) as exc:
        await x.x_auth_callback(request_mock)

    assert exc.value.status_code == 400
    assert exc.value.detail == "X OAuth session expired or invalid"

    assert "x_oauth_state" not in request_mock.session
    assert "x_code_verifier" not in request_mock.session


@pytest.mark.asyncio
async def test_x_auth_callback_rejects_missing_verifier(
    request_mock,
):
    request_mock.session["x_oauth_state"] = "expected-state"

    request_mock.query_params = {
        "code": "auth-code",
        "state": "expected-state",
    }

    with pytest.raises(HTTPException) as exc:
        await x.x_auth_callback(request_mock)

    assert exc.value.status_code == 400
    assert exc.value.detail == "X OAuth session expired or invalid"


@pytest.mark.asyncio
async def test_x_auth_callback_rejects_missing_code(
    request_mock,
):
    request_mock.session.update(
        {
            "x_oauth_state": "expected-state",
            "x_code_verifier": "verifier",
        }
    )

    request_mock.query_params = {
        "state": "expected-state",
    }

    with pytest.raises(HTTPException) as exc:
        await x.x_auth_callback(request_mock)

    assert exc.value.status_code == 400
    assert exc.value.detail == "X authorization code missing"


@pytest.mark.asyncio
async def test_x_auth_callback_state_is_single_use(
    monkeypatch,
    request_mock,
):
    request_mock.session.update(
        {
            "x_oauth_state": "expected-state",
            "x_code_verifier": "verifier",
        }
    )

    request_mock.query_params = {
        "code": "auth-code",
        "state": "expected-state",
    }

    monkeypatch.setattr(
        x.XAuthService,
        "exchange_code",
        AsyncMock(
            side_effect=HTTPException(
                status_code=502,
                detail="X error",
            )
        ),
    )

    with pytest.raises(HTTPException):
        await x.x_auth_callback(request_mock)

    assert "x_oauth_state" not in request_mock.session
    assert "x_code_verifier" not in request_mock.session


# =========================================================
# X CALLBACK - SUCCESS
# =========================================================


@pytest.mark.asyncio
async def test_x_auth_callback_success_without_app_redirect(
    monkeypatch,
    request_mock,
    token,
):
    request_mock.session.update(
        {
            "x_oauth_state": "expected-state",
            "x_code_verifier": "test-verifier",
        }
    )

    request_mock.query_params = {
        "code": "auth-code",
        "state": "expected-state",
    }

    monkeypatch.setattr(
        x.XAuthService,
        "exchange_code",
        AsyncMock(return_value=token),
    )

    monkeypatch.setattr(
        x.secrets,
        "token_urlsafe",
        MagicMock(return_value="token-id"),
    )

    response = await x.x_auth_callback(request_mock)

    assert isinstance(response, JSONResponse)

    assert response.status_code == 200

    assert request_mock.app.state.x_oauth_tokens == {
        "token-id": token,
    }

    assert request_mock.session["x_token_id"] == "token-id"

    assert "x_oauth_state" not in request_mock.session
    assert "x_code_verifier" not in request_mock.session

    x.XAuthService.exchange_code.assert_awaited_once_with(
        "auth-code",
        "test-verifier",
    )


@pytest.mark.asyncio
async def test_x_auth_callback_redirects_to_app_with_ticket(
    monkeypatch,
    request_mock,
    token,
    identity,
):
    app_uri = "https://localhost:8081/auth/oauth-callback?provider=x"

    request_mock.session.update(
        {
            "x_oauth_state": "expected-state",
            "x_code_verifier": "test-verifier",
            "x_app_redirect_uri": app_uri,
        }
    )

    request_mock.query_params = {
        "code": "auth-code",
        "state": "expected-state",
    }

    monkeypatch.setattr(
        x.XAuthService,
        "exchange_code",
        AsyncMock(return_value=token),
    )

    monkeypatch.setattr(
        x.XAuthService,
        "get_user_identity",
        AsyncMock(return_value=identity),
    )

    monkeypatch.setattr(
        x.secrets,
        "token_urlsafe",
        MagicMock(return_value="token-id"),
    )

    monkeypatch.setattr(
        x,
        "create_social_auth_ticket",
        AsyncMock(return_value="social-ticket"),
    )

    monkeypatch.setattr(
        x,
        "add_ticket_to_redirect_uri",
        MagicMock(
            return_value=(
                "https://localhost:8081/auth/oauth-callback?provider=x&ticket=social-ticket"
            )
        ),
    )

    response = await x.x_auth_callback(request_mock)

    assert isinstance(response, RedirectResponse)

    assert response.headers["location"].endswith("ticket=social-ticket")

    x.XAuthService.exchange_code.assert_awaited_once_with(
        "auth-code",
        "test-verifier",
    )

    x.XAuthService.get_user_identity.assert_awaited_once_with("x-access-token")

    x.create_social_auth_ticket.assert_awaited_once_with(
        "x",
        {
            "sub": "x-user-123",
            "email": None,
            "name": "Test User",
        },
    )

    x.add_ticket_to_redirect_uri.assert_called_once_with(
        app_uri,
        "social-ticket",
    )

    assert "x_app_redirect_uri" not in request_mock.session
    assert request_mock.session["x_token_id"] == "token-id"


@pytest.mark.asyncio
async def test_x_auth_callback_uses_username_if_name_is_missing(
    monkeypatch,
    request_mock,
    token,
):
    app_uri = "https://localhost:8081/auth/oauth-callback?provider=x"

    request_mock.session.update(
        {
            "x_oauth_state": "expected-state",
            "x_code_verifier": "verifier",
            "x_app_redirect_uri": app_uri,
        }
    )

    request_mock.query_params = {
        "code": "auth-code",
        "state": "expected-state",
    }

    monkeypatch.setattr(
        x.XAuthService,
        "exchange_code",
        AsyncMock(return_value=token),
    )

    monkeypatch.setattr(
        x.XAuthService,
        "get_user_identity",
        AsyncMock(
            return_value={
                "id": "x-user-123",
                "username": "testuser",
                "name": "",
            }
        ),
    )

    monkeypatch.setattr(
        x.secrets,
        "token_urlsafe",
        MagicMock(return_value="token-id"),
    )

    monkeypatch.setattr(
        x,
        "create_social_auth_ticket",
        AsyncMock(return_value="ticket"),
    )

    monkeypatch.setattr(
        x,
        "add_ticket_to_redirect_uri",
        MagicMock(return_value="https://localhost:8081/callback?ticket=ticket"),
    )

    await x.x_auth_callback(request_mock)

    x.create_social_auth_ticket.assert_awaited_once_with(
        "x",
        {
            "sub": "x-user-123",
            "email": None,
            "name": "testuser",
        },
    )


@pytest.mark.asyncio
async def test_x_auth_callback_initializes_token_storage(
    monkeypatch,
    request_mock,
    token,
):
    request_mock.session.update(
        {
            "x_oauth_state": "expected-state",
            "x_code_verifier": "verifier",
        }
    )

    request_mock.query_params = {
        "code": "auth-code",
        "state": "expected-state",
    }

    monkeypatch.setattr(
        x.XAuthService,
        "exchange_code",
        AsyncMock(return_value=token),
    )

    monkeypatch.setattr(
        x.secrets,
        "token_urlsafe",
        MagicMock(return_value="token-id"),
    )

    await x.x_auth_callback(request_mock)

    assert hasattr(request_mock.app.state, "x_oauth_tokens")
    assert request_mock.app.state.x_oauth_tokens["token-id"] == token


# =========================================================
# CREATE X POST
# =========================================================


@pytest.mark.asyncio
async def test_create_x_post_success(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        x.XAuthService,
        "access_token_for_request",
        AsyncMock(return_value="access-token"),
    )

    monkeypatch.setattr(
        x.XAuthService,
        "create_post",
        AsyncMock(
            return_value={
                "data": {
                    "id": "tweet-123",
                    "text": "Hello X",
                }
            }
        ),
    )

    body = SimpleNamespace(text="Hello X")

    response = await x.create_x_post(body, request_mock)

    assert response == {
        "data": {
            "id": "tweet-123",
            "text": "Hello X",
        }
    }

    x.XAuthService.access_token_for_request.assert_awaited_once_with(request_mock)

    x.XAuthService.create_post.assert_awaited_once_with(
        "access-token",
        "Hello X",
    )


@pytest.mark.asyncio
async def test_create_x_post_strips_whitespace(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        x.XAuthService,
        "access_token_for_request",
        AsyncMock(return_value="access-token"),
    )

    monkeypatch.setattr(
        x.XAuthService,
        "create_post",
        AsyncMock(return_value={"success": True}),
    )

    body = SimpleNamespace(text="  Hello X  ")

    await x.create_x_post(body, request_mock)

    x.XAuthService.create_post.assert_awaited_once_with(
        "access-token",
        "Hello X",
    )


@pytest.mark.asyncio
async def test_create_x_post_rejects_empty_text(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        x.XAuthService,
        "access_token_for_request",
        AsyncMock(return_value="access-token"),
    )

    create_post = AsyncMock()

    monkeypatch.setattr(
        x.XAuthService,
        "create_post",
        create_post,
    )

    body = SimpleNamespace(text="   ")

    with pytest.raises(HTTPException) as exc:
        await x.create_x_post(body, request_mock)

    assert exc.value.status_code == 422
    assert exc.value.detail == "Post text cannot be empty"

    create_post.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_x_post_access_token_error(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        x.XAuthService,
        "access_token_for_request",
        AsyncMock(
            side_effect=HTTPException(
                status_code=401,
                detail="Connect your X account first",
            )
        ),
    )

    body = SimpleNamespace(text="Hello X")

    with pytest.raises(HTTPException) as exc:
        await x.create_x_post(body, request_mock)

    assert exc.value.status_code == 401
