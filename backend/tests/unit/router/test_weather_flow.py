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
from tests.unit.test_weather_service import GEOCODING_HOST, LLEIDA, OPEN_METEO

CINTA = UUID("c1a7a5e0-0000-4000-a000-00000000000a")
MARC = UUID("a2c0b5e0-0000-4000-a000-00000000000b")


class OpenMeteo:
    def __init__(self):
        self.requests = []
        self.status = 200

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.host == GEOCODING_HOST:
            return httpx.Response(200, json=LLEIDA)
        if self.status != 200:
            return httpx.Response(self.status)
        return httpx.Response(200, json=OPEN_METEO)

    def forecasts(self):
        return [r for r in self.requests if r.url.host != GEOCODING_HOST]


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
def open_meteo():
    return OpenMeteo()


@pytest.fixture
def flow(monkeypatch, open_meteo):
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    sessions = asyncio.run(create_database(engine))
    monkeypatch.setattr(auth, "AsyncSessionLocal", sessions)
    WeatherService.clear_cache()

    async def field_weather_service():
        async with sessions() as session:
            client = httpx.AsyncClient(transport=httpx.MockTransport(open_meteo))
            weather = WeatherService(client=client, retry_delay=0)
            yield FieldWeatherService(session=session, weather=weather, cache_seconds=600)

    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_field_weather_service] = field_weather_service

    yield TestClient(app), sessions

    WeatherService.clear_cache()
    asyncio.run(engine.dispose())


def login(username="cinta"):
    token = auth.create_access_token({"sub": username})
    return {"Authorization": f"Bearer {token}"}


# FULL FLOW: route -> service -> database -> Open-Meteo (mocked)


def test_app_gets_the_weather_of_its_field(flow, open_meteo):
    client, _ = flow

    response = client.get("/api/v1/weather/fields/1?days=3", headers=login())

    assert response.status_code == 200
    body = response.json()
    assert body["location"]["field_id"] == 1
    assert body["current"]["temperature"] == 21.4
    assert body["current"]["condition"]["description"] == "lluvia ligera"
    assert body["daily"][0]["temp_max"] == 25.0
    assert body["hourly"]
    request = open_meteo.forecasts()[0]
    assert request.url.params["latitude"] == "41.56"
    assert request.url.params["longitude"] == "0.52"


def test_language_of_the_app_wins_over_the_profile(flow):
    client, _ = flow

    response = client.get("/api/v1/weather/fields/1?lang=ca-ES", headers=login())

    assert response.status_code == 200
    assert response.json()["lang"] == "ca"
    assert response.json()["current"]["condition"]["description"] == "pluja feble"


def test_forecast_is_saved_and_reused(flow, open_meteo):
    client, sessions = flow

    first = client.get("/api/v1/weather/fields/1", headers=login())
    second = client.get("/api/v1/weather/fields/1", headers=login())

    assert first.status_code == second.status_code == 200
    assert second.json() == first.json()
    assert len(open_meteo.forecasts()) == 1

    async def cached():
        async with sessions() as session:
            return await session.get(WeatherCache, 1)

    assert asyncio.run(cached()) is not None


def test_field_with_only_a_town_is_searched(flow, open_meteo):
    client, _ = flow

    response = client.get("/api/v1/weather/fields/2", headers=login())

    assert response.status_code == 200
    assert open_meteo.requests[0].url.host == GEOCODING_HOST
    assert open_meteo.requests[0].url.params["name"] == "Lleida"


def test_field_without_location_has_no_weather(flow, open_meteo):
    client, _ = flow

    response = client.get("/api/v1/weather/fields/3", headers=login())

    assert response.status_code == 404
    assert response.json()["detail"] == "Field has no location"
    assert open_meteo.requests == []


@pytest.mark.parametrize("field_id", [4, 999])
def test_field_of_another_user_or_unknown_is_not_found(flow, open_meteo, field_id):
    client, _ = flow

    response = client.get(f"/api/v1/weather/fields/{field_id}", headers=login())

    assert response.status_code == 404
    assert response.json()["detail"] == "Field not found"
    assert open_meteo.requests == []


def test_external_api_unavailable(flow, open_meteo):
    client, _ = flow
    open_meteo.status = 503

    response = client.get("/api/v1/weather/fields/1", headers=login())

    assert response.status_code == 503
    assert len(open_meteo.forecasts()) == 2


def test_without_login_the_weather_is_not_shown(flow, open_meteo):
    client, _ = flow

    response = client.get("/api/v1/weather/fields/1")

    assert response.status_code == 401
    assert open_meteo.requests == []


def test_with_an_invalid_token_the_weather_is_not_shown(flow):
    client, _ = flow

    response = client.get(
        "/api/v1/weather/fields/1", headers={"Authorization": "Bearer not-a-token"}
    )

    assert response.status_code == 401
