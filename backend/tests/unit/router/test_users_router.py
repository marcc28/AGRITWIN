from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from api.v1.user import create_user
from models.user import UserCreate

@pytest.mark.asyncio
async def test_create_user_rejects_privacy_terms():
    service = AsyncMock()

    user = UserCreate(
        username="joan",
        email="joan@test.com",
        password="123456",
        password_conf="123456",
        privacy_terms_accepted=False,
        security_terms_accepted=True,
    )

    with pytest.raises(HTTPException) as exc:
        await create_user(
            user=user,
            service=service,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Privacy terms must be accepted"

    service.create_user.assert_not_called()