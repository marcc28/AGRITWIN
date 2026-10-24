import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.v1.auth import get_current_user, get_user_service, router
from db.schema import User

USER_ID = uuid4()
PROFILE = SimpleNamespace(
    name="Ainhoa",
    language="ca",
    notifications_enabled=True,
    weather_alerts_enabled=True,
)


class FakeResult:
    def __init__(self, one=None):
        self._one = one

    def one_or_none(self):
        return self._one


class FakeSession:
    def __init__(self, results):
        self._results = list(results)
        self.committed = False

    async def execute(self, *_args, **_kwargs):
        return self._results.pop(0)

    async def commit(self):
        self.committed = True

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False


def make_user() -> User:
    return User(
        id=USER_ID,
        username="ainhoa",
        email="ainhoa@test.com",
        password_hash="hash",
    )


def make_client(
    user: User | None = None,
    service: AsyncMock | None = None,
) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    current = user or make_user()

    async def override_user():
        return current

    app.dependency_overrides[get_current_user] = override_user

    if service is not None:

        async def override_service():
            yield service

        app.dependency_overrides[get_user_service] = override_service

    return TestClient(app)


def test_me_requires_auth():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.get("/me")

    assert response.status_code == 401


def test_get_me():
    mock_service = AsyncMock()
    mock_service.get_user_profile.return_value = PROFILE
    client = make_client(service=mock_service)

    response = client.get("/me")

    assert response.status_code == 200
    assert response.json() == {
        "username": "ainhoa",
        "email": "ainhoa@test.com",
        "name": "Ainhoa",
        "language": "ca",
        "notifications_enabled": True,
        "weather_alerts_enabled": True,
    }
    mock_service.get_user_profile.assert_awaited_once_with(USER_ID)


def test_get_me_profile_not_found():
    mock_service = AsyncMock()
    mock_service.get_user_profile.return_value = None
    client = make_client(service=mock_service)

    response = client.get("/me")

    assert response.status_code == 404
    assert response.json()["detail"] == "User profile not found"


def test_put_me():
    client = make_client()
    session = FakeSession([FakeResult(one=PROFILE)])

    with patch("api.v1.auth.AsyncSessionLocal", return_value=session):
        response = client.put(
            "/me",
            json={
                "name": "Ainhoa",
                "language": "ca",
                "notifications_enabled": True,
                "weather_alerts_enabled": True,
            },
        )

    assert response.status_code == 200
    assert response.json()["name"] == "Ainhoa"
    assert response.json()["language"] == "ca"
    assert session.committed is True


def test_put_me_profile_not_found():
    client = make_client()
    session = FakeSession([FakeResult(one=None)])

    with patch("api.v1.auth.AsyncSessionLocal", return_value=session):
        response = client.put(
            "/me",
            json={
                "name": "Ainhoa",
                "language": "es",
                "notifications_enabled": False,
                "weather_alerts_enabled": False,
            },
        )

    assert response.status_code == 404


def test_put_me_name_required():
    client = make_client()

    response = client.put(
        "/me",
        json={
            "name": "   ",
            "language": "ca",
            "notifications_enabled": True,
            "weather_alerts_enabled": True,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Name is required"


def test_put_me_email():
    client = make_client()
    session = FakeSession(
        [
            FakeResult(one=None),
            FakeResult(),
            FakeResult(one=PROFILE),
        ]
    )

    with patch("api.v1.auth.AsyncSessionLocal", return_value=session):
        response = client.put(
            "/me/email",
            json={"email": "ainhoa.new@test.com"},
        )

    assert response.status_code == 200
    assert response.json()["email"] == "ainhoa.new@test.com"
    assert session.committed is True


def test_put_me_email_already_registered():
    client = make_client()
    session = FakeSession([FakeResult(one=SimpleNamespace(id=uuid4()))])

    with patch("api.v1.auth.AsyncSessionLocal", return_value=session):
        response = client.put(
            "/me/email",
            json={"email": "taken@test.com"},
        )

    assert response.status_code == 409
    assert response.json()["detail"] == "Email already registered"


def test_put_me_email_invalid():
    client = make_client()

    response = client.put("/me/email", json={"email": "not-an-email"})

    assert response.status_code == 422


def test_put_me_password_mismatch():
    client = make_client()

    response = client.put(
        "/me/password",
        json={
            "current_password": "Ainhoa123",
            "new_password": "Nueva1234",
            "new_password_conf": "Otra1234",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Passwords do not match"


def test_put_me_password_too_short():
    client = make_client()

    response = client.put(
        "/me/password",
        json={
            "current_password": "Ainhoa123",
            "new_password": "short",
            "new_password_conf": "short",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Password must be at least 8 characters"


def test_put_me_password_incorrect_current():
    client = make_client()

    with patch("api.v1.auth.verify_password", return_value=False):
        response = client.put(
            "/me/password",
            json={
                "current_password": "wrong",
                "new_password": "Nueva1234",
                "new_password_conf": "Nueva1234",
            },
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect current password"


def test_put_me_password():
    client = make_client()
    session = FakeSession([FakeResult()])

    with (
        patch("api.v1.auth.verify_password", return_value=True),
        patch("api.v1.auth.password_hash.hash", return_value="new-hash"),
        patch("api.v1.auth.AsyncSessionLocal", return_value=session),
    ):
        response = client.put(
            "/me/password",
            json={
                "current_password": "Ainhoa123",
                "new_password": "Nueva1234",
                "new_password_conf": "Nueva1234",
            },
        )

    assert response.status_code == 200
    assert response.json() == {"detail": "Password updated"}
    assert session.committed is True
