import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.v1.user import get_user_service, router


@pytest.fixture
def mock_service():
    return AsyncMock()


@pytest.fixture
def client(mock_service):
    app = FastAPI()
    app.include_router(router)

    async def override_get_user_service():
        yield mock_service

    app.dependency_overrides[get_user_service] = override_get_user_service

    return TestClient(app)


def test_get_users(client, mock_service):
    mock_service.list_users.return_value = [
        {
            "id": uuid.uuid4(),
            "username": "john",
            "email": "john@example.com",
        }
    ]

    response = client.get("/users")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["username"] == "john"

    mock_service.list_users.assert_awaited_once_with(
        offset=0,
        limit=10,
    )


def test_get_users_with_pagination(client, mock_service):
    mock_service.list_users.return_value = []

    response = client.get("/users?offset=20&limit=5")

    assert response.status_code == 200
    assert response.json() == []

    mock_service.list_users.assert_awaited_once_with(
        offset=20,
        limit=5,
    )


def test_get_user_profiles(client, mock_service):
    mock_service.list_users_profile.return_value = [
        {
            "username": "john",
            "language": "ca",
            "units": "metric",
            "notifications_enabled": True,
            "weather_alerts_enabled": True,
            "irrigation_alerts_enabled": True,
            "theme": "system",
        }
    ]

    response = client.get("/user_profile")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["username"] == "john"
    assert response.json()[0]["language"] == "ca"
    assert response.json()[0]["units"] == "metric"
    assert response.json()[0]["notifications_enabled"] is True
    assert response.json()[0]["weather_alerts_enabled"] is True
    assert response.json()[0]["irrigation_alerts_enabled"] is True
    assert response.json()[0]["theme"] == "system"

    mock_service.list_users_profile.assert_awaited_once_with(
        limit=10,
        offset=0,
        nickname=None,
    )


def test_get_user_profile_success(client, mock_service):
    user_id = uuid.uuid4()

    mock_service.get_user_profile.return_value = {
        "username": "john",
        "language": "ca",
        "units": "metric",
        "notifications_enabled": True,
        "weather_alerts_enabled": True,
        "irrigation_alerts_enabled": True,
        "theme": "system",
    }

    response = client.get(f"/user_profile/{user_id}")

    assert response.status_code == 200
    assert response.json()["username"] == "john"
    assert response.json()["language"] == "ca"
    assert response.json()["units"] == "metric"
    assert response.json()["notifications_enabled"] is True
    assert response.json()["weather_alerts_enabled"] is True
    assert response.json()["irrigation_alerts_enabled"] is True
    assert response.json()["theme"] == "system"

    mock_service.get_user_profile.assert_awaited_once_with(user_id)


def test_get_user_profiles_with_nickname(client, mock_service):
    mock_service.list_users_profile.return_value = []

    response = client.get("/user_profile?nickname=john")

    assert response.status_code == 200
    assert response.json() == []

    mock_service.list_users_profile.assert_awaited_once_with(
        limit=10,
        offset=0,
        nickname="john",
    )


def test_create_user_success(client, mock_service):
    user_id = uuid.uuid4()

    mock_service.create_user.return_value = {
        "id": user_id,
        "username": "john",
        "email": "john@example.com",
    }

    payload = {
        "username": "john",
        "email": "john@example.com",
        "password": "Password123!",
        "password_conf": "Password123!",
        "privacy_terms_accepted": True,
        "security_terms_accepted": True,
    }

    response = client.post("/users", json=payload)

    assert response.status_code == 200
    assert response.json()["username"] == "john"
    assert response.json()["email"] == "john@example.com"

    mock_service.create_user.assert_awaited_once_with(
        "john",
        "john@example.com",
        "Password123!",
        True,
        True,
    )


def test_create_user_privacy_terms_not_accepted(client, mock_service):
    payload = {
        "username": "john",
        "email": "john@example.com",
        "password": "Password123!",
        "password_conf": "Password123!",
        "privacy_terms_accepted": False,
        "security_terms_accepted": True,
    }

    response = client.post("/users", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "Privacy terms must be accepted"

    mock_service.create_user.assert_not_awaited()


def test_create_user_security_terms_not_accepted(client, mock_service):
    payload = {
        "username": "john",
        "email": "john@example.com",
        "password": "Password123!",
        "password_conf": "Password123!",
        "privacy_terms_accepted": True,
        "security_terms_accepted": False,
    }

    response = client.post("/users", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "Security terms must be accepted"

    mock_service.create_user.assert_not_awaited()


def test_create_user_passwords_do_not_match(client, mock_service):
    payload = {
        "username": "john",
        "email": "john@example.com",
        "password": "Password123!",
        "password_conf": "DifferentPassword123!",
        "privacy_terms_accepted": True,
        "security_terms_accepted": True,
    }

    response = client.post("/users", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "Passwords do not match"

    mock_service.create_user.assert_not_awaited()


def test_get_user_success(client, mock_service):
    user_id = uuid.uuid4()

    mock_service.get_user.return_value = {
        "id": user_id,
        "username": "john",
        "email": "john@example.com",
    }

    response = client.get(f"/users/{user_id}")

    assert response.status_code == 200
    assert response.json()["username"] == "john"

    mock_service.get_user.assert_awaited_once_with(user_id)


def test_get_user_not_found(client, mock_service):
    user_id = uuid.uuid4()

    mock_service.get_user.return_value = None

    response = client.get(f"/users/{user_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

    mock_service.get_user.assert_awaited_once_with(user_id)


def test_get_user_invalid_uuid(client, mock_service):
    response = client.get("/users/not-a-uuid")

    assert response.status_code == 422

    mock_service.get_user.assert_not_awaited()


def test_get_user_profile_not_found(client, mock_service):
    user_id = uuid.uuid4()

    mock_service.get_user_profile.return_value = None

    response = client.get(f"/user_profile/{user_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Userprof not found"

    mock_service.get_user_profile.assert_awaited_once_with(user_id)


def test_update_user_success(client, mock_service):
    user_id = uuid.uuid4()

    mock_service.update_user.return_value = {
        "id": user_id,
        "username": "new_username",
        "email": "new@example.com",
    }

    payload = {
        "username": "new_username",
        "email": "new@example.com",
        "password": "NewPassword123!",
        "password_conf": "NewPassword123!",
        "privacy_terms_accepted": True,
        "security_terms_accepted": True,
    }

    response = client.put(f"/users/{user_id}", json=payload)

    assert response.status_code == 200
    assert response.json()["username"] == "new_username"
    assert response.json()["email"] == "new@example.com"

    mock_service.update_user.assert_awaited_once_with(
        user_id,
        "new_username",
        "NewPassword123!",
        "NewPassword123!",
        "new@example.com",
    )


def test_update_user_not_found(client, mock_service):
    user_id = uuid.uuid4()

    mock_service.update_user.return_value = None

    payload = {
        "username": "new_username",
        "email": "new@example.com",
        "password": "NewPassword123!",
        "password_conf": "NewPassword123!",
        "privacy_terms_accepted": True,
        "security_terms_accepted": True,
    }

    response = client.put(f"/users/{user_id}", json=payload)

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

    mock_service.update_user.assert_awaited_once_with(
        user_id,
        "new_username",
        "NewPassword123!",
        "NewPassword123!",
        "new@example.com",
    )


def test_update_user_invalid_uuid(client, mock_service):
    payload = {
        "username": "new_username",
        "email": "new@example.com",
        "password": "NewPassword123!",
        "password_conf": "NewPassword123!",
        "privacy_terms_accepted": True,
        "security_terms_accepted": True,
    }

    response = client.put("/users/not-a-uuid", json=payload)

    assert response.status_code == 422

    mock_service.update_user.assert_not_awaited()
