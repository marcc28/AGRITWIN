import os
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("MODEL_USE_IN_RECOMENDATION", "test-model")

from api.v1.auth import get_current_user
from api.v1.field_recommendations import get_field_recommendation_service, router
from services.rate_limit import enforce_ai_rate_limit

USER_ID = uuid4()
RECOMMENDATION_ID = uuid4()
GENERATED_AT = datetime(2026, 5, 1, 10, 0, tzinfo=UTC)
EXPIRES_AT = datetime(2026, 5, 8, 10, 0, tzinfo=UTC)


def recommendation(**overrides):
    values = {
        "id": RECOMMENDATION_ID,
        "field_id": 7,
        "category": "irrigation",
        "title": "Revisa el reg",
        "description": "Humitat baixa",
        "severity": "medium",
        "based_on": {"reason": "Sensor sec", "data": ["18%"]},
        "model": "test-model",
        "generated_at": GENERATED_AT,
        "expires_at": EXPIRES_AT,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


@pytest.fixture
def service():
    return AsyncMock()


@pytest.fixture
def client(service):
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")

    async def override_user():
        return SimpleNamespace(id=USER_ID)

    async def skip_ai_limit():
        return None

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[enforce_ai_rate_limit] = skip_ai_limit
    app.dependency_overrides[router.dependencies[0].dependency] = override_user

    from api.v1.field_recommendations import get_field_recommendation_service

    app.dependency_overrides[get_field_recommendation_service] = lambda: service
    return TestClient(app)


def test_recommendation_routes_require_auth(service):
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")

    response = TestClient(app).get("/api/v1/fields/7/recommendations")

    assert response.status_code == 401


def test_recommendation_endpoint_enforces_ai_rate_limit(service, monkeypatch):
    monkeypatch.setenv("AI_LIMIT_USAGE", "1/minute")
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    account_id = uuid4()

    async def override_user():
        return SimpleNamespace(id=account_id)

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_field_recommendation_service] = lambda: service
    service.get_or_generate_recommendations.return_value = [recommendation()]
    client = TestClient(app)

    first = client.get("/api/v1/fields/7/recommendations")
    second = client.get("/api/v1/fields/7/recommendations")

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.headers["Retry-After"]
    assert service.get_or_generate_recommendations.await_count == 1


def test_get_field_recommendations_generates_for_current_user(client, service):
    service.get_or_generate_recommendations.return_value = [recommendation()]

    response = client.get("/api/v1/fields/7/recommendations?radius_meters=2500")

    assert response.status_code == 200
    assert response.json()[0]["id"] == str(RECOMMENDATION_ID)
    assert response.json()[0]["field_id"] == 7
    service.get_or_generate_recommendations.assert_awaited_once_with(
        field_id=7,
        user_id=USER_ID,
        radius_meters=2500,
    )


def test_get_field_recommendations_not_found(client, service):
    service.get_or_generate_recommendations.return_value = None

    response = client.get("/api/v1/fields/99/recommendations")

    assert response.status_code == 404
    assert response.json()["detail"] == "Field not found"


@pytest.mark.parametrize("radius", ["99", "10001", "abc"])
def test_get_field_recommendations_rejects_invalid_radius(client, service, radius):
    response = client.get(f"/api/v1/fields/7/recommendations?radius_meters={radius}")

    assert response.status_code == 422
    service.get_or_generate_recommendations.assert_not_awaited()


def test_refresh_field_recommendations_forces_regeneration(client, service):
    service.get_or_generate_recommendations.return_value = [recommendation()]

    response = client.post("/api/v1/fields/7/recommendations/refresh?radius_meters=500")

    assert response.status_code == 200
    service.get_or_generate_recommendations.assert_awaited_once_with(
        field_id=7,
        user_id=USER_ID,
        radius_meters=500,
        force_refresh=True,
    )


def test_refresh_field_recommendations_returns_404_for_unknown_field(client, service):
    service.get_or_generate_recommendations.return_value = None

    response = client.post("/api/v1/fields/999/recommendations/refresh")

    assert response.status_code == 404
    assert response.json()["detail"] == "Field not found"


def test_list_recommendations_passes_filters_and_pagination(client, service):
    service.list_recommendations.return_value = [recommendation()]

    response = client.get("/api/v1/field-recommendations?field_id=7&offset=3&limit=4")

    assert response.status_code == 200
    assert len(response.json()) == 1
    service.list_recommendations.assert_awaited_once_with(
        user_id=USER_ID,
        field_id=7,
        offset=3,
        limit=4,
    )


def test_list_recommendations_rejects_invalid_pagination(client, service):
    response = client.get("/api/v1/field-recommendations?field_id=0&offset=-1&limit=0")

    assert response.status_code == 422
    service.list_recommendations.assert_not_awaited()


def test_count_recommendations(client, service):
    service.count_recommendations.return_value = 6

    response = client.get("/api/v1/field-recommendations/count?field_id=7")

    assert response.status_code == 200
    assert response.json() == {"total": 6}
    service.count_recommendations.assert_awaited_once_with(
        user_id=USER_ID,
        field_id=7,
    )


def test_get_recommendation_by_id(client, service):
    service.get_recommendation.return_value = recommendation()

    response = client.get(f"/api/v1/field-recommendations/{RECOMMENDATION_ID}")

    assert response.status_code == 200
    assert response.json()["title"] == "Revisa el reg"
    service.get_recommendation.assert_awaited_once_with(
        recommendation_id=RECOMMENDATION_ID,
        user_id=USER_ID,
    )


def test_get_recommendation_returns_404_when_missing(client, service):
    service.get_recommendation.return_value = None

    response = client.get(f"/api/v1/field-recommendations/{RECOMMENDATION_ID}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Recommendation not found"


def test_create_recommendation_checks_field_ownership(client, service):
    service.field_belongs_to_user.return_value = True
    service.create_recommendation.return_value = recommendation()
    payload = {
        "field_id": 7,
        "category": "irrigation",
        "title": "Revisa el reg",
        "description": "Humitat baixa",
        "severity": "medium",
        "based_on": {"reason": "Sensor sec"},
        "model": "test-model",
        "expires_at": EXPIRES_AT.isoformat(),
    }

    response = client.post("/api/v1/field-recommendations", json=payload)

    assert response.status_code == 201
    assert response.json()["id"] == str(RECOMMENDATION_ID)
    service.field_belongs_to_user.assert_awaited_once_with(
        field_id=7,
        user_id=USER_ID,
    )
    service.create_recommendation.assert_awaited_once()
    assert service.create_recommendation.await_args.kwargs["data"]["title"] == "Revisa el reg"


def test_create_recommendation_rejects_field_not_owned(client, service):
    service.field_belongs_to_user.return_value = False

    response = client.post(
        "/api/v1/field-recommendations",
        json={"field_id": 7, "category": "general", "title": "Consell", "description": "Text"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Field not found"
    service.create_recommendation.assert_not_awaited()


def test_create_recommendation_validates_payload(client, service):
    response = client.post(
        "/api/v1/field-recommendations",
        json={"field_id": 7, "category": "general", "title": ""},
    )

    assert response.status_code == 422
    service.field_belongs_to_user.assert_not_awaited()


def test_update_recommendation(client, service):
    service.update_recommendation.return_value = recommendation(title="Títol nou")

    response = client.patch(
        f"/api/v1/field-recommendations/{RECOMMENDATION_ID}",
        json={"title": "Títol nou", "severity": "high"},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Títol nou"
    service.update_recommendation.assert_awaited_once_with(
        recommendation_id=RECOMMENDATION_ID,
        user_id=USER_ID,
        data={"title": "Títol nou", "severity": "high"},
    )


def test_update_recommendation_returns_404_when_missing(client, service):
    service.update_recommendation.return_value = None

    response = client.patch(
        f"/api/v1/field-recommendations/{RECOMMENDATION_ID}",
        json={"title": "Títol nou"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Recommendation not found"


def test_update_recommendation_rejects_invalid_uuid(client, service):
    response = client.patch("/api/v1/field-recommendations/not-a-uuid", json={"title": "Nou"})

    assert response.status_code == 422
    service.update_recommendation.assert_not_awaited()


def test_delete_recommendation(client, service):
    service.delete_recommendation.return_value = True

    response = client.delete(f"/api/v1/field-recommendations/{RECOMMENDATION_ID}")

    assert response.status_code == 204
    assert response.content == b""
    service.delete_recommendation.assert_awaited_once_with(
        recommendation_id=RECOMMENDATION_ID,
        user_id=USER_ID,
    )


def test_delete_recommendation_returns_404_when_missing(client, service):
    service.delete_recommendation.return_value = False

    response = client.delete(f"/api/v1/field-recommendations/{RECOMMENDATION_ID}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Recommendation not found"
