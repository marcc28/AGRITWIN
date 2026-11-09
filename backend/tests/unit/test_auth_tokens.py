
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import jwt
import pytest
from fastapi import HTTPException

from api.v1 import auth


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def make_db_mock(monkeypatch, result=None):
    """Crea una sessió asíncrona simulada."""
    db = MagicMock()
    db.execute = AsyncMock(return_value=result or MagicMock())
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.flush = AsyncMock()

    context = MagicMock()
    context.__aenter__ = AsyncMock(return_value=db)
    context.__aexit__ = AsyncMock(return_value=None)

    monkeypatch.setattr(auth, "AsyncSessionLocal", lambda: context)

    return db


def make_profile_row():
    return SimpleNamespace(
        name="Joan Garcia",
        language="ca",
        notifications_enabled=True,
        weather_alerts_enabled=False,
    )


def make_user():
    return SimpleNamespace(
        id="user-123",
        username="joan",
        email="joan@test.com",
        password_hash="hashed-password",
    )


# ---------------------------------------------------------------------
# Access and refresh tokens
# ---------------------------------------------------------------------

def test_create_access_token_default_expiration():
    token = auth.create_access_token({"sub": "joan"})

    payload = jwt.decode(
        token,
        auth.SECRET_KEY,
        algorithms=[auth.ALGORITHM],
    )

    assert payload["sub"] == "joan"
    assert payload["exp"] > datetime.now(UTC).timestamp()


def test_create_access_token_custom_expiration():
    token = auth.create_access_token(
        {"sub": "joan"},
        expires_delta=timedelta(minutes=30),
    )

    payload = jwt.decode(
        token,
        auth.SECRET_KEY,
        algorithms=[auth.ALGORITHM],
    )

    assert payload["sub"] == "joan"
    assert payload["exp"] > datetime.now(UTC).timestamp()


def test_create_refresh_token():
    token = auth.create_refresh_token({"sub": "joan"})

    payload = jwt.decode(
        token,
        auth.SECRET_KEY,
        algorithms=[auth.ALGORITHM],
    )

    assert payload["sub"] == "joan"
    assert payload["type"] == "refresh"
    assert payload["exp"] > datetime.now(UTC).timestamp()


# ---------------------------------------------------------------------
# Password verification
# ---------------------------------------------------------------------

def test_verify_password_correct(monkeypatch):
    verify = MagicMock(return_value=True)
    monkeypatch.setattr(auth.password_hash, "verify", verify)

    result = auth.verify_password("password123", "hashed-password")

    assert result is True
    verify.assert_called_once_with("password123", "hashed-password")


def test_verify_password_incorrect(monkeypatch):
    verify = MagicMock(return_value=False)
    monkeypatch.setattr(auth.password_hash, "verify", verify)

    result = auth.verify_password("wrong-password", "hashed-password")

    assert result is False


# ---------------------------------------------------------------------
# Authenticate user
# ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_authenticate_user_success(monkeypatch):
    user = make_user()

    service = MagicMock()
    service.get_user_by_username = AsyncMock(return_value=user)

    monkeypatch.setattr(auth, "UserService", MagicMock(return_value=service))
    make_db_mock(monkeypatch)

    monkeypatch.setattr(auth, "verify_password", MagicMock(return_value=True))

    result = await auth.authenticate_user("joan", "password123")

    assert result == user
    service.get_user_by_username.assert_awaited_once_with("joan")


@pytest.mark.asyncio
async def test_authenticate_user_not_found(monkeypatch):
    service = MagicMock()
    service.get_user_by_username = AsyncMock(return_value=None)

    monkeypatch.setattr(auth, "UserService", MagicMock(return_value=service))
    make_db_mock(monkeypatch)

    result = await auth.authenticate_user("inexistent", "password123")

    assert result is False


@pytest.mark.asyncio
async def test_authenticate_user_without_password(monkeypatch):
    user = make_user()
    user.password_hash = None

    service = MagicMock()
    service.get_user_by_username = AsyncMock(return_value=user)

    monkeypatch.setattr(auth, "UserService", MagicMock(return_value=service))
    make_db_mock(monkeypatch)

    result = await auth.authenticate_user("joan", "password123")

    assert result is False


@pytest.mark.asyncio
async def test_authenticate_user_wrong_password(monkeypatch):
    user = make_user()

    service = MagicMock()
    service.get_user_by_username = AsyncMock(return_value=user)

    monkeypatch.setattr(auth, "UserService", MagicMock(return_value=service))
    make_db_mock(monkeypatch)

    monkeypatch.setattr(auth, "verify_password", MagicMock(return_value=False))

    result = await auth.authenticate_user("joan", "wrong-password")

    assert result is False


# ---------------------------------------------------------------------
# User service dependency
# ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_user_service(monkeypatch):
    db = make_db_mock(monkeypatch)

    service = MagicMock()
    user_service_class = MagicMock(return_value=service)

    monkeypatch.setattr(auth, "UserService", user_service_class)

    generator = auth.get_user_service()
    result = await anext(generator)

    assert result == service
    user_service_class.assert_called_once_with(session=db)

    await generator.aclose()


# ---------------------------------------------------------------------
# Get current user
# ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_current_user_success(monkeypatch):
    user = make_user()

    service = MagicMock()
    service.get_user_by_username = AsyncMock(return_value=user)

    monkeypatch.setattr(auth, "UserService", MagicMock(return_value=service))
    make_db_mock(monkeypatch)

    token = auth.create_access_token({"sub": "joan"})

    result = await auth.get_current_user(token)

    assert result == user
    service.get_user_by_username.assert_awaited_once_with("joan")


@pytest.mark.asyncio
async def test_get_current_user_invalid_token():
    with pytest.raises(HTTPException) as exc:
        await auth.get_current_user("invalid-token")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Could not validate credentials"
    assert exc.value.headers == {"WWW-Authenticate": "Bearer"}


@pytest.mark.asyncio
async def test_get_current_user_without_username():
    token = auth.create_access_token({"email": "joan@test.com"})

    with pytest.raises(HTTPException) as exc:
        await auth.get_current_user(token)

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_user_not_found(monkeypatch):
    service = MagicMock()
    service.get_user_by_username = AsyncMock(return_value=None)

    monkeypatch.setattr(auth, "UserService", MagicMock(return_value=service))
    make_db_mock(monkeypatch)

    token = auth.create_access_token({"sub": "inexistent"})

    with pytest.raises(HTTPException) as exc:
        await auth.get_current_user(token)

    assert exc.value.status_code == 401


# ---------------------------------------------------------------------
# Login endpoint
# ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_for_access_token_success(monkeypatch):
    user = make_user()

    monkeypatch.setattr(
        auth,
        "authenticate_user",
        AsyncMock(return_value=user),
    )

    monkeypatch.setattr(
        auth,
        "create_access_token",
        MagicMock(return_value="access-token"),
    )

    monkeypatch.setattr(
        auth,
        "create_refresh_token",
        MagicMock(return_value="refresh-token"),
    )

    form = SimpleNamespace(
        username="joan",
        password="password123",
    )

    result = await auth.login_for_access_token(form)

    assert result == {
        "access_token": "access-token",
        "refresh_token": "refresh-token",
        "token_type": "bearer",
    }


@pytest.mark.asyncio
async def test_login_for_access_token_invalid_credentials(monkeypatch):
    monkeypatch.setattr(
        auth,
        "authenticate_user",
        AsyncMock(return_value=False),
    )

    form = SimpleNamespace(
        username="joan",
        password="wrong-password",
    )

    with pytest.raises(HTTPException) as exc:
        await auth.login_for_access_token(form)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Incorrect username or password"


# ---------------------------------------------------------------------
# Refresh token endpoint
# ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_refresh_token_success(monkeypatch):
    monkeypatch.setattr(
        auth,
        "create_access_token",
        MagicMock(return_value="new-access-token"),
    )

    refresh_token = auth.create_refresh_token({"sub": "joan"})

    result = await auth.refresh_token_endpoint(refresh_token)

    assert result == {
        "access_token": "new-access-token",
        "token_type": "bearer",
    }


@pytest.mark.asyncio
async def test_refresh_token_invalid_token():
    with pytest.raises(HTTPException) as exc:
        await auth.refresh_token_endpoint("invalid-token")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid refresh token"


@pytest.mark.asyncio
async def test_refresh_token_wrong_type():
    access_token = auth.create_access_token({"sub": "joan"})

    with pytest.raises(HTTPException) as exc:
        await auth.refresh_token_endpoint(access_token)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid token type"


@pytest.mark.asyncio
async def test_refresh_token_without_username():
    refresh_token = auth.create_refresh_token({"email": "joan@test.com"})

    with pytest.raises(HTTPException) as exc:
        await auth.refresh_token_endpoint(refresh_token)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid refresh token"


# ---------------------------------------------------------------------
# Profile serialization
# ---------------------------------------------------------------------

def test_me_from_row():
    user = make_user()
    row = make_profile_row()

    result = auth._me_from_row(user, row)

    assert result.username == "joan"
    assert result.email == "joan@test.com"
    assert result.name == "Joan Garcia"
    assert result.language == "ca"
    assert result.notifications_enabled is True
    assert result.weather_alerts_enabled is False


# ---------------------------------------------------------------------
# Read profile
# ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_read_me_success():
    user = make_user()
    profile = make_profile_row()

    service = MagicMock()
    service.get_user_profile = AsyncMock(return_value=profile)

    result = await auth.read_me(user, service)

    assert result.username == user.username
    assert result.name == profile.name
    service.get_user_profile.assert_awaited_once_with(user.id)


@pytest.mark.asyncio
async def test_read_me_profile_not_found():
    user = make_user()

    service = MagicMock()
    service.get_user_profile = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await auth.read_me(user, service)

    assert exc.value.status_code == 404
    assert exc.value.detail == auth.PROFILE_NOT_FOUND


# ---------------------------------------------------------------------
# Update profile
# ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_me_success(monkeypatch):
    user = make_user()
    row = make_profile_row()

    result_mock = MagicMock()
    result_mock.one_or_none.return_value = row

    db = make_db_mock(monkeypatch, result_mock)

    body = SimpleNamespace(
        name="  Joan Garcia  ",
        language="ca",
        notifications_enabled=True,
        weather_alerts_enabled=False,
    )

    result = await auth.update_me(body, user)

    assert result.name == "Joan Garcia"
    assert result.username == user.username
    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_me_empty_name():
    user = make_user()

    body = SimpleNamespace(
        name="   ",
        language="ca",
        notifications_enabled=True,
        weather_alerts_enabled=False,
    )

    with pytest.raises(HTTPException) as exc:
        await auth.update_me(body, user)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Name is required"


@pytest.mark.asyncio
async def test_update_me_profile_not_found(monkeypatch):
    user = make_user()

    result_mock = MagicMock()
    result_mock.one_or_none.return_value = None

    db = make_db_mock(monkeypatch, result_mock)

    body = SimpleNamespace(
        name="Joan Garcia",
        language="ca",
        notifications_enabled=True,
        weather_alerts_enabled=False,
    )

    with pytest.raises(HTTPException) as exc:
        await auth.update_me(body, user)

    assert exc.value.status_code == 404
    assert exc.value.detail == auth.PROFILE_NOT_FOUND
    db.commit.assert_not_awaited()


# ---------------------------------------------------------------------
# Update email
# ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_my_email_success(monkeypatch):
    user = make_user()

    taken_result = MagicMock()
    taken_result.one_or_none.return_value = None

    profile_result = MagicMock()
    profile_result.one_or_none.return_value = make_profile_row()

    db = make_db_mock(monkeypatch)
    db.execute = AsyncMock(side_effect=[taken_result, MagicMock(), profile_result])

    body = SimpleNamespace(email="  NEW@TEST.COM ")

    result = await auth.update_my_email(body, user)

    assert user.email == "new@test.com"
    assert result.email == "new@test.com"
    assert db.execute.await_count == 3
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_my_email_already_registered(monkeypatch):
    user = make_user()

    taken_result = MagicMock()
    taken_result.one_or_none.return_value = MagicMock()

    db = make_db_mock(monkeypatch)
    db.execute = AsyncMock(return_value=taken_result)

    body = SimpleNamespace(email="other@test.com")

    with pytest.raises(HTTPException) as exc:
        await auth.update_my_email(body, user)

    assert exc.value.status_code == 409
    assert exc.value.detail == "Email already registered"
    assert db.execute.await_count == 1
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_my_email_profile_not_found(monkeypatch):
    user = make_user()

    taken_result = MagicMock()
    taken_result.one_or_none.return_value = None

    update_result = MagicMock()

    profile_result = MagicMock()
    profile_result.one_or_none.return_value = None

    db = make_db_mock(monkeypatch)
    db.execute = AsyncMock(
        side_effect=[taken_result, update_result, profile_result]
    )

    body = SimpleNamespace(email="new@test.com")

    with pytest.raises(HTTPException) as exc:
        await auth.update_my_email(body, user)

    assert exc.value.status_code == 404
    assert exc.value.detail == auth.PROFILE_NOT_FOUND
    db.commit.assert_not_awaited()


# ---------------------------------------------------------------------
# Update password
# ---------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_my_password_success(monkeypatch):
    user = make_user()

    monkeypatch.setattr(
        auth,
        "verify_password",
        MagicMock(return_value=True),
    )

    monkeypatch.setattr(
        auth.password_hash,
        "hash",
        MagicMock(return_value="new-hashed-password"),
    )

    db = make_db_mock(monkeypatch)

    body = SimpleNamespace(
        current_password="old-password",
        new_password="new-password123",
        new_password_conf="new-password123",
    )

    result = await auth.update_my_password(body, user)

    assert result == {"detail": "Password updated"}
    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_my_password_mismatch():
    user = make_user()

    body = SimpleNamespace(
        current_password="old-password",
        new_password="new-password123",
        new_password_conf="different-password",
    )

    with pytest.raises(HTTPException) as exc:
        await auth.update_my_password(body, user)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Passwords do not match"


@pytest.mark.asyncio
async def test_update_my_password_too_short():
    user = make_user()

    body = SimpleNamespace(
        current_password="old-password",
        new_password="short",
        new_password_conf="short",
    )

    with pytest.raises(HTTPException) as exc:
        await auth.update_my_password(body, user)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Password must be at least 8 characters"


@pytest.mark.asyncio
async def test_update_my_password_incorrect_current_password(monkeypatch):
    user = make_user()

    monkeypatch.setattr(
        auth,
        "verify_password",
        MagicMock(return_value=False),
    )

    body = SimpleNamespace(
        current_password="wrong-password",
        new_password="new-password123",
        new_password_conf="new-password123",
    )

    with pytest.raises(HTTPException) as exc:
        await auth.update_my_password(body, user)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Incorrect current password"


@pytest.mark.asyncio
async def test_update_my_password_verify_exception(monkeypatch):
    user = make_user()

    def raise_error(*args, **kwargs):
        raise ValueError("Invalid password hash")

    monkeypatch.setattr(auth, "verify_password", raise_error)

    body = SimpleNamespace(
        current_password="old-password",
        new_password="new-password123",
        new_password_conf="new-password123",
    )

    with pytest.raises(HTTPException) as exc:
        await auth.update_my_password(body, user)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Incorrect current password"
