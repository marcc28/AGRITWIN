from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from services.user_service import UserService


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
