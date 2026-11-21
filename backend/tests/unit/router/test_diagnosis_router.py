import os
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

from api.v1.auth import get_current_user
from api.v1.diagnosis import get_diagnosis_service, router
from models.diagnosis import PlantDiagnosis
from services import rate_limit
from services.plant_diagnosis_service import DiagnosisNotFoundError, DiagnosisUnavailableError
from services.rate_limit import enforce_ai_rate_limit

USER_ID = uuid4()
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 32
DIAGNOSIS = PlantDiagnosis(name="Míldiu", healthy=False, confidence=0.82, provider="plantnet")


@pytest.fixture(autouse=True)
def clear_buckets():
    rate_limit._requests.clear()
    yield
    rate_limit._requests.clear()


@pytest.fixture
def service():
    mock = AsyncMock()
    mock.diagnose.return_value = DIAGNOSIS
    return mock


def make_client(service, *, user=True, skip_limit=True) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")

    async def override_user():
        return SimpleNamespace(id=USER_ID)

    async def no_limit():
        return None

    if user:
        app.dependency_overrides[get_current_user] = override_user
    if skip_limit:
        app.dependency_overrides[enforce_ai_rate_limit] = no_limit
    app.dependency_overrides[get_diagnosis_service] = lambda: service
    return TestClient(app)


def upload(client, content=JPEG, content_type="image/jpeg"):
    return client.post(
        "/api/v1/diagnosis",
        params={"lang": "es"},
        files={"image": ("plant.jpg", content, content_type)},
    )


def test_diagnosis_returns_the_result(service):
    response = upload(make_client(service))

    assert response.status_code == 200
    assert response.json() == DIAGNOSIS.model_dump()
    service.diagnose.assert_awaited_once_with(JPEG, "image/jpeg", "es")


def test_diagnosis_requires_auth(service):
    response = upload(make_client(service, user=False))

    assert response.status_code == 401
    service.diagnose.assert_not_awaited()


def test_diagnosis_rejects_a_file_that_is_not_an_image(service):
    response = upload(make_client(service), b"not an image")

    assert response.status_code == 415
    service.diagnose.assert_not_awaited()


@pytest.mark.parametrize(
    ("error", "status"),
    [(DiagnosisNotFoundError(), 404), (DiagnosisUnavailableError(), 503)],
)
def test_diagnosis_errors_return_their_status(service, error, status):
    service.diagnose.side_effect = error

    response = upload(make_client(service))

    assert response.status_code == status
    assert response.json() == {"detail": error.message}


def test_diagnosis_enforces_the_ai_rate_limit(service, monkeypatch):
    monkeypatch.setenv("AI_LIMIT_USAGE", "1/minute")
    client = make_client(service, skip_limit=False)

    assert upload(client).status_code == 200
    assert upload(client).status_code == 429
    assert service.diagnose.await_count == 1
