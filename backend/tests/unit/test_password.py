
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import httpx
import jwt
import pytest
from fastapi import BackgroundTasks, HTTPException

# Configuració necessària abans d'importar el router.
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-password-tests")
os.environ.setdefault("APP_HOST", "https://test.agritwin.com")
os.environ.setdefault("FORGET_PASSWORD_URL", "reset-password")
os.environ.setdefault("BREVO_API_KEY", "test-brevo-key")
os.environ.setdefault("BREVO_SENDER_EMAIL", "test@agritwin.com")
os.environ.setdefault("BREVO_SENDER_NAME", "AGRITWIN")
os.environ.setdefault("FORGET_PASSWORD_LINK_EXPIRE_MINUTES", "15")

import backend.api.v1.forgot_password as password_routes

from models.password import (
    ForgetPasswordRequest,
    ResetPasswordRequest,
)

# =====================================================
# HELPERS
# =====================================================

@pytest.fixture
def db():
    return MagicMock()


@pytest.fixture
def service(monkeypatch):
    mock_service = MagicMock()
    mock_service.get_user_by_email = AsyncMock()
    mock_service.update_password = AsyncMock()

    monkeypatch.setattr(
        password_routes,
        "PasswordService",
        MagicMock(return_value=mock_service),
    )

    return mock_service


def create_token(
    email="joan@test.com",
    purpose="password_reset",
    expires_delta=15,
    jti="test-jti",
):
    now = datetime.now(timezone.utc)

    payload = {
        "sub": email,
        "jti": jti,
        "iat": now,
        "exp": now + timedelta(minutes=expires_delta),
        "purpose": purpose,
    }

    return jwt.encode(
        payload,
        password_routes.SECRET_KEY,
        algorithm="HS256",
    )


def reset_request(
    token,
    new_password="new-password-123",
    confirm_password="new-password-123",
):
    return ResetPasswordRequest(
        secret_token=token,
        new_password=new_password,
        confirm_password=confirm_password,
    )


# =====================================================
# JWT TOKEN TESTS
# =====================================================

def test_create_reset_password_token():
    token = password_routes.create_reset_password_token(
        "joan@test.com"
    )

    payload = password_routes.decode_reset_password_token(token)

    assert payload is not None
    assert payload["email"] == "joan@test.com"
    assert isinstance(payload["jti"], str)
    assert payload["jti"]
    assert isinstance(payload["expires_at"], datetime)
    assert payload["expires_at"].tzinfo == timezone.utc


def test_create_reset_password_token_generates_unique_jti():
    token1 = password_routes.create_reset_password_token(
        "joan@test.com"
    )
    token2 = password_routes.create_reset_password_token(
        "joan@test.com"
    )

    payload1 = password_routes.decode_reset_password_token(token1)
    payload2 = password_routes.decode_reset_password_token(token2)

    assert payload1["jti"] != payload2["jti"]


def test_decode_reset_password_token_invalid():
    result = password_routes.decode_reset_password_token(
        "invalid-token"
    )

    assert result is None


def test_decode_reset_password_token_expired():
    token = create_token(expires_delta=-1)

    result = password_routes.decode_reset_password_token(token)

    assert result is None


def test_decode_reset_password_token_wrong_purpose():
    token = create_token(purpose="access_token")

    result = password_routes.decode_reset_password_token(token)

    assert result is None


def test_decode_reset_password_token_wrong_secret():
    token = jwt.encode(
        {
            "sub": "joan@test.com",
            "jti": "test-jti",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc)
            + timedelta(minutes=15),
            "purpose": "password_reset",
        },
        "another-secret",
        algorithm="HS256",
    )

    result = password_routes.decode_reset_password_token(token)

    assert result is None


# =====================================================
# FORGET PASSWORD TESTS
# =====================================================

@pytest.mark.asyncio
async def test_forget_password_existing_user(
    db,
    service,
    monkeypatch,
):
    user = MagicMock()
    user.email = "joan@test.com"

    service.get_user_by_email.return_value = user

    create_token_mock = MagicMock(return_value="generated-token")
    monkeypatch.setattr(
        password_routes,
        "create_reset_password_token",
        create_token_mock,
    )

    background_tasks = BackgroundTasks()

    request = ForgetPasswordRequest(
        email="joan@test.com"
    )

    result = await password_routes.forget_password(
        request=request,
        background_tasks=background_tasks,
        db=db,
    )

    assert result["success"] is True
    assert result["status_code"] == 200

    service.get_user_by_email.assert_awaited_once_with(
        "joan@test.com"
    )

    create_token_mock.assert_called_once_with(
        "joan@test.com"
    )

    assert len(background_tasks.tasks) == 1

    task = background_tasks.tasks[0]

    assert task.func == password_routes.send_password_reset_email
    assert task.args[0] == "joan@test.com"
    assert task.args[1].endswith(
        "/reset-password/generated-token"
    )


@pytest.mark.asyncio
async def test_forget_password_nonexistent_user(
    db,
    service,
    monkeypatch,
):
    service.get_user_by_email.return_value = None

    create_token_mock = MagicMock()
    monkeypatch.setattr(
        password_routes,
        "create_reset_password_token",
        create_token_mock,
    )

    background_tasks = BackgroundTasks()

    request = ForgetPasswordRequest(
        email="unknown@test.com"
    )

    result = await password_routes.forget_password(
        request=request,
        background_tasks=background_tasks,
        db=db,
    )

    assert result["success"] is True
    assert result["status_code"] == 200

    service.get_user_by_email.assert_awaited_once_with(
        "unknown@test.com"
    )

    create_token_mock.assert_not_called()
    assert len(background_tasks.tasks) == 0


@pytest.mark.asyncio
async def test_forget_password_does_not_reveal_user_existence(
    db,
    service,
):
    background_tasks_existing = BackgroundTasks()
    background_tasks_missing = BackgroundTasks()

    service.get_user_by_email.side_effect = [
        MagicMock(email="joan@test.com"),
        None,
    ]

    request_existing = ForgetPasswordRequest(
        email="joan@test.com"
    )
    request_missing = ForgetPasswordRequest(
        email="unknown@test.com"
    )

    result_existing = await password_routes.forget_password(
        request_existing,
        background_tasks_existing,
        db,
    )

    result_missing = await password_routes.forget_password(
        request_missing,
        background_tasks_missing,
        db,
    )

    assert result_existing == result_missing


# =====================================================
# RESET PASSWORD TESTS
# =====================================================

@pytest.mark.asyncio
async def test_reset_password_success(db, service):
    token = create_token()

    service.update_password.return_value = "updated"

    request = reset_request(token)

    result = await password_routes.reset_password(
        request=request,
        db=db,
    )

    assert result.success is True
    assert result.status_code == 200
    assert result.message == "Password reset successfully"

    service.update_password.assert_awaited_once()

    kwargs = service.update_password.await_args.kwargs

    assert kwargs["email"] == "joan@test.com"
    assert kwargs["new_password"] == "new-password-123"
    assert kwargs["jti"] == "test-jti"
    assert isinstance(kwargs["expires_at"], datetime)


@pytest.mark.asyncio
async def test_reset_password_invalid_token(db, service):
    request = reset_request("invalid-token")

    with pytest.raises(HTTPException) as exc:
        await password_routes.reset_password(
            request=request,
            db=db,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid or expired reset link"

    service.update_password.assert_not_awaited()


@pytest.mark.asyncio
async def test_reset_password_expired_token(db, service):
    token = create_token(expires_delta=-1)

    request = reset_request(token)

    with pytest.raises(HTTPException) as exc:
        await password_routes.reset_password(
            request=request,
            db=db,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid or expired reset link"

    service.update_password.assert_not_awaited()


@pytest.mark.asyncio
async def test_reset_password_mismatched_passwords(db, service):
    token = create_token()

    request = reset_request(
        token,
        new_password="password-one",
        confirm_password="password-two",
    )

    with pytest.raises(HTTPException) as exc:
        await password_routes.reset_password(
            request=request,
            db=db,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Passwords do not match"

    service.update_password.assert_not_awaited()


@pytest.mark.asyncio
async def test_reset_password_too_short(db, service):
    token = create_token()

    request = reset_request(
        token,
        new_password="short",
        confirm_password="short",
    )

    with pytest.raises(HTTPException) as exc:
        await password_routes.reset_password(
            request=request,
            db=db,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Password must be at least 8 characters"

    service.update_password.assert_not_awaited()


@pytest.mark.asyncio
async def test_reset_password_user_not_found(db, service):
    token = create_token()

    service.update_password.return_value = "not_found"

    request = reset_request(token)

    with pytest.raises(HTTPException) as exc:
        await password_routes.reset_password(
            request=request,
            db=db,
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "User not found"


@pytest.mark.asyncio
async def test_reset_password_same_password(db, service):
    token = create_token()

    service.update_password.return_value = "same_password"

    request = reset_request(token)

    with pytest.raises(HTTPException) as exc:
        await password_routes.reset_password(
            request=request,
            db=db,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == (
        "New password cannot be the same as the current password"
    )


@pytest.mark.asyncio
async def test_reset_password_token_already_used(db, service):
    token = create_token()

    service.update_password.return_value = "token_used"

    request = reset_request(token)

    with pytest.raises(HTTPException) as exc:
        await password_routes.reset_password(
            request=request,
            db=db,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "This reset link has already been used"


@pytest.mark.asyncio
async def test_reset_password_unexpected_service_result(db, service):
    token = create_token()

    service.update_password.return_value = "unexpected"

    request = reset_request(token)

    with pytest.raises(HTTPException) as exc:
        await password_routes.reset_password(
            request=request,
            db=db,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Unable to reset password"


# =====================================================
# BREVO EMAIL TESTS
# =====================================================

@pytest.mark.asyncio
async def test_send_password_reset_email_success(monkeypatch):
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json.return_value = {
        "messageId": "test-message-123"
    }

    post_mock = AsyncMock(return_value=response)

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        post = post_mock

    monkeypatch.setattr(
        password_routes.httpx,
        "AsyncClient",
        FakeAsyncClient,
    )

    template = MagicMock()
    template.render.return_value = "<html>Reset password</html>"

    monkeypatch.setattr(
        password_routes.TEMPLATES.env,
        "get_template",
        MagicMock(return_value=template),
    )

    result = await password_routes.send_password_reset_email(
        recipient="joan@test.com",
        reset_link="https://test.agritwin.com/reset-password/token",
    )

    assert result["messageId"] == "test-message-123"

    post_mock.assert_awaited_once()

    args = post_mock.await_args

    assert args.args[0] == "https://api.brevo.com/v3/smtp/email"

    payload = args.kwargs["json"]

    assert payload["to"][0]["email"] == "joan@test.com"
    assert payload["sender"]["email"] == (
        password_routes.BREVO_SENDER_EMAIL
    )
    assert payload["htmlContent"] == "<html>Reset password</html>"


@pytest.mark.asyncio
async def test_send_password_reset_email_http_error(monkeypatch):
    request = httpx.Request(
        "POST",
        "https://api.brevo.com/v3/smtp/email",
    )

    response = httpx.Response(
        401,
        request=request,
        text="Unauthorized",
    )

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, *args, **kwargs):
            return response

    monkeypatch.setattr(
        password_routes.httpx,
        "AsyncClient",
        FakeAsyncClient,
    )

    template = MagicMock()
    template.render.return_value = "<html></html>"

    monkeypatch.setattr(
        password_routes.TEMPLATES.env,
        "get_template",
        MagicMock(return_value=template),
    )

    with pytest.raises(httpx.HTTPStatusError):
        await password_routes.send_password_reset_email(
            recipient="joan@test.com",
            reset_link="https://test.agritwin.com/reset-password/token",
        )


# =====================================================
# RESET PASSWORD HTML PAGE TESTS
# =====================================================

@pytest.mark.asyncio
async def test_reset_password_page_valid_token(monkeypatch):
    token = create_token()

    template_response = MagicMock()

    template_response_mock = MagicMock(
        return_value=template_response
    )

    monkeypatch.setattr(
        password_routes.TEMPLATES,
        "TemplateResponse",
        template_response_mock,
    )

    request = MagicMock()

    result = await password_routes.reset_password_page(
        request=request,
        token=token,
    )

    assert result == template_response

    kwargs = template_response_mock.call_args.kwargs

    assert kwargs["name"] == "reset_password.html"
    assert kwargs["context"]["token"] == token
    assert kwargs["context"]["error"] is None


@pytest.mark.asyncio
async def test_reset_password_page_invalid_token(monkeypatch):
    template_response = MagicMock()

    template_response_mock = MagicMock(
        return_value=template_response
    )

    monkeypatch.setattr(
        password_routes.TEMPLATES,
        "TemplateResponse",
        template_response_mock,
    )

    request = MagicMock()

    result = await password_routes.reset_password_page(
        request=request,
        token="invalid-token",
    )

    assert result == template_response

    kwargs = template_response_mock.call_args.kwargs

    assert kwargs["name"] == "reset_password.html"
    assert kwargs["context"]["token"] == ""
    assert kwargs["context"]["error"] is not None
    assert kwargs["status_code"] == 400
