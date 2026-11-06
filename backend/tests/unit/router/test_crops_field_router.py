import os
from datetime import UTC, date, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

from api.v1.auth import get_current_user
from api.v1.crops_field import get_field_crop_service, router

USER_ID = "field-crop-test-user"


def field_crop(**overrides):
    values = {
        "id": 15,
        "field_id": 7,
        "crop_id": 3,
        "crop": SimpleNamespace(name="Tomàquet"),
        "planted_at": date(2026, 4, 1),
        "expected_harvest_at": date(2026, 8, 1),
        "status": "planted",
        "notes": "Reg regular",
        "created_at": datetime(2026, 4, 1, tzinfo=UTC),
    }
    values.update(overrides)
    return SimpleNamespace(**values)


@pytest.fixture
def service():
    return AsyncMock()


@pytest.fixture
def client(service):
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/crops")

    async def override_user():
        return SimpleNamespace(id=USER_ID)

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_field_crop_service] = lambda: service
    return TestClient(app)


def test_field_crop_routes_require_auth(service):
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/crops")

    response = TestClient(app).get("/api/v1/crops/field-crops")

    assert response.status_code == 401


def test_list_field_crops_passes_filters_and_pagination(client, service):
    service.list_field_crops.return_value = [field_crop()]

    response = client.get(
        "/api/v1/crops/field-crops?offset=2&limit=5&field_id=7&crop_id=3&status=planted"
    )

    assert response.status_code == 200
    assert response.json()[0]["crop_name"] == "Tomàquet"
    service.list_field_crops.assert_awaited_once_with(
        user_id=USER_ID,
        offset=2,
        limit=5,
        field_id=7,
        crop_id=3,
        status="planted",
    )


@pytest.mark.parametrize(
    "query",
    ["?offset=-1", "?limit=0", "?limit=101", "?offset=0&limit=abc"],
)
def test_list_field_crops_rejects_invalid_pagination(client, service, query):
    response = client.get(f"/api/v1/crops/field-crops{query}")

    assert response.status_code == 422
    service.list_field_crops.assert_not_awaited()


def test_count_field_crops(client, service):
    service.count_field_crops.return_value = 4

    response = client.get("/api/v1/crops/field-crops/count?field_id=7")

    assert response.status_code == 200
    assert response.json() == {"total": 4}
    service.count_field_crops.assert_awaited_once_with(
        user_id=USER_ID,
        field_id=7,
    )


def test_get_field_crop_by_id(client, service):
    service.get_field_crop_by_id.return_value = field_crop()

    response = client.get("/api/v1/crops/field-crops/15")

    assert response.status_code == 200
    assert response.json() == {
        "id": 15,
        "field_id": 7,
        "crop_id": 3,
        "crop_name": "Tomàquet",
        "planted_at": "2026-04-01",
        "expected_harvest_at": "2026-08-01",
        "status": "planted",
        "notes": "Reg regular",
        "created_at": "2026-04-01T00:00:00Z",
    }
    service.get_field_crop_by_id.assert_awaited_once_with(
        field_crop_id=15,
        user_id=USER_ID,
    )


def test_get_missing_field_crop_returns_404(client, service):
    service.get_field_crop_by_id.return_value = None

    response = client.get("/api/v1/crops/field-crops/404")

    assert response.status_code == 404
    assert response.json()["detail"] == "Field crop not found"


def test_create_field_crop(client, service):
    service.create_field_crop.return_value = field_crop()
    payload = {
        "field_id": 7,
        "crop_id": 3,
        "planted_at": "2026-04-01",
        "expected_harvest_at": "2026-08-01",
        "status": "planted",
        "notes": "Reg regular",
    }

    response = client.post("/api/v1/crops/field-crops", json=payload)

    assert response.status_code == 201
    assert response.json()["crop_name"] == "Tomàquet"
    service.create_field_crop.assert_awaited_once_with(
        user_id=USER_ID,
        field_id=7,
        crop_id=3,
        planted_at=date(2026, 4, 1),
        expected_harvest_at=date(2026, 8, 1),
        status="planted",
        notes="Reg regular",
    )


@pytest.mark.parametrize(
    ("message", "status_code"),
    [("Field not found", 404), ("Crop not found", 404), ("Invalid field crop data", 400)],
)
def test_create_field_crop_maps_service_errors(client, service, message, status_code):
    service.create_field_crop.side_effect = ValueError(message)

    response = client.post(
        "/api/v1/crops/field-crops",
        json={"field_id": 7, "crop_id": 3},
    )

    assert response.status_code == status_code
    assert response.json()["detail"] == message


def test_create_field_crop_rejects_invalid_data(client, service):
    response = client.post(
        "/api/v1/crops/field-crops",
        json={"field_id": 7, "crop_id": 3, "planted_at": "not-a-date"},
    )

    assert response.status_code == 422
    service.create_field_crop.assert_not_awaited()


def test_update_field_crop(client, service):
    service.update_field_crop.return_value = field_crop(status="harvested")

    response = client.patch(
        "/api/v1/crops/field-crops/15",
        json={"status": "harvested", "notes": "Fet"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "harvested"
    service.update_field_crop.assert_awaited_once_with(
        field_crop_id=15,
        user_id=USER_ID,
        data={"status": "harvested", "notes": "Fet"},
    )


def test_update_missing_field_crop_returns_404(client, service):
    service.update_field_crop.return_value = None

    response = client.patch("/api/v1/crops/field-crops/15", json={"notes": "Fet"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Field crop not found"


def test_update_field_crop_maps_missing_crop_error(client, service):
    service.update_field_crop.side_effect = ValueError("Crop not found")

    response = client.patch(
        "/api/v1/crops/field-crops/15",
        json={"crop_id": 999},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Crop not found"


def test_delete_field_crop(client, service):
    service.delete_field_crop.return_value = True

    response = client.delete("/api/v1/crops/field-crops/15")

    assert response.status_code == 204
    assert response.content == b""
    service.delete_field_crop.assert_awaited_once_with(
        field_crop_id=15,
        user_id=USER_ID,
    )


def test_delete_missing_field_crop_returns_404(client, service):
    service.delete_field_crop.return_value = False

    response = client.delete("/api/v1/crops/field-crops/404")

    assert response.status_code == 404
    assert response.json()["detail"] == "Field crop not found"
