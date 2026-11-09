
import jwt
import pytest

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from fastapi import HTTPException

from services import social_auth_service as social


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def make_db_mock(monkeypatch):
    """Creates a mocked async database session."""
    db = AsyncMock()

    # db.execute() is awaited, so it must remain async.
    # But result.one_or_none() is synchronous in SQLAlchemy's Result API.
    execute_result = MagicMock()
    execute_result.one_or_none = MagicMock(return_value=None)

    db.execute = AsyncMock(return_value=execute_result)
    db.add = MagicMock()

    context_manager = AsyncMock()
    context_manager.__aenter__.return_value = db
    context_manager.__aexit__.return_value = None

    monkeypatch.setattr(
        social,
        "AsyncSessionLocal",
        lambda: context_manager,
    )

    return db

# ---------------------------------------------------------
# validate_app_redirect_uri
# ---------------------------------------------------------

@pytest.mark.parametrize(
    "uri, provider",
    [
        (
            "http://localhost:8081/auth/oauth-callback?provider=google",
            "google",
        ),
        (
            "https://agritwin.com/auth/oauth-callback?provider=facebook",
            "facebook",
        ),
        (
            "https://www.agritwin.com/auth/oauth-callback?provider=x",
            "x",
        ),
        (
            "agritwin://auth/oauth-callback?provider=google",
            "google",
        ),
        (
            "exp://localhost:8081/auth/oauth-callback?provider=facebook",
            "facebook",
        ),
        (
            "exp://192.168.1.10:8081/auth/oauth-callback?provider=x",
            "x",
        ),
    ],
)
def test_validate_valid_redirect_uris(uri, provider):
    assert social.validate_app_redirect_uri(uri, provider) == uri


@pytest.mark.parametrize(
    "uri, provider",
    [
        (
            "/auth/oauth-callback?provider=google",
            "google",
        ),
        (
            "https://localhost:8081/auth/oauth-callback?provider=google#fragment",
            "google",
        ),
        (
            "https://user:password@localhost:8081/auth/oauth-callback?provider=google",
            "google",
        ),
        (
            "https://localhost:8081/wrong-path?provider=google",
            "google",
        ),
        (
            "https://localhost:8081/auth/oauth-callback?provider=facebook",
            "google",
        ),
        (
            "https://localhost:8081/auth/oauth-callback",
            "google",
        ),
        (
            "ftp://localhost/auth/oauth-callback?provider=google",
            "google",
        ),
        (
            "https://evil.com/auth/oauth-callback?provider=google",
            "google",
        ),
        (
            "exp://example.com/auth/oauth-callback?provider=google",
            "google",
        ),
        (
            "agritwin://evil/oauth-callback?provider=google",
            "google",
        ),
        (
            "agritwin://auth/wrong-path?provider=google",
            "google",
        ),
    ],
)
def test_validate_invalid_redirect_uris(uri, provider):
    with pytest.raises(HTTPException) as exc:
        social.validate_app_redirect_uri(uri, provider)

    assert exc.value.status_code == 400


def test_validate_custom_allowed_hosts(monkeypatch):
    monkeypatch.setenv(
        "SOCIAL_AUTH_REDIRECT_HOSTS",
        "myapp.example,localhost",
    )

    uri = "https://myapp.example/auth/oauth-callback?provider=x"

    assert social.validate_app_redirect_uri(uri, "x") == uri


def test_validate_host_not_in_custom_allowlist(monkeypatch):
    monkeypatch.setenv(
        "SOCIAL_AUTH_REDIRECT_HOSTS",
        "myapp.example",
    )

    uri = "https://localhost/auth/oauth-callback?provider=x"

    with pytest.raises(HTTPException):
        social.validate_app_redirect_uri(uri, "x")


def test_validate_private_expo_ip():
    uri = "exp://10.0.0.5:8081/auth/oauth-callback?provider=x"

    assert social.validate_app_redirect_uri(uri, "x") == uri


def test_validate_public_expo_ip():
    uri = "exp://8.8.8.8:8081/auth/oauth-callback?provider=x"

    with pytest.raises(HTTPException) as exc:
        social.validate_app_redirect_uri(uri, "x")

    assert exc.value.detail == "Invalid Expo redirect URI"


# ---------------------------------------------------------
# add_ticket_to_redirect_uri
# ---------------------------------------------------------

def test_add_ticket_to_redirect_uri():
    uri = "https://localhost:8081/auth/oauth-callback?provider=google"
    result = social.add_ticket_to_redirect_uri(uri, "test-ticket")

    assert result.startswith(
        "https://localhost:8081/auth/oauth-callback?"
    )
    assert "provider=google" in result
    assert "ticket=test-ticket" in result


def test_add_ticket_preserves_existing_query_parameters():
    uri = (
        "https://localhost:8081/auth/oauth-callback"
        "?provider=x&source=login"
    )

    result = social.add_ticket_to_redirect_uri(uri, "abc123")

    from urllib.parse import parse_qs, urlsplit

    query = parse_qs(urlsplit(result).query)

    assert query["provider"] == ["x"]
    assert query["source"] == ["login"]
    assert query["ticket"] == ["abc123"]


def test_add_ticket_removes_fragment():
    uri = (
        "https://localhost:8081/auth/oauth-callback"
        "?provider=google#old-fragment"
    )

    result = social.add_ticket_to_redirect_uri(uri, "ticket")

    assert "#" not in result


# ---------------------------------------------------------
# create_social_auth_ticket
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_create_social_auth_ticket(monkeypatch):
    db = make_db_mock(monkeypatch)

    monkeypatch.setattr(
        social.secrets,
        "token_urlsafe",
        lambda size: "generated-ticket",
    )

    identity = {
        "sub": "google-user-123",
        "email": "user@example.com",
        "name": "Test User",
    }

    ticket = await social.create_social_auth_ticket(
        "google",
        identity,
    )

    assert ticket == "generated-ticket"

    db.execute.assert_awaited_once()
    db.add.assert_called_once()
    db.commit.assert_awaited_once()

    saved_ticket = db.add.call_args.args[0]

    assert saved_ticket.ticket == "generated-ticket"
    assert saved_ticket.provider == "google"
    assert saved_ticket.provider_user_id == "google-user-123"
    assert saved_ticket.email == "user@example.com"
    assert saved_ticket.display_name == "Test User"
    assert saved_ticket.expires_at is not None


@pytest.mark.asyncio
async def test_create_ticket_without_optional_identity_fields(monkeypatch):
    db = make_db_mock(monkeypatch)

    monkeypatch.setattr(
        social.secrets,
        "token_urlsafe",
        lambda size: "ticket-without-profile",
    )

    ticket = await social.create_social_auth_ticket(
        "facebook",
        {"sub": 12345},
    )

    saved_ticket = db.add.call_args.args[0]

    assert ticket == "ticket-without-profile"
    assert saved_ticket.provider_user_id == "12345"
    assert saved_ticket.email is None
    assert saved_ticket.display_name == ""


# ---------------------------------------------------------
# consume_social_auth_ticket
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_consume_valid_ticket(monkeypatch):
    db = make_db_mock(monkeypatch)

    row = SimpleNamespace(
        provider_user_id="12345",
        email="user@example.com",
        display_name="Test User",
    )

    db.execute.return_value.one_or_none.return_value = row

    result = await social.consume_social_auth_ticket(
        "valid-ticket",
        "google",
    )

    assert result == {
        "sub": "12345",
        "email": "user@example.com",
        "name": "Test User",
    }

    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()

@pytest.mark.asyncio
async def test_consume_ticket_without_display_name(monkeypatch):
    db = make_db_mock(monkeypatch)

    row = SimpleNamespace(
        provider_user_id="12345",
        email=None,
        display_name=None,
    )

    db.execute.return_value.one_or_none.return_value = row

    result = await social.consume_social_auth_ticket(
        "valid-ticket",
        "facebook",
    )

    assert result["sub"] == "12345"
    assert result["email"] is None
    assert result["name"] == ""

@pytest.mark.asyncio
async def test_consume_invalid_or_expired_ticket(monkeypatch):
    db = make_db_mock(monkeypatch)

    db.execute.return_value.one_or_none.return_value = None

    with pytest.raises(HTTPException) as exc:
        await social.consume_social_auth_ticket(
            "invalid-ticket",
            "google",
        )

    assert exc.value.status_code == 401
    assert exc.value.detail == "Social login ticket is invalid or expired"
    db.commit.assert_awaited_once()

# ---------------------------------------------------------
# create_social_signup_token
# ---------------------------------------------------------

def test_create_social_signup_token():
    identity = {
        "sub": "facebook-user-123",
        "email": "user@example.com",
        "name": "Test User",
    }

    token = social.create_social_signup_token(
        "facebook",
        identity,
    )

    payload = jwt.decode(
        token,
        social.SECRET_KEY,
        algorithms=[social.ALGORITHM],
    )

    assert payload["purpose"] == "social_signup"
    assert payload["provider"] == "facebook"
    assert payload["provider_sub"] == "facebook-user-123"
    assert payload["email"] == "user@example.com"
    assert payload["name"] == "Test User"
    assert "exp" in payload


def test_signup_token_converts_sub_to_string():
    token = social.create_social_signup_token(
        "x",
        {"sub": 12345},
    )

    payload = jwt.decode(
        token,
        social.SECRET_KEY,
        algorithms=[social.ALGORITHM],
    )

    assert payload["provider_sub"] == "12345"


def test_signup_token_without_optional_fields():
    token = social.create_social_signup_token(
        "google",
        {"sub": "123"},
    )

    payload = jwt.decode(
        token,
        social.SECRET_KEY,
        algorithms=[social.ALGORITHM],
    )

    assert payload["email"] is None
    assert payload["name"] == ""


# ---------------------------------------------------------
# _token_pair
# ---------------------------------------------------------

def test_token_pair(monkeypatch):
    monkeypatch.setattr(
        social,
        "create_access_token",
        MagicMock(return_value="access-token"),
    )

    monkeypatch.setattr(
        social,
        "create_refresh_token",
        MagicMock(return_value="refresh-token"),
    )

    result = social._token_pair("testuser")

    assert result == {
        "access_token": "access-token",
        "refresh_token": "refresh-token",
        "token_type": "bearer",
        "username": "testuser",
    }

    social.create_access_token.assert_called_once()
    social.create_refresh_token.assert_called_once()


# ---------------------------------------------------------
# complete_social_login
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_complete_login_existing_user(monkeypatch):
    db = make_db_mock(monkeypatch)

    user = SimpleNamespace(username="existing-user")

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(return_value=user)
    service.get_user_by_email = AsyncMock()

    monkeypatch.setattr(
        social,
        "UserService",
        MagicMock(return_value=service),
    )

    monkeypatch.setattr(
        social,
        "_token_pair",
        MagicMock(return_value={"access_token": "token"}),
    )

    result = await social.complete_social_login(
        "google",
        {"sub": "123", "email": "USER@example.com"},
    )

    assert result == {"access_token": "token"}

    service.get_user_by_auth_provider.assert_awaited_once_with(
        "google",
        "123",
    )

    service.get_user_by_email.assert_not_awaited()


@pytest.mark.asyncio
async def test_complete_login_email_already_registered(monkeypatch):
    make_db_mock(monkeypatch)

    existing_email_user = SimpleNamespace(username="other-user")

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(return_value=None)
    service.get_user_by_email = AsyncMock(
        return_value=existing_email_user,
    )

    monkeypatch.setattr(
        social,
        "UserService",
        MagicMock(return_value=service),
    )

    with pytest.raises(HTTPException) as exc:
        await social.complete_social_login(
            "facebook",
            {
                "sub": "facebook-123",
                "email": "  USER@EXAMPLE.COM ",
            },
        )

    assert exc.value.status_code == 409
    assert "already belongs" in exc.value.detail

    service.get_user_by_email.assert_awaited_once_with(
        "user@example.com",
    )


@pytest.mark.asyncio
async def test_complete_login_new_user(monkeypatch):
    make_db_mock(monkeypatch)

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(return_value=None)
    service.get_user_by_email = AsyncMock(return_value=None)

    monkeypatch.setattr(
        social,
        "UserService",
        MagicMock(return_value=service),
    )

    monkeypatch.setattr(
        social,
        "create_social_signup_token",
        MagicMock(return_value="signup-token"),
    )

    result = await social.complete_social_login(
        "google",
        {
            "sub": 12345,
            "email": "  USER@EXAMPLE.COM ",
            "name": "Test User",
        },
    )

    assert result == {
        "status": "signup_required",
        "signup_token": "signup-token",
        "email": "user@example.com",
        "name": "Test User",
        "provider": "google",
    }

    social.create_social_signup_token.assert_called_once_with(
        "google",
        {
            "sub": "12345",
            "email": "user@example.com",
            "name": "Test User",
        },
    )


@pytest.mark.asyncio
async def test_complete_login_new_user_without_email(monkeypatch):
    make_db_mock(monkeypatch)

    service = MagicMock()
    service.get_user_by_auth_provider = AsyncMock(return_value=None)
    service.get_user_by_email = AsyncMock()

    monkeypatch.setattr(
        social,
        "UserService",
        MagicMock(return_value=service),
    )

    monkeypatch.setattr(
        social,
        "create_social_signup_token",
        MagicMock(return_value="signup-token"),
    )

    result = await social.complete_social_login(
        "x",
        {"sub": "x-123", "name": "X User"},
    )

    assert result["status"] == "signup_required"
    assert result["email"] == ""
    assert result["provider"] == "x"

    service.get_user_by_email.assert_not_awaited()
