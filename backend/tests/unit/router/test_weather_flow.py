import os
from uuid import UUID

# Set a fallback database URL for CI environments before importing db.database
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

import asyncio

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from api.v1 import auth
from api.v1.weather import get_field_weather_service, router
from db.schema import Base, Field, User, UserProfile, WeatherCache
from services.field_weather_service import FieldWeatherService
from services.weather_service import WeatherService
from tests.unit.test_weather_service import CURRENT, FORECAST

CINTA = UUID("c1a7a5e0-0000-4000-a000-00000000000a")
MARC = UUID("a2c0b5e0-0000-4000-a000-00000000000b")


class OpenWeather:
    def __init__(self):
        self.requests = []
        self.status = 200
        self.current = CURRENT
        self.forecast = FORECAST

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.path.endswith("/direct"):
            return httpx.Response(
                200,
                json=[{"lat": 41.6176, "lon": 0.62, "name": "Lleida", "country": "ES"}],
            )
        if self.status != 200:
            return httpx.Response(self.status)
        if request.url.path.endswith("/weather"):
            return httpx.Response(200, json=self.current)
        return httpx.Response(200, json=self.forecast)

    def forecasts(self):
        return [r for r in self.requests if not r.url.path.endswith("/direct")]


async def create_database(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add_all(
            [
                User(id=CINTA, username="cinta", email="cinta@example.com", password_hash="x"),
                User(id=MARC, username="marc", email="marc@example.com", password_hash="x"),
            ]
        )
        await session.flush()
        session.add_all(
            [
                UserProfile(id=CINTA, name="Cinta", language="es"),
                Field(id=1, user_id=CINTA, name="Hort", location="Alcarràs", lat=41.56, lon=0.52),
                Field(id=2, user_id=CINTA, name="Camp sense GPS", location="Lleida"),
                Field(id=3, user_id=CINTA, name="Camp buit"),
                Field(id=4, user_id=MARC, name="Finca", lat=41.63, lon=0.89),
            ]
        )
        await session.commit()
    return factory


@pytest.fixture
def open_weather():
    return OpenWeather()


@pytest.fixture
def flow(monkeypatch, open_weather):
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    sessions = asyncio.run(create_database(engine))
    monkeypatch.setattr(auth, "AsyncSessionLocal", sessions)
    monkeypatch.setenv("OPENWEATHER_API_KEY", "test-api-key")

    async def field_weather_service():
        async with sessions() as session:
            client = httpx.AsyncClient(transport=httpx.MockTransport(open_weather))
            weather = WeatherService(client=client)
            yield FieldWeatherService(session=session, weather=weather, cache_seconds=600)

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_field_weather_service] = field_weather_service

    yield TestClient(app), sessions

    asyncio.run(engine.dispose())


def login(username="cinta"):
    token = auth.create_access_token({"sub": username})
    return {"Authorization": f"Bearer {token}"}


# FULL FLOW: route -> service -> database -> Open-Meteo (mocked)


def test_app_gets_the_weather_of_its_field(flow, open_weather):
    client, _ = flow

    response = client.get("/api/v1/weather/fields/1?days=3", headers=login())

    assert response.status_code == 200
    body = response.json()
    assert body["location"]["field_id"] == 1
    assert body["current"]["temperature"] == 21.4
    assert body["current"]["condition"]["description"] == "light rain"
    assert body["daily"][0]["temp_max"] == 25.0
    assert body["hourly"]
    requests = open_weather.forecasts()
    assert len(requests) == 2
    assert all(request.url.params["lat"] == "41.56" for request in requests)
    assert all(request.url.params["lon"] == "0.52" for request in requests)


def cache_row(sessions, field_id=1):
    async def read():
        async with sessions() as session:
            return await session.get(WeatherCache, field_id)

    return asyncio.run(read())


def weather_of(condition_id, main, pop):
    current = {
        **CURRENT,
        "weather": [{"id": condition_id, "main": main, "description": main, "icon": "10d"}],
    }
    entries = [
        {**entry, "weather": current["weather"], "pop": pop, "rain": {"3h": 0.0}}
        for entry in FORECAST["list"]
    ]
    return current, {**FORECAST, "list": entries}


@pytest.mark.parametrize(
    ("condition_id", "main", "pop", "alert_type", "messages"),
    [
        (
            500,
            "Rain",
            0.8,
            "rain",
            ["Actualmente hay lluvia", "Se prevé lluvia el 12/10 a las 15:00 (80%)"],
        ),
        (
            906,
            "Extreme",
            0.9,
            "hail",
            ["Actualmente hay granizo", "Se prevé granizo el 12/10 a las 15:00 (90%)"],
        ),
        (800, "Clear", 0.0, None, []),
    ],
)
def test_app_gets_the_alerts_of_its_field(
    flow, open_weather, condition_id, main, pop, alert_type, messages
):
    client, sessions = flow
    open_weather.current, open_weather.forecast = weather_of(condition_id, main, pop)

    response = client.get("/api/v1/weather/fields/1", headers=login())

    assert response.status_code == 200
    body = response.json()
    assert [alert["message"] for alert in body["current_alerts"] + body["alerts"]] == messages
    row = cache_row(sessions)
    assert row.alert_active is bool(messages)
    assert row.alert_type == alert_type


@pytest.mark.parametrize(("field_id", "status"), [(3, 404), (1, 503)])
def test_no_alert_when_the_weather_cannot_be_read(
    flow, open_weather, monkeypatch, field_id, status
):
    client, sessions = flow

    async def no_wait(_):
        return None

    monkeypatch.setattr("services.weather_service.asyncio.sleep", no_wait)
    open_weather.status = 503

    response = client.get(f"/api/v1/weather/fields/{field_id}", headers=login())

    assert response.status_code == status
    assert cache_row(sessions, field_id) is None


def test_language_of_the_app_wins_over_the_profile(flow):
    client, _ = flow

    response = client.get("/api/v1/weather/fields/1?lang=ca-ES", headers=login())

    assert response.status_code == 200
    assert response.json()["lang"] == "ca"
    assert response.json()["current"]["condition"]["description"] == "light rain"


def test_forecast_is_saved_and_reused(flow, open_weather):
    client, sessions = flow

    first = client.get("/api/v1/weather/fields/1", headers=login())
    second = client.get("/api/v1/weather/fields/1", headers=login())

    assert first.status_code == second.status_code == 200
    assert second.json() == first.json()
    assert len(open_weather.forecasts()) == 2

    async def cached():
        async with sessions() as session:
            return await session.get(WeatherCache, 1)

    assert asyncio.run(cached()) is not None


def test_field_with_only_a_town_uses_geocoding(flow, open_weather):
    client, _ = flow

    response = client.get("/api/v1/weather/fields/2", headers=login())
    assert response.status_code == 200
    assert open_weather.requests[0].url.path.endswith("/direct")
    assert open_weather.requests[0].url.params["q"] == "Lleida"
    assert response.json()["location"]["name"] == "Lleida"
    assert response.json()["location"]["country"] == "ES"


def test_field_without_location_has_no_weather(flow, open_weather):
    client, _ = flow

    response = client.get("/api/v1/weather/fields/3", headers=login())

    assert response.status_code == 404
    assert response.json()["detail"] == "Field has no location"
    assert open_weather.requests == []


@pytest.mark.parametrize("field_id", [4, 999])
def test_field_of_another_user_or_unknown_is_not_found(flow, open_weather, field_id):
    client, _ = flow

    response = client.get(f"/api/v1/weather/fields/{field_id}", headers=login())

    assert response.status_code == 404
    assert response.json()["detail"] == "Field not found"
    assert open_weather.requests == []


def test_external_api_unavailable(flow, open_weather, monkeypatch):
    client, _ = flow

    async def no_wait(_):
        return None

    monkeypatch.setattr("services.weather_service.asyncio.sleep", no_wait)
    open_weather.status = 503

    response = client.get("/api/v1/weather/fields/1", headers=login())

    assert response.status_code == 503
    assert len(open_weather.forecasts()) == 4


def test_without_login_the_weather_is_not_shown(flow, open_weather):
    client, _ = flow

    response = client.get("/api/v1/weather/fields/1")

    assert response.status_code == 401
    assert open_weather.requests == []


def test_with_an_invalid_token_the_weather_is_not_shown(flow, open_weather):
    client, _ = flow

    response = client.get(
        "/api/v1/weather/fields/1", headers={"Authorization": "Bearer not-a-token"}
    )

    assert response.status_code == 401
    assert open_weather.requests == []
