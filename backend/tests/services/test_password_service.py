
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

import services.password_service as password_service_module
from services.password_service import PasswordService


# =====================================================
# HELPERS
# =====================================================

def mock_result(scalar=None):
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar
    return result


def make_user(
    user_id=1,
    password_hash_value="old-hashed-password",
):
    user = MagicMock()
    user.id = user_id
    user.email = "joan@test.com"
    user.password_hash = password_hash_value
    return user


@pytest.fixture
def db():
    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


@pytest.fixture
def service(db):
    return PasswordService(db)


@pytest.fixture
def valid_expiration():
    return datetime.now(timezone.utc) + timedelta(minutes=15)


# =====================================================
# GET USER BY EMAIL
# =====================================================

@pytest.mark.asyncio
async def test_get_user_by_email_returns_user(db, service):
    user = make_user()

    db.execute.return_value = mock_result(user)

    result = await service.get_user_by_email("joan@test.com")

    assert result == user
    db.execute.assert_awaited_once()

    statement = db.execute.await_args.args[0]

    assert "users.email" in str(statement)


@pytest.mark.asyncio
async def test_get_user_by_email_returns_none(db, service):
    db.execute.return_value = mock_result()

    result = await service.get_user_by_email("unknown@test.com")

    assert result is None
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_user_by_email_database_error(db, service):
    db.execute.side_effect = RuntimeError("Database unavailable")

    with pytest.raises(RuntimeError, match="Database unavailable"):
        await service.get_user_by_email("joan@test.com")

    db.execute.assert_awaited_once()


# =====================================================
# UPDATE PASSWORD - SUCCESS
# =====================================================

@pytest.mark.asyncio
async def test_update_password_success(
    db,
    service,
    valid_expiration,
    monkeypatch,
):
    user = make_user()

    service.get_user_by_email = AsyncMock(return_value=user)

    db.execute.return_value = mock_result(123)

    hash_mock = MagicMock()
    hash_mock.verify.return_value = False
    hash_mock.hash.return_value = "new-hashed-password"

    monkeypatch.setattr(
        password_service_module,
        "password_hash",
        hash_mock,
    )

    result = await service.update_password(
        email="joan@test.com",
        new_password="new-password-123",
        jti="token-123",
        expires_at=valid_expiration,
    )

    assert result == "updated"
    assert user.password_hash == "new-hashed-password"

    service.get_user_by_email.assert_awaited_once_with(
        "joan@test.com"
    )

    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()

    hash_mock.verify.assert_called_once_with(
        "new-password-123",
        "old-hashed-password",
    )
    hash_mock.hash.assert_called_once_with(
        "new-password-123"
    )


@pytest.mark.asyncio
async def test_update_password_success_without_existing_hash(
    db,
    service,
    valid_expiration,
    monkeypatch,
):
    user = make_user(password_hash_value=None)

    service.get_user_by_email = AsyncMock(return_value=user)
    db.execute.return_value = mock_result(123)

    hash_mock = MagicMock()
    hash_mock.hash.return_value = "new-hashed-password"

    monkeypatch.setattr(
        password_service_module,
        "password_hash",
        hash_mock,
    )

    result = await service.update_password(
        email="joan@test.com",
        new_password="new-password-123",
        jti="token-123",
        expires_at=valid_expiration,
    )

    assert result == "updated"
    assert user.password_hash == "new-hashed-password"

    hash_mock.verify.assert_not_called()
    hash_mock.hash.assert_called_once_with("new-password-123")
    db.commit.assert_awaited_once()


# =====================================================
# UPDATE PASSWORD - VALIDATION
# =====================================================

@pytest.mark.asyncio
async def test_update_password_user_not_found(
    db,
    service,
    valid_expiration,
):
    service.get_user_by_email = AsyncMock(return_value=None)

    result = await service.update_password(
        email="unknown@test.com",
        new_password="new-password-123",
        jti="token-123",
        expires_at=valid_expiration,
    )

    assert result == "not_found"

    service.get_user_by_email.assert_awaited_once_with(
        "unknown@test.com"
    )

    db.execute.assert_not_awaited()
    db.commit.assert_not_awaited()
    db.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_password_same_password(
    db,
    service,
    valid_expiration,
    monkeypatch,
):
    user = make_user()

    service.get_user_by_email = AsyncMock(return_value=user)

    hash_mock = MagicMock()
    hash_mock.verify.return_value = True

    monkeypatch.setattr(
        password_service_module,
        "password_hash",
        hash_mock,
    )

    result = await service.update_password(
        email="joan@test.com",
        new_password="old-password",
        jti="token-123",
        expires_at=valid_expiration,
    )

    assert result == "same_password"

    hash_mock.verify.assert_called_once_with(
        "old-password",
        "old-hashed-password",
    )

    hash_mock.hash.assert_not_called()
    db.execute.assert_not_awaited()
    db.commit.assert_not_awaited()
    db.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_password_token_already_used(
    db,
    service,
    valid_expiration,
    monkeypatch,
):
    user = make_user()

    service.get_user_by_email = AsyncMock(return_value=user)

    # ON CONFLICT DO NOTHING no retorna cap identificador.
    db.execute.return_value = mock_result(None)

    hash_mock = MagicMock()
    hash_mock.verify.return_value = False

    monkeypatch.setattr(
        password_service_module,
        "password_hash",
        hash_mock,
    )

    result = await service.update_password(
        email="joan@test.com",
        new_password="new-password-123",
        jti="already-used-token",
        expires_at=valid_expiration,
    )

    assert result == "token_used"

    db.execute.assert_awaited_once()
    db.rollback.assert_awaited_once()
    db.commit.assert_not_awaited()

    # No s'ha de canviar la contrasenya si el token ja s'ha utilitzat.
    assert user.password_hash == "old-hashed-password"
    hash_mock.hash.assert_not_called()


# =====================================================
# UPDATE PASSWORD - DATABASE ERRORS
# =====================================================

@pytest.mark.asyncio
async def test_update_password_error_while_getting_user(
    db,
    service,
    valid_expiration,
):
    service.get_user_by_email = AsyncMock(
        side_effect=RuntimeError("User query failed")
    )

    with pytest.raises(RuntimeError, match="User query failed"):
        await service.update_password(
            email="joan@test.com",
            new_password="new-password-123",
            jti="token-123",
            expires_at=valid_expiration,
        )

    db.rollback.assert_awaited_once()
    db.execute.assert_not_awaited()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_password_error_while_registering_token(
    db,
    service,
    valid_expiration,
    monkeypatch,
):
    user = make_user()

    service.get_user_by_email = AsyncMock(return_value=user)

    db.execute.side_effect = RuntimeError("Token insert failed")

    hash_mock = MagicMock()
    hash_mock.verify.return_value = False

    monkeypatch.setattr(
        password_service_module,
        "password_hash",
        hash_mock,
    )

    with pytest.raises(RuntimeError, match="Token insert failed"):
        await service.update_password(
            email="joan@test.com",
            new_password="new-password-123",
            jti="token-123",
            expires_at=valid_expiration,
        )

    db.rollback.assert_awaited_once()
    db.commit.assert_not_awaited()

    assert user.password_hash == "old-hashed-password"


@pytest.mark.asyncio
async def test_update_password_hashing_error(
    db,
    service,
    valid_expiration,
    monkeypatch,
):
    user = make_user()

    service.get_user_by_email = AsyncMock(return_value=user)
    db.execute.return_value = mock_result(123)

    hash_mock = MagicMock()
    hash_mock.verify.return_value = False
    hash_mock.hash.side_effect = RuntimeError("Hashing failed")

    monkeypatch.setattr(
        password_service_module,
        "password_hash",
        hash_mock,
    )

    with pytest.raises(RuntimeError, match="Hashing failed"):
        await service.update_password(
            email="joan@test.com",
            new_password="new-password-123",
            jti="token-123",
            expires_at=valid_expiration,
        )

    db.rollback.assert_awaited_once()
    db.commit.assert_not_awaited()

    assert user.password_hash == "old-hashed-password"


@pytest.mark.asyncio
async def test_update_password_commit_error(
    db,
    service,
    valid_expiration,
    monkeypatch,
):
    user = make_user()

    service.get_user_by_email = AsyncMock(return_value=user)
    db.execute.return_value = mock_result(123)

    db.commit.side_effect = RuntimeError("Commit failed")

    hash_mock = MagicMock()
    hash_mock.verify.return_value = False
    hash_mock.hash.return_value = "new-hashed-password"

    monkeypatch.setattr(
        password_service_module,
        "password_hash",
        hash_mock,
    )

    with pytest.raises(RuntimeError, match="Commit failed"):
        await service.update_password(
            email="joan@test.com",
            new_password="new-password-123",
            jti="token-123",
            expires_at=valid_expiration,
        )

    db.commit.assert_awaited_once()
    db.rollback.assert_awaited_once()
