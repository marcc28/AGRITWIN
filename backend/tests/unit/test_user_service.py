from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from db.schema import User
from services.user_service import UserService


@pytest.mark.asyncio
async def test_create_user_success():
    db = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    service = UserService(db)
    service.get_user_by_email = AsyncMock(return_value=None)
    service.get_user_by_username = AsyncMock(return_value=None)

    user = await service.create_user(
        username="joan",
        email="joan@test.com",
        password="secure-password",
        privacy_terms_accepted=True,
        security_terms_accepted=True,
    )

    assert isinstance(user, User)
    assert user.username == "joan"
    assert user.email == "joan@test.com"
    assert user.password_hash != "secure-password"

    service.get_user_by_email.assert_awaited_once_with("joan@test.com")
    service.get_user_by_username.assert_awaited_once_with("joan")
    db.add.assert_called()
    assert db.add.call_count == 3

    db.flush.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(user)


@pytest.mark.asyncio
async def test_create_user_requires_privacy_terms():
    db = MagicMock()
    service = UserService(db)

    with pytest.raises(HTTPException) as exc:
        await service.create_user(
            username="joan",
            email="joan@test.com",
            password="123456",
            privacy_terms_accepted=False,
            security_terms_accepted=True,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Privacy terms must be accepted"


@pytest.mark.asyncio
async def test_create_user_requires_security_terms():
    db = MagicMock()
    service = UserService(db)

    with pytest.raises(HTTPException) as exc:
        await service.create_user(
            username="joan",
            email="joan@test.com",
            password="123456",
            privacy_terms_accepted=True,
            security_terms_accepted=False,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Security terms must be accepted"


@pytest.mark.asyncio
async def test_create_user_email_already_exists():
    db = MagicMock()
    service = UserService(db)

    existing_user = MagicMock()

    service.get_user_by_email = AsyncMock(return_value=existing_user)

    with pytest.raises(HTTPException) as exc:
        await service.create_user(
            username="joan",
            email="joan@test.com",
            password="123456",
            privacy_terms_accepted=True,
            security_terms_accepted=True,
        )

    assert exc.value.status_code == 409
    assert exc.value.detail == "Email already registered"


@pytest.mark.asyncio
async def test_create_user_username_already_exists():
    db = MagicMock()
    service = UserService(db)

    service.get_user_by_email = AsyncMock(return_value=None)

    service.get_user_by_username = AsyncMock(return_value=MagicMock())

    with pytest.raises(HTTPException) as exc:
        await service.create_user(
            username="joan",
            email="joan@test.com",
            password="123456",
            privacy_terms_accepted=True,
            security_terms_accepted=True,
        )

    assert exc.value.status_code == 409
    assert exc.value.detail == "Username already registered"


def mock_result(scalar=None, scalars=None):
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar
    result.scalars.return_value.all.return_value = scalars or []
    return result


@pytest.mark.asyncio
async def test_list_users():
    db = MagicMock()
    users = [MagicMock(spec=User), MagicMock(spec=User)]
    db.execute.return_value = mock_result(scalars=users)


@pytest.mark.asyncio
async def test_get_user_by_auth_provider():
    db = MagicMock()
    user = MagicMock(spec=User)

    db.execute = AsyncMock(return_value=mock_result(scalar=user))

    service = UserService(db)

    result = await service.get_user_by_auth_provider(
        provider="facebook",
        provider_user_id="facebook-123",
    )

    assert result == user
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_user_by_auth_provider_returns_none():
    db = MagicMock()
    db.execute = AsyncMock(return_value=mock_result())

    service = UserService(db)

    result = await service.get_user_by_auth_provider(
        provider="google",
        provider_user_id="google-123",
    )

    assert result is None


@pytest.mark.asyncio
async def test_get_user_by_google_id(monkeypatch):
    db = MagicMock()
    service = UserService(db)

    expected_user = MagicMock(spec=User)
    get_user = AsyncMock(return_value=expected_user)

    monkeypatch.setattr(service, "get_user_by_auth_provider", get_user)

    result = await service.get_user_by_google_id("google-123")

    assert result == expected_user
    get_user.assert_awaited_once_with("google", "google-123")


@pytest.mark.asyncio
async def test_list_users_returns_users():
    db = MagicMock()
    users = [MagicMock(spec=User), MagicMock(spec=User)]

    db.execute = AsyncMock(return_value=mock_result(scalars=users))

    service = UserService(db)

    result = await service.list_users(offset=5, limit=20)

    assert result == users
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_users_returns_empty_list():
    db = MagicMock()
    db.execute = AsyncMock(return_value=mock_result())

    service = UserService(db)

    result = await service.list_users()

    assert result == []


@pytest.mark.asyncio
async def test_get_user_returns_user():
    db = MagicMock()
    user = MagicMock(spec=User)

    db.execute = AsyncMock(return_value=mock_result(scalar=user))

    service = UserService(db)

    result = await service.get_user("joan")

    assert result == user
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_user_returns_none():
    db = MagicMock()
    db.execute = AsyncMock(return_value=mock_result())

    service = UserService(db)

    result = await service.get_user("inexistent")

    assert result is None


@pytest.mark.asyncio
async def test_get_user_by_email():
    db = MagicMock()
    user = MagicMock(spec=User)

    db.execute = AsyncMock(return_value=mock_result(scalar=user))

    service = UserService(db)

    result = await service.get_user_by_email("joan@test.com")

    assert result == user
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_user_by_username():
    db = MagicMock()
    user = MagicMock(spec=User)

    db.execute = AsyncMock(return_value=mock_result(scalar=user))

    service = UserService(db)

    result = await service.get_user_by_username("joan")

    assert result == user
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_user_profile():
    db = MagicMock()
    profile = MagicMock()

    db.execute = AsyncMock(return_value=mock_result(scalar=profile))

    service = UserService(db)

    result = await service.get_user_profile(profile.id)

    assert result == profile
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_user_profile_returns_none():
    db = MagicMock()
    db.execute = AsyncMock(return_value=mock_result())

    service = UserService(db)

    result = await service.get_user_profile(None)

    assert result is None
