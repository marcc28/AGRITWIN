from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from fastapi.responses import RedirectResponse

from api.v1 import fb_auth as facebook


@pytest.fixture
def request_mock():
    request = MagicMock()
    request.session = {}
    request.query_params = {}
    return request


@pytest.mark.asyncio
async def test_facebook_login_stores_state(monkeypatch, request_mock):
    monkeypatch.setattr(
        facebook.secrets,
        "token_urlsafe",
        lambda size: "oauth-state",
    )

    monkeypatch.setattr(
        facebook.FacebookAuthService,
        "authorization_url",
        MagicMock(return_value="https://facebook.com/oauth"),
    )

    response = await facebook.facebook_login(request_mock)

    assert isinstance(response, RedirectResponse)
    assert response.headers["location"] == "https://facebook.com/oauth"
    assert request_mock.session["facebook_oauth_state"] == "oauth-state"
    assert "facebook_app_redirect_uri" not in request_mock.session


@pytest.mark.asyncio
async def test_facebook_login_stores_valid_app_redirect_uri(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        facebook.secrets,
        "token_urlsafe",
        lambda size: "oauth-state",
    )

    monkeypatch.setattr(
        facebook.FacebookAuthService,
        "authorization_url",
        MagicMock(return_value="https://facebook.com/oauth"),
    )

    monkeypatch.setattr(
        facebook,
        "validate_app_redirect_uri",
        MagicMock(return_value=("https://localhost:8081/auth/oauth-callback?provider=facebook")),
    )

    app_redirect_uri = "https://localhost:8081/auth/oauth-callback?provider=facebook"
    request_mock.query_params = {
        "app_redirect_uri": app_redirect_uri,
    }

    await facebook.facebook_login(request_mock, app_redirect_uri)

    assert request_mock.session["facebook_app_redirect_uri"] == app_redirect_uri


@pytest.mark.asyncio
async def test_facebook_login_rejects_invalid_app_redirect_uri(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        facebook.FacebookAuthService,
        "authorization_url",
        MagicMock(return_value="https://facebook.com/oauth"),
    )

    monkeypatch.setattr(
        facebook,
        "validate_app_redirect_uri",
        MagicMock(
            side_effect=HTTPException(
                status_code=400,
                detail="Invalid redirect URI",
            )
        ),
    )

    request_mock.query_params = {
        "app_redirect_uri": "https://evil.com/auth/oauth-callback?provider=facebook",
    }

    with pytest.raises(HTTPException) as exc:
        await facebook.facebook_login(
            request_mock,
            request_mock.query_params["app_redirect_uri"],
        )

    assert exc.value.status_code == 400
    assert "facebook_oauth_state" in request_mock.session
    assert "facebook_app_redirect_uri" not in request_mock.session


@pytest.mark.asyncio
async def test_facebook_callback_returns_error_from_facebook(request_mock):
    request_mock.query_params = {
        "error": "access_denied",
    }

    with pytest.raises(HTTPException) as exc:
        await facebook.facebook_callback(request_mock)

    assert exc.value.status_code == 400
    assert "Facebook authentication failed" in exc.value.detail
    assert "access_denied" in exc.value.detail


@pytest.mark.asyncio
async def test_facebook_callback_rejects_missing_state(request_mock):
    request_mock.query_params = {
        "state": "received-state",
        "code": "auth-code",
    }

    with pytest.raises(HTTPException) as exc:
        await facebook.facebook_callback(request_mock)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid Facebook OAuth state"


@pytest.mark.asyncio
async def test_facebook_callback_rejects_missing_query_state(request_mock):
    request_mock.session["facebook_oauth_state"] = "expected-state"
    request_mock.query_params = {
        "code": "auth-code",
    }

    with pytest.raises(HTTPException) as exc:
        await facebook.facebook_callback(request_mock)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid Facebook OAuth state"


@pytest.mark.asyncio
async def test_facebook_callback_rejects_invalid_state(request_mock):
    request_mock.session["facebook_oauth_state"] = "expected-state"
    request_mock.query_params = {
        "state": "different-state",
        "code": "auth-code",
    }

    with pytest.raises(HTTPException) as exc:
        await facebook.facebook_callback(request_mock)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid Facebook OAuth state"


@pytest.mark.asyncio
async def test_facebook_callback_rejects_missing_code(request_mock):
    request_mock.session["facebook_oauth_state"] = "expected-state"
    request_mock.query_params = {
        "state": "expected-state",
    }

    with pytest.raises(HTTPException) as exc:
        await facebook.facebook_callback(request_mock)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Facebook authorization code missing"


@pytest.mark.asyncio
async def test_facebook_callback_returns_identity_without_app_redirect(
    monkeypatch,
    request_mock,
):
    request_mock.session["facebook_oauth_state"] = "expected-state"
    request_mock.query_params = {
        "state": "expected-state",
        "code": "auth-code",
    }

    identity = {
        "id": "fb-123",
        "name": "Test User",
        "email": "USER@example.com",
    }

    monkeypatch.setattr(
        facebook.FacebookAuthService,
        "fetch_identity",
        AsyncMock(return_value=identity),
    )

    response = await facebook.facebook_callback(request_mock)

    assert response.status_code == 200
    assert response.body == (
        b'{"provider":"facebook","id":"fb-123","name":"Test User","email":"USER@example.com"}'
    )

    assert "facebook_oauth_state" not in request_mock.session
    assert "facebook_app_redirect_uri" not in request_mock.session


@pytest.mark.asyncio
async def test_facebook_callback_redirects_with_ticket(
    monkeypatch,
    request_mock,
):
    app_redirect_uri = "https://localhost:8081/auth/oauth-callback?provider=facebook"

    request_mock.session["facebook_oauth_state"] = "expected-state"
    request_mock.session["facebook_app_redirect_uri"] = app_redirect_uri
    request_mock.query_params = {
        "state": "expected-state",
        "code": "auth-code",
    }

    identity = {
        "id": "fb-123",
        "name": "Test User",
        "email": "USER@example.com",
    }

    monkeypatch.setattr(
        facebook.FacebookAuthService,
        "fetch_identity",
        AsyncMock(return_value=identity),
    )

    monkeypatch.setattr(
        facebook,
        "create_social_auth_ticket",
        AsyncMock(return_value="social-ticket"),
    )

    monkeypatch.setattr(
        facebook,
        "add_ticket_to_redirect_uri",
        MagicMock(
            return_value=(
                "https://localhost:8081/auth/oauth-callback?provider=facebook&ticket=social-ticket"
            )
        ),
    )

    response = await facebook.facebook_callback(request_mock)

    assert isinstance(response, RedirectResponse)
    assert response.headers["location"] == (
        "https://localhost:8081/auth/oauth-callback?provider=facebook&ticket=social-ticket"
    )

    facebook.create_social_auth_ticket.assert_awaited_once_with(
        "facebook",
        {
            "sub": "fb-123",
            "email": "user@example.com",
            "name": "Test User",
        },
    )

    facebook.add_ticket_to_redirect_uri.assert_called_once_with(
        app_redirect_uri,
        "social-ticket",
    )

    assert "facebook_oauth_state" not in request_mock.session
    assert "facebook_app_redirect_uri" not in request_mock.session


@pytest.mark.asyncio
async def test_facebook_callback_normalizes_empty_email_and_name(
    monkeypatch,
    request_mock,
):
    request_mock.session["facebook_oauth_state"] = "expected-state"
    request_mock.session["facebook_app_redirect_uri"] = (
        "https://localhost:8081/auth/oauth-callback?provider=facebook"
    )
    request_mock.query_params = {
        "state": "expected-state",
        "code": "auth-code",
    }

    identity = {
        "id": "fb-123",
        "email": "   ",
        "name": None,
    }

    monkeypatch.setattr(
        facebook.FacebookAuthService,
        "fetch_identity",
        AsyncMock(return_value=identity),
    )

    monkeypatch.setattr(
        facebook,
        "create_social_auth_ticket",
        AsyncMock(return_value="social-ticket"),
    )

    monkeypatch.setattr(
        facebook,
        "add_ticket_to_redirect_uri",
        MagicMock(return_value="https://localhost:8081/callback"),
    )

    await facebook.facebook_callback(request_mock)

    facebook.create_social_auth_ticket.assert_awaited_once_with(
        "facebook",
        {
            "sub": "fb-123",
            "email": None,
            "name": "",
        },
    )


@pytest.mark.asyncio
async def test_facebook_callback_state_is_single_use(
    monkeypatch,
    request_mock,
):
    request_mock.session["facebook_oauth_state"] = "expected-state"
    request_mock.query_params = {
        "state": "expected-state",
        "code": "auth-code",
    }

    monkeypatch.setattr(
        facebook.FacebookAuthService,
        "fetch_identity",
        AsyncMock(
            side_effect=HTTPException(
                status_code=502,
                detail="Facebook returned an authentication error",
            )
        ),
    )

    with pytest.raises(HTTPException):
        await facebook.facebook_callback(request_mock)

    assert "facebook_oauth_state" not in request_mock.session
