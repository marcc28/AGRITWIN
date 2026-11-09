
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import jwt
import pytest

from fastapi import HTTPException
from fastapi.responses import RedirectResponse

from api.v1 import google_auth as google
from api.v1.auth import SECRET_KEY, ALGORITHM


@pytest.fixture
def request_mock():
    request = MagicMock()
    request.session = {}
    request.query_params = {}
    return request


@pytest.fixture
def identity():
    return {
        "sub": "google-user-123",
        "email": "user@example.com",
        "email_verified": True,
        "name": "Test User",
    }


def make_db_mock(monkeypatch):
    db = MagicMock()
    context = MagicMock()

    context.__aenter__ = AsyncMock(return_value=db)
    context.__aexit__ = AsyncMock(return_value=None)

    monkeypatch.setattr(
        google,
        "AsyncSessionLocal",
        lambda: context,
    )

    return db


def make_signup_token(
    provider="google",
    purpose="social_signup",
    provider_sub="google-user-123",
    email="user@example.com",
    name="Test User",
):
    return jwt.encode(
        {
            "purpose": purpose,
            "provider": provider,
            "provider_sub": provider_sub,
            "email": email,
            "name": name,
            "exp": datetime.now(UTC) + timedelta(minutes=10),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def make_google_signup_token(
    purpose="google_signup",
    google_sub="google-user-123",
    email="user@example.com",
    name="Test User",
):
    return jwt.encode(
        {
            "purpose": purpose,
            "google_sub": google_sub,
            "email": email,
            "name": name,
            "exp": datetime.now(UTC) + timedelta(minutes=10),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def mock_token_pair(monkeypatch):
    monkeypatch.setattr(
        google,
        "_token_pair",
        MagicMock(
            return_value={
                "access_token": "access-token",
                "refresh_token": "refresh-token",
                "token_type": "bearer",
            }
        ),
    )


# =========================================================
# SOCIAL GOOGLE LOGIN
# =========================================================

@pytest.mark.asyncio
async def test_social_google_login_existing_user(
    monkeypatch,
    identity,
):
    make_db_mock(monkeypatch)

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(
        return_value=SimpleNamespace(username="existing-user")
    )

    monkeypatch.setattr(
        google,
        "UserService",
        MagicMock(return_value=service),
    )

    monkeypatch.setattr(
        google.GoogleAuthService,
        "identity_from_token",
        MagicMock(return_value=identity),
    )

    mock_token_pair(monkeypatch)

    body = SimpleNamespace(id_token="google-id-token")

    response = await google.social_google_login(body)

    assert response == {
        "access_token": "access-token",
        "refresh_token": "refresh-token",
        "token_type": "bearer",
    }

    service.get_user_by_auth_provider.assert_awaited_once_with(
        "google",
        "google-user-123",
    )

    google._token_pair.assert_called_once_with("existing-user")


@pytest.mark.asyncio
async def test_social_google_login_rejects_existing_email(
    monkeypatch,
    identity,
):
    make_db_mock(monkeypatch)

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(return_value=None)
    service.get_user_by_email = AsyncMock(
        return_value=SimpleNamespace(username="existing-user")
    )

    monkeypatch.setattr(
        google,
        "UserService",
        MagicMock(return_value=service),
    )

    monkeypatch.setattr(
        google.GoogleAuthService,
        "identity_from_token",
        MagicMock(return_value=identity),
    )

    body = SimpleNamespace(id_token="google-id-token")

    with pytest.raises(HTTPException) as exc:
        await google.social_google_login(body)

    assert exc.value.status_code == 409
    assert "already belongs" in exc.value.detail

    service.get_user_by_email.assert_awaited_once_with(
        "user@example.com"
    )


@pytest.mark.asyncio
async def test_social_google_login_requires_signup(
    monkeypatch,
    identity,
):
    make_db_mock(monkeypatch)

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(return_value=None)
    service.get_user_by_email = AsyncMock(return_value=None)

    monkeypatch.setattr(
        google,
        "UserService",
        MagicMock(return_value=service),
    )

    monkeypatch.setattr(
        google.GoogleAuthService,
        "identity_from_token",
        MagicMock(return_value=identity),
    )

    body = SimpleNamespace(id_token="google-id-token")

    response = await google.social_google_login(body)

    assert response["status"] == "signup_required"
    assert response["email"] == "user@example.com"
    assert response["name"] == "Test User"

    decoded = jwt.decode(
        response["signup_token"],
        SECRET_KEY,
        algorithms=[ALGORITHM],
    )

    assert decoded["purpose"] == "social_signup"
    assert decoded["provider"] == "google"
    assert decoded["provider_sub"] == "google-user-123"
    assert decoded["email"] == "user@example.com"


@pytest.mark.asyncio
async def test_social_google_login_identity_error(
    monkeypatch,
):
    monkeypatch.setattr(
        google.GoogleAuthService,
        "identity_from_token",
        MagicMock(
            side_effect=HTTPException(
                status_code=401,
                detail="Invalid Google ID token",
            )
        ),
    )

    body = SimpleNamespace(id_token="invalid-token")

    with pytest.raises(HTTPException) as exc:
        await google.social_google_login(body)

    assert exc.value.status_code == 401


# =========================================================
# COMPLETE SOCIAL SIGNUP
# =========================================================

@pytest.mark.asyncio
async def test_complete_social_signup_success(
    monkeypatch,
):
    make_db_mock(monkeypatch)

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(return_value=None)
    service.create_social_user = AsyncMock(
        return_value=SimpleNamespace(username="new-user")
    )

    monkeypatch.setattr(
        google,
        "UserService",
        MagicMock(return_value=service),
    )

    mock_token_pair(monkeypatch)

    body = SimpleNamespace(
        signup_token=make_signup_token(),
        username=" new-user ",
        email=None,
        privacy_terms_accepted=True,
        security_terms_accepted=True,
    )

    response = await google.complete_social_signup(body)

    assert response == {
        "access_token": "access-token",
        "refresh_token": "refresh-token",
        "token_type": "bearer",
        "username": "new-user",
    }

    service.create_social_user.assert_awaited_once_with(
        username="new-user",
        email="user@example.com",
        provider="google",
        provider_user_id="google-user-123",
        privacy_terms_accepted=True,
        security_terms_accepted=True,
        display_name="Test User",
    )


@pytest.mark.asyncio
async def test_complete_social_signup_rejects_invalid_token():
    body = SimpleNamespace(
        signup_token="invalid-token",
        username="new-user",
        email=None,
        privacy_terms_accepted=True,
        security_terms_accepted=True,
    )

    with pytest.raises(HTTPException) as exc:
        await google.complete_social_signup(body)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Signup token expired or invalid"


@pytest.mark.asyncio
async def test_complete_social_signup_rejects_wrong_purpose():
    token = make_signup_token(purpose="wrong-purpose")

    body = SimpleNamespace(
        signup_token=token,
        username="new-user",
        email=None,
        privacy_terms_accepted=True,
        security_terms_accepted=True,
    )

    with pytest.raises(HTTPException) as exc:
        await google.complete_social_signup(body)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid signup token"


@pytest.mark.asyncio
async def test_complete_social_signup_rejects_unsupported_provider():
    token = make_signup_token(provider="unsupported")

    body = SimpleNamespace(
        signup_token=token,
        username="new-user",
        email=None,
        privacy_terms_accepted=True,
        security_terms_accepted=True,
    )

    with pytest.raises(HTTPException) as exc:
        await google.complete_social_signup(body)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid signup token"


@pytest.mark.asyncio
async def test_complete_social_signup_rejects_empty_username():
    body = SimpleNamespace(
        signup_token=make_signup_token(),
        username="   ",
        email=None,
        privacy_terms_accepted=True,
        security_terms_accepted=True,
    )

    with pytest.raises(HTTPException) as exc:
        await google.complete_social_signup(body)

    assert exc.value.status_code == 422
    assert exc.value.detail == "Username cannot be empty"


@pytest.mark.asyncio
async def test_complete_social_signup_rejects_existing_social_account(
    monkeypatch,
):
    make_db_mock(monkeypatch)

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(
        return_value=SimpleNamespace(username="existing-user")
    )

    monkeypatch.setattr(
        google,
        "UserService",
        MagicMock(return_value=service),
    )

    body = SimpleNamespace(
        signup_token=make_signup_token(),
        username="new-user",
        email=None,
        privacy_terms_accepted=True,
        security_terms_accepted=True,
    )

    with pytest.raises(HTTPException) as exc:
        await google.complete_social_signup(body)

    assert exc.value.status_code == 409
    assert exc.value.detail == "Social account already registered"

    service.create_social_user.assert_not_called()


@pytest.mark.asyncio
async def test_complete_social_signup_uses_body_email_if_token_has_none(
    monkeypatch,
):
    make_db_mock(monkeypatch)

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(return_value=None)
    service.create_social_user = AsyncMock(
        return_value=SimpleNamespace(username="new-user")
    )

    monkeypatch.setattr(
        google,
        "UserService",
        MagicMock(return_value=service),
    )

    mock_token_pair(monkeypatch)

    body = SimpleNamespace(
        signup_token=make_signup_token(email=""),
        username="new-user",
        email=" USER@EXAMPLE.COM ",
        privacy_terms_accepted=True,
        security_terms_accepted=False,
    )

    await google.complete_social_signup(body)

    assert service.create_social_user.call_args.kwargs["email"] == (
        "user@example.com"
    )


@pytest.mark.asyncio
async def test_complete_social_signup_requires_email(
    monkeypatch,
):
    make_db_mock(monkeypatch)

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(return_value=None)

    monkeypatch.setattr(
        google,
        "UserService",
        MagicMock(return_value=service),
    )

    body = SimpleNamespace(
        signup_token=make_signup_token(email=""),
        username="new-user",
        email=None,
        privacy_terms_accepted=True,
        security_terms_accepted=True,
    )

    with pytest.raises(HTTPException) as exc:
        await google.complete_social_signup(body)

    assert exc.value.status_code == 422
    assert exc.value.detail == (
        "Email is required to complete this social signup"
    )


# =========================================================
# GOOGLE LOGIN - BROWSER OAUTH
# =========================================================

@pytest.mark.asyncio
async def test_google_login_stores_state(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        google.secrets,
        "token_urlsafe",
        lambda size: "oauth-state",
    )

    monkeypatch.setattr(
        google.GoogleAuthService,
        "authorization_url",
        MagicMock(return_value="https://accounts.google.com/oauth"),
    )

    response = await google.google_login(request_mock)

    assert isinstance(response, RedirectResponse)
    assert response.headers["location"] == (
        "https://accounts.google.com/oauth"
    )

    assert request_mock.session["google_oauth_state"] == "oauth-state"
    assert "google_app_redirect_uri" not in request_mock.session


@pytest.mark.asyncio
async def test_google_login_stores_app_redirect_uri(
    monkeypatch,
    request_mock,
):
    app_uri = (
        "https://localhost:8081/auth/oauth-callback?provider=google"
    )

    monkeypatch.setattr(
        google.secrets,
        "token_urlsafe",
        lambda size: "oauth-state",
    )

    monkeypatch.setattr(
        google.GoogleAuthService,
        "authorization_url",
        MagicMock(return_value="https://accounts.google.com/oauth"),
    )

    validate = MagicMock(return_value=app_uri)

    monkeypatch.setattr(
        google,
        "validate_app_redirect_uri",
        validate,
    )

    await google.google_login(
        request_mock,
        app_redirect_uri=app_uri,
    )

    validate.assert_called_once_with(app_uri, "google")
    assert request_mock.session["google_app_redirect_uri"] == app_uri


@pytest.mark.asyncio
async def test_google_login_rejects_invalid_app_redirect_uri(
    monkeypatch,
    request_mock,
):
    monkeypatch.setattr(
        google.secrets,
        "token_urlsafe",
        lambda size: "oauth-state",
    )

    monkeypatch.setattr(
        google.GoogleAuthService,
        "authorization_url",
        MagicMock(return_value="https://accounts.google.com/oauth"),
    )

    monkeypatch.setattr(
        google,
        "validate_app_redirect_uri",
        MagicMock(
            side_effect=HTTPException(
                status_code=400,
                detail="Invalid redirect URI",
            )
        ),
    )

    with pytest.raises(HTTPException) as exc:
        await google.google_login(
            request_mock,
            app_redirect_uri="https://evil.com/callback",
        )

    assert exc.value.status_code == 400
    assert "google_oauth_state" in request_mock.session
    assert "google_app_redirect_uri" not in request_mock.session


# =========================================================
# GOOGLE CALLBACK - VALIDATION
# =========================================================

@pytest.mark.asyncio
async def test_google_callback_returns_provider_error(
    request_mock,
):
    with pytest.raises(HTTPException) as exc:
        await google.google_callback(
            request_mock,
            error="access_denied",
        )

    assert exc.value.status_code == 400
    assert "Google authentication failed" in exc.value.detail
    assert "access_denied" in exc.value.detail


@pytest.mark.asyncio
async def test_google_callback_rejects_missing_state(
    request_mock,
):
    with pytest.raises(HTTPException) as exc:
        await google.google_callback(
            request_mock,
            code="auth-code",
            state="received-state",
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid OAuth state"


@pytest.mark.asyncio
async def test_google_callback_rejects_invalid_state(
    request_mock,
):
    request_mock.session["google_oauth_state"] = "expected-state"

    with pytest.raises(HTTPException) as exc:
        await google.google_callback(
            request_mock,
            code="auth-code",
            state="wrong-state",
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid OAuth state"
    assert "google_oauth_state" not in request_mock.session


@pytest.mark.asyncio
async def test_google_callback_rejects_missing_code(
    request_mock,
):
    request_mock.session["google_oauth_state"] = "expected-state"

    with pytest.raises(HTTPException) as exc:
        await google.google_callback(
            request_mock,
            state="expected-state",
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Authorization code missing"


@pytest.mark.asyncio
async def test_google_callback_state_is_single_use(
    monkeypatch,
    request_mock,
):
    request_mock.session["google_oauth_state"] = "expected-state"

    monkeypatch.setattr(
        google.GoogleAuthService,
        "exchange_code",
        AsyncMock(
            side_effect=HTTPException(
                status_code=502,
                detail="Google error",
            )
        ),
    )

    with pytest.raises(HTTPException):
        await google.google_callback(
            request_mock,
            code="auth-code",
            state="expected-state",
        )

    assert "google_oauth_state" not in request_mock.session


# =========================================================
# GOOGLE CALLBACK - APP REDIRECT
# =========================================================

@pytest.mark.asyncio
async def test_google_callback_redirects_to_app_with_ticket(
    monkeypatch,
    request_mock,
    identity,
):
    app_uri = (
        "https://localhost:8081/auth/oauth-callback?provider=google"
    )

    request_mock.session.update(
        {
            "google_oauth_state": "expected-state",
            "google_app_redirect_uri": app_uri,
        }
    )

    monkeypatch.setattr(
        google.GoogleAuthService,
        "exchange_code",
        AsyncMock(return_value="google-id-token"),
    )

    monkeypatch.setattr(
        google.GoogleAuthService,
        "identity_from_token",
        MagicMock(return_value=identity),
    )

    monkeypatch.setattr(
        google,
        "create_social_auth_ticket",
        AsyncMock(return_value="social-ticket"),
    )

    monkeypatch.setattr(
        google,
        "add_ticket_to_redirect_uri",
        MagicMock(
            return_value=(
                "https://localhost:8081/auth/oauth-callback"
                "?provider=google&ticket=social-ticket"
            )
        ),
    )

    response = await google.google_callback(
        request_mock,
        code="auth-code",
        state="expected-state",
    )

    assert isinstance(response, RedirectResponse)
    assert response.headers["location"].endswith(
        "ticket=social-ticket"
    )

    google.create_social_auth_ticket.assert_awaited_once_with(
        "google",
        identity,
    )

    assert "google_oauth_state" not in request_mock.session
    assert "google_app_redirect_uri" not in request_mock.session


# =========================================================
# GOOGLE CALLBACK - EXISTING USER / NEW USER
# =========================================================


@pytest.mark.asyncio
async def test_google_callback_existing_user_returns_welcome_template(
    monkeypatch,
    request_mock,
    identity,
):
    make_db_mock(monkeypatch)

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(
        return_value=SimpleNamespace(username="existing-user")
    )

    monkeypatch.setattr(
        google,
        "UserService",
        MagicMock(return_value=service),
    )

    monkeypatch.setattr(
        google.GoogleAuthService,
        "exchange_code",
        AsyncMock(return_value="id-token"),
    )

    monkeypatch.setattr(
        google.GoogleAuthService,
        "identity_from_token",
        MagicMock(return_value=identity),
    )

    monkeypatch.setattr(
        google,
        "create_access_token",
        MagicMock(return_value="access-token"),
    )

    template_response = MagicMock()

    template = MagicMock(return_value=template_response)

    monkeypatch.setattr(
        google.templates,
        "TemplateResponse",
        template,
    )

    # IMPORTANT: preparar el state OAuth a la sessió
    request_mock.session["google_oauth_state"] = "expected-state"

    response = await google.google_callback(
        request_mock,
        code="code",
        state="expected-state",
    )

    assert response is template_response

    template.assert_called_once()

    assert template.call_args.kwargs["name"] == "welcome.html"

    assert template.call_args.kwargs["context"] == {
        "name": "existing-user",
        "access_token": "access-token",
    }

    assert "google_oauth_state" not in request_mock.session

    service.get_user_by_auth_provider.assert_awaited_once_with(
        "google",
        "google-user-123",
    )
