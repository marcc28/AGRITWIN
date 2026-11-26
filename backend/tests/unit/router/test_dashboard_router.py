import os
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.v1.auth import get_current_user
from api.v1.dashboard import router
from db.schema import User


class FakeResult:
    def __init__(self, first=None, rows=None):
        self._first = first
        self._rows = rows or []

    def first(self):
        return self._first

    def all(self):
        return self._rows


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


@pytest.fixture(autouse=True)
def simulated_service():
    """By default the garden has a real device, so no simulated data is used."""
    service = SimpleNamespace(ensure_for_field=AsyncMock(return_value=None))
    with patch("services.dashboard_service.SimulatedReadingsService", return_value=service):
        yield service


def make_client() -> TestClient:
    app = FastAPI()
    app.include_router(router)

    async def override_user():
        return User(
            username="ainhoa",
            email="ainhoa@test.com",
            password_hash="hash",
        )

    app.dependency_overrides[get_current_user] = override_user
    return TestClient(app)


def test_dashboard_requires_auth():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.get("/dashboard")

    assert response.status_code == 401


def test_dashboard_no_field():
    client = make_client()
    session = FakeSession([FakeResult(first=None)])

    with patch("api.v1.dashboard.AsyncSessionLocal", return_value=session):
        response = client.get("/dashboard")

    assert response.status_code == 200
    assert response.json() == {
        "field_name": None,
        "device_ids": [],
        "latest": None,
        "history": [],
        "simulated": False,
    }


def test_dashboard_field_without_devices():
    client = make_client()
    session = FakeSession(
        [
            FakeResult(first=SimpleNamespace(id=3, name="Hort de l'Ainhoa")),
            FakeResult(rows=[]),
        ]
    )

    with patch("api.v1.dashboard.AsyncSessionLocal", return_value=session):
        response = client.get("/dashboard")

    body = response.json()
    assert response.status_code == 200
    assert body["field_name"] == "Hort de l'Ainhoa"
    assert body["device_ids"] == []
    assert body["latest"] is None
    assert body["history"] == []


def test_dashboard_returns_readings():
    client = make_client()
    row = SimpleNamespace(
        timestamp=datetime(2026, 10, 16, 16, 19),
        air_temperature_c=25.9,
        air_humidity_percent=50.1,
        soil_moisture_percent=30.2,
        light_intensity_lux=83435.0,
    )
    session = FakeSession(
        [
            FakeResult(first=SimpleNamespace(id=3, name="Hort de l'Ainhoa")),
            FakeResult(rows=[SimpleNamespace(id="esp32_sim_03")]),
            FakeResult(rows=[row]),
        ]
    )

    with patch("api.v1.dashboard.AsyncSessionLocal", return_value=session):
        response = client.get("/dashboard")

    body = response.json()
    assert response.status_code == 200
    assert body["field_name"] == "Hort de l'Ainhoa"
    assert body["device_ids"] == ["esp32_sim_03"]
    assert body["latest"]["temperature"] == 25.9
    assert body["latest"]["air_humidity"] == 50.1
    assert body["latest"]["soil_humidity"] == 30.2
    assert body["latest"]["light"] == 83435.0
    assert len(body["history"]) == 1


def test_dashboard_other_user_field_is_empty():
    client = make_client()
    session = FakeSession([FakeResult(first=None)])

    with patch("api.v1.dashboard.AsyncSessionLocal", return_value=session):
        response = client.get("/dashboard?field_id=1")

    assert response.status_code == 200
    assert response.json()["field_name"] is None
    assert response.json()["device_ids"] == []


def test_dashboard_no_field_does_not_create_simulated_data(simulated_service):
    client = make_client()
    session = FakeSession([FakeResult(first=None)])

    with patch("api.v1.dashboard.AsyncSessionLocal", return_value=session):
        client.get("/dashboard")

    simulated_service.ensure_for_field.assert_not_awaited()


def test_dashboard_with_real_device_is_not_simulated(simulated_service):
    client = make_client()
    session = FakeSession(
        [
            FakeResult(first=SimpleNamespace(id=3, name="Hort de l'Ainhoa")),
            FakeResult(rows=[SimpleNamespace(id="esp32_A1B2")]),
            FakeResult(rows=[]),
        ]
    )

    with patch("api.v1.dashboard.AsyncSessionLocal", return_value=session):
        response = client.get("/dashboard?field_id=3")

    simulated_service.ensure_for_field.assert_awaited_once_with(3)
    assert response.json()["simulated"] is False
    assert session.committed is False


def test_dashboard_garden_without_device_shows_simulated_readings(simulated_service):
    simulated_service.ensure_for_field.return_value = "sim-field-3"
    client = make_client()
    row = SimpleNamespace(
        timestamp=datetime(2026, 11, 26, 11, 0),
        air_temperature_c=22.4,
        air_humidity_percent=55.0,
        soil_moisture_percent=48.3,
        light_intensity_lux=52000.0,
    )
    session = FakeSession(
        [
            FakeResult(first=SimpleNamespace(id=3, name="Hort de l'Ainhoa")),
            FakeResult(rows=[SimpleNamespace(id="sim-field-3")]),
            FakeResult(rows=[row]),
        ]
    )

    with patch("api.v1.dashboard.AsyncSessionLocal", return_value=session):
        response = client.get("/dashboard?field_id=3")

    body = response.json()
    assert response.status_code == 200
    assert body["simulated"] is True
    assert body["device_ids"] == ["sim-field-3"]
    assert body["latest"]["soil_humidity"] == 48.3
    # The new simulated readings are saved before they are read.
    assert session.committed is True
