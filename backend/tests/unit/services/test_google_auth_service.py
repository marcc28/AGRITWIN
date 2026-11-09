
from unittest.mock import AsyncMock, MagicMock

from urllib.parse import parse_qs, urlsplit

import httpx
import pytest

from fastapi import HTTPException

from services import google_auth_service as google


@pytest.fixture
def google_config(monkeypatch):
    monkeypatch.setattr(google, "GOOGLE_CLIENT_ID", "google-client-id")
    monkeypatch.setattr(google, "GOOGLE_CLIENT_SECRET", "google-client-secret")
    monkeypatch.setattr(
        google,
        "GOOGLE_REDIRECT_URI",
        "https://backend.example.com/api/v1/callback",
    )
    monkeypatch.setattr(
        google,
        "GOOGLE_ALLOWED_CLIENT_IDS",
        ("google-client-id", "google-android-client-id"),
    )


class FakeResponse:
    def __init__(self, data=None, error=None):
        self.data = data or {}
        self.error = error

    def json(self):
        return self.data

    def raise_for_status(self):
        if self.error:
            raise self.error


class FakeAsyncClient:
    def __init__(self, responses=None, error=None):
        self.responses = list(responses or [])
        self.error = error
        self.post = AsyncMock(side_effect=self._post)

    async def _post(self, *args, **kwargs):
        if self.error:
            raise self.error

        if not self.responses:
            raise AssertionError("Unexpected HTTP request")

        response = self.responses.pop(0)

        if isinstance(response, Exception):
            raise response

        return response

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None


def make_http_error():
    request = httpx.Request(
        "POST",
        "https://oauth2.googleapis.com/token",
    )
    response = httpx.Response(400, request=request)

    return httpx.HTTPStatusError(
        "Google error",
        request=request,
        response=response,
    )


# =========================================================
# AUTHORIZATION URL
# =========================================================

def test_authorization_url_contains_correct_parameters(
    monkeypatch,
    google_config,
):
    url = google.GoogleAuthService.authorization_url("test-state")

    parsed = urlsplit(url)
    params = parse_qs(parsed.query)

    assert parsed.scheme == "https"
    assert parsed.netloc == "accounts.google.com"
    assert parsed.path == "/o/oauth2/v2/auth"

    assert params["client_id"] == ["google-client-id"]
    assert params["redirect_uri"] == [
        "https://backend.example.com/api/v1/callback"
    ]
    assert params["response_type"] == ["code"]
    assert params["scope"] == ["openid email profile"]
    assert params["state"] == ["test-state"]
    assert params["access_type"] == ["online"]


@pytest.mark.parametrize(
    "missing_variable",
    [
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI",
    ],
)
def test_authorization_url_fails_without_configuration(
    monkeypatch,
    google_config,
    missing_variable,
):
    monkeypatch.setattr(google, missing_variable, None)

    with pytest.raises(HTTPException) as exc:
        google.GoogleAuthService.authorization_url("state")

    assert exc.value.status_code == 503
    assert exc.value.detail == (
        "Google OAuth client ID, secret, and redirect URI must be configured"
    )


# =========================================================
# EXCHANGE CODE
# =========================================================

@pytest.mark.asyncio
async def test_exchange_code_success(monkeypatch, google_config):
    client = FakeAsyncClient(
        responses=[
            FakeResponse({"id_token": "google-id-token"})
        ]
    )

    monkeypatch.setattr(
        google.httpx,
        "AsyncClient",
        MagicMock(return_value=client),
    )

    result = await google.GoogleAuthService.exchange_code(
        "authorization-code"
    )

    assert result == "google-id-token"

    client.post.assert_awaited_once()

    call = client.post.await_args

    assert call.args[0] == "https://oauth2.googleapis.com/token"
    assert call.kwargs["data"] == {
        "code": "authorization-code",
        "client_id": "google-client-id",
        "client_secret": "google-client-secret",
        "redirect_uri": (
            "https://backend.example.com/api/v1/callback"
        ),
        "grant_type": "authorization_code",
    }


@pytest.mark.parametrize(
    "missing_variable",
    [
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI",
    ],
)
@pytest.mark.asyncio
async def test_exchange_code_fails_without_configuration(
    monkeypatch,
    google_config,
    missing_variable,
):
    monkeypatch.setattr(google, missing_variable, None)

    with pytest.raises(HTTPException) as exc:
        await google.GoogleAuthService.exchange_code("code")

    assert exc.value.status_code == 503
    assert exc.value.detail == "Google OAuth is not configured"


@pytest.mark.asyncio
async def test_exchange_code_missing_id_token(
    monkeypatch,
    google_config,
):
    client = FakeAsyncClient(
        responses=[
            FakeResponse({"access_token": "access-token"})
        ]
    )

    monkeypatch.setattr(
        google.httpx,
        "AsyncClient",
        MagicMock(return_value=client),
    )

    with pytest.raises(HTTPException) as exc:
        await google.GoogleAuthService.exchange_code("code")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Missing Google ID token"


@pytest.mark.asyncio
async def test_exchange_code_empty_id_token(
    monkeypatch,
    google_config,
):
    client = FakeAsyncClient(
        responses=[
            FakeResponse({"id_token": ""})
        ]
    )

    monkeypatch.setattr(
        google.httpx,
        "AsyncClient",
        MagicMock(return_value=client),
    )

    with pytest.raises(HTTPException) as exc:
        await google.GoogleAuthService.exchange_code("code")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Missing Google ID token"


@pytest.mark.asyncio
async def test_exchange_code_http_error(
    monkeypatch,
    google_config,
):
    client = FakeAsyncClient(
        responses=[make_http_error()]
    )

    monkeypatch.setattr(
        google.httpx,
        "AsyncClient",
        MagicMock(return_value=client),
    )

    with pytest.raises(HTTPException) as exc:
        await google.GoogleAuthService.exchange_code("invalid-code")

    assert exc.value.status_code == 502
    assert exc.value.detail == "Could not communicate with Google"


@pytest.mark.asyncio
async def test_exchange_code_connection_error(
    monkeypatch,
    google_config,
):
    request = httpx.Request(
        "POST",
        "https://oauth2.googleapis.com/token",
    )

    client = FakeAsyncClient(
        error=httpx.ConnectError(
            "Connection failed",
            request=request,
        )
    )

    monkeypatch.setattr(
        google.httpx,
        "AsyncClient",
        MagicMock(return_value=client),
    )

    with pytest.raises(HTTPException) as exc:
        await google.GoogleAuthService.exchange_code("code")

    assert exc.value.status_code == 502
    assert exc.value.detail == "Could not communicate with Google"


@pytest.mark.asyncio
async def test_exchange_code_timeout(
    monkeypatch,
    google_config,
):
    request = httpx.Request(
        "POST",
        "https://oauth2.googleapis.com/token",
    )

    client = FakeAsyncClient(
        error=httpx.TimeoutException(
            "Request timed out",
            request=request,
        )
    )

    monkeypatch.setattr(
        google.httpx,
        "AsyncClient",
        MagicMock(return_value=client),
    )

    with pytest.raises(HTTPException) as exc:
        await google.GoogleAuthService.exchange_code("code")

    assert exc.value.status_code == 502
    assert exc.value.detail == "Could not communicate with Google"


# =========================================================
# IDENTITY FROM TOKEN
# =========================================================

def test_identity_from_token_success(
    monkeypatch,
    google_config,
):
    identity = {
        "sub": "google-user-123",
        "email": " USER@EXAMPLE.COM ",
        "email_verified": True,
        "name": "Test User",
        "picture": "https://example.com/photo.jpg",
    }

    verify = MagicMock(return_value=identity)

    monkeypatch.setattr(
        google.id_token,
        "verify_oauth2_token",
        verify,
    )

    result = google.GoogleAuthService.identity_from_token(
        "valid-id-token"
    )

    assert result == {
        "sub": "google-user-123",
        "email": "user@example.com",
        "email_verified": True,
        "name": "Test User",
        "picture": "https://example.com/photo.jpg",
    }

    verify.assert_called_once()
    assert verify.call_args.args[0] == "valid-id-token"
    assert verify.call_args.args[2] == "google-client-id"


def test_identity_from_token_tries_multiple_client_ids(
    monkeypatch,
    google_config,
):
    identity = {
        "sub": "google-user-123",
        "email": "user@example.com",
        "email_verified": True,
    }

    verify = MagicMock(
        side_effect=[
            ValueError("Wrong audience"),
            identity,
        ]
    )

    monkeypatch.setattr(
        google.id_token,
        "verify_oauth2_token",
        verify,
    )

    result = google.GoogleAuthService.identity_from_token("token")

    assert result["sub"] == "google-user-123"
    assert result["email"] == "user@example.com"
    assert verify.call_count == 2

    assert verify.call_args_list[0].args[2] == "google-client-id"
    assert verify.call_args_list[1].args[2] == "google-android-client-id"


def test_identity_from_token_fails_without_allowed_client_ids(
    monkeypatch,
    google_config,
):
    monkeypatch.setattr(
        google,
        "GOOGLE_ALLOWED_CLIENT_IDS",
        (),
    )

    with pytest.raises(HTTPException) as exc:
        google.GoogleAuthService.identity_from_token("token")

    assert exc.value.status_code == 503
    assert exc.value.detail == (
        "Google sign-in is not configured on this server"
    )


def test_identity_from_token_rejects_invalid_token(
    monkeypatch,
    google_config,
):
    verify = MagicMock(
        side_effect=ValueError("Invalid token")
    )

    monkeypatch.setattr(
        google.id_token,
        "verify_oauth2_token",
        verify,
    )

    with pytest.raises(HTTPException) as exc:
        google.GoogleAuthService.identity_from_token("invalid-token")

    assert exc.value.status_code == 401
    assert "Invalid Google ID token" in exc.value.detail
    assert verify.call_count == 2


@pytest.mark.parametrize(
    "identity",
    [
        {
            "email": "user@example.com",
            "email_verified": True,
        },
        {
            "sub": "",
            "email": "user@example.com",
            "email_verified": True,
        },
        {
            "sub": "google-123",
            "email": "",
            "email_verified": True,
        },
        {
            "sub": "google-123",
            "email": None,
            "email_verified": True,
        },
    ],
)
def test_identity_from_token_rejects_incomplete_identity(
    monkeypatch,
    google_config,
    identity,
):
    monkeypatch.setattr(
        google.id_token,
        "verify_oauth2_token",
        MagicMock(return_value=identity),
    )

    with pytest.raises(HTTPException) as exc:
        google.GoogleAuthService.identity_from_token("token")

    assert exc.value.status_code == 400
    assert exc.value.detail == (
        "Google account information is incomplete"
    )


def test_identity_from_token_rejects_unverified_email(
    monkeypatch,
    google_config,
):
    identity = {
        "sub": "google-123",
        "email": "user@example.com",
        "email_verified": False,
    }

    monkeypatch.setattr(
        google.id_token,
        "verify_oauth2_token",
        MagicMock(return_value=identity),
    )

    with pytest.raises(HTTPException) as exc:
        google.GoogleAuthService.identity_from_token("token")

    assert exc.value.status_code == 403
    assert exc.value.detail == "Google email is not verified"


def test_identity_from_token_rejects_missing_email_verified(
    monkeypatch,
    google_config,
):
    identity = {
        "sub": "google-123",
        "email": "user@example.com",
    }

    monkeypatch.setattr(
        google.id_token,
        "verify_oauth2_token",
        MagicMock(return_value=identity),
    )

    with pytest.raises(HTTPException) as exc:
        google.GoogleAuthService.identity_from_token("token")

    assert exc.value.status_code == 403
