import os

# Set a fallback database URL for CI environments before importing db.database
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

from datetime import timedelta
from unittest.mock import AsyncMock
from uuid import UUID

import httpx
import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from db.schema import Base, Field, User, UserProfile, WeatherCache
from services.field_weather_service import FieldWeatherService
from services.weather_service import WeatherDataError, WeatherService, WeatherUnavailableError
from tests.unit.test_weather_service import CURRENT, FORECAST

USER_ID = UUID("c1a7a5e0-0000-4000-a000-00000000000a")


@pytest.fixture(autouse=True)
def _api_key(monkeypatch):
    monkeypatch.setenv("OPENWEATHER_API_KEY", "test-api-key")


@pytest.fixture
async def sessions():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add(
            User(id=USER_ID, username="cinta", email="cinta@example.com", password_hash="x")
        )
        session.add_all(
            [
                Field(id=1, user_id=USER_ID, name="Hort", location="Alcarràs", lat=41.56, lon=0.52),
                Field(id=2, user_id=USER_ID, name="Camp sense GPS", location="Lleida"),
                Field(id=3, user_id=USER_ID, name="Camp buit"),
            ]
        )
        await session.commit()
    yield factory
    await engine.dispose()


def recorder(calls, status=200):
    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if status != 200:
            return httpx.Response(status)
        if request.url.path.endswith("/weather"):
            return httpx.Response(200, json=CURRENT)
        if request.url.path.endswith("/forecast"):
            return httpx.Response(200, json=FORECAST)
        return httpx.Response(
            200,
            json=[{"lat": 41.6176, "lon": 0.62, "name": "Lleida", "country": "ES"}],
        )

    return handler


def make_service(session, handler, cache_seconds=600) -> FieldWeatherService:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return FieldWeatherService(
        session, weather=WeatherService(client=client), cache_seconds=cache_seconds
    )


async def forecast(sessions, handler, field_id=1, cache_seconds=600, **kwargs):
    async with sessions() as session:
        return await make_service(session, handler, cache_seconds).get_forecast(field_id, **kwargs)


async def cache_row(sessions, field_id=1) -> WeatherCache | None:
    async with sessions() as session:
        return await session.get(WeatherCache, field_id)


async def test_field_forecast_uses_coordinates_and_saves_cache(sessions):
    calls = []
    result = await forecast(sessions, recorder(calls))

    assert len(calls) == 2
    assert {request.url.path for request in calls} == {"/data/2.5/weather", "/data/2.5/forecast"}
    assert all(request.url.params["lat"] == "41.56" for request in calls)
    assert all(request.url.params["lon"] == "0.52" for request in calls)
    assert result.location.field_id == 1
    assert result.location.name == "Alcarràs"
    assert result.fetched_at is not None
    row = await cache_row(sessions)
    assert float(row.forecast_temperature_c) == 21.4
    assert float(row.forecast_rain_mm) == 3.4
    assert row.forecast_days["location"]["field_id"] == 1


async def test_second_request_uses_weather_cache(sessions):
    calls = []
    first = await forecast(sessions, recorder(calls))
    second = await forecast(sessions, recorder(calls), days=1)

    assert len(calls) == 2
    assert second.current == first.current
    assert second.fetched_at == first.fetched_at
    assert len(second.daily) == 1


async def test_expired_cache_is_refreshed(sessions):
    calls = []
    await forecast(sessions, recorder(calls))
    async with sessions() as session:
        row = await session.get(WeatherCache, 1)
        row.timestamp -= timedelta(minutes=11)
        await session.commit()

    await forecast(sessions, recorder(calls))
    assert len(calls) == 4


async def test_cache_is_not_used_after_field_coordinates_change(sessions):
    calls = []
    await forecast(sessions, recorder(calls))
    async with sessions() as session:
        field = await session.get(Field, 1)
        field.lat, field.lon = 41.70, 0.80
        await session.commit()

    result = await forecast(sessions, recorder(calls))
    assert len(calls) == 4
    assert calls[2].url.params["lat"] == "41.7"
    assert (result.location.latitude, result.location.longitude) == (41.70, 0.80)


async def test_cache_disabled_always_requests_provider(sessions):
    calls = []
    await forecast(sessions, recorder(calls), cache_seconds=0)
    await forecast(sessions, recorder(calls), cache_seconds=0)
    assert len(calls) == 4


async def test_units_and_language_are_part_of_cache_identity(sessions):
    calls = []
    await forecast(sessions, recorder(calls))
    result = await forecast(sessions, recorder(calls), units="imperial", lang="es")

    assert len(calls) == 4
    assert result.units == "imperial"
    assert result.lang == "es"
    assert all(request.url.params["units"] == "imperial" for request in calls[2:])
    assert all(request.url.params["lang"] == "es" for request in calls[2:])


async def test_imperial_cache_temperature_is_saved_in_celsius(sessions):
    payload = {**CURRENT, "main": {**CURRENT["main"], "temp": 68.0}}

    def handler(request):
        return httpx.Response(
            200, json=payload if request.url.path.endswith("/weather") else FORECAST
        )

    await forecast(sessions, handler, units="imperial")
    row = await cache_row(sessions)
    assert float(row.forecast_temperature_c) == 20.0


async def test_field_without_coordinates_uses_city_geocoding(sessions):
    calls = []
    result = await forecast(sessions, recorder(calls), field_id=2)
    assert len(calls) == 3
    assert calls[0].url.host == "api.openweathermap.org"
    assert calls[0].url.path == "/geo/1.0/direct"
    assert calls[0].url.params["q"] == "Lleida"
    assert result.location.name == "Lleida"
    assert result.location.country == "ES"
    assert result.location.field_id == 2


async def test_field_without_location_is_404_without_provider_call(sessions):
    calls = []
    with pytest.raises(WeatherDataError) as exc:
        await forecast(sessions, recorder(calls), field_id=3)
    assert exc.value.status_code == 404
    assert exc.value.message == "Field has no location"
    assert calls == []


async def test_unknown_field_is_404(sessions):
    with pytest.raises(WeatherDataError) as exc:
        await forecast(sessions, recorder([]), field_id=99)
    assert exc.value.message == "Field not found"


async def test_provider_error_does_not_save_cache(sessions, monkeypatch):
    async def no_wait(_):
        return None

    monkeypatch.setattr("services.weather_service.asyncio.sleep", no_wait)
    calls = []
    with pytest.raises(WeatherUnavailableError):
        await forecast(sessions, recorder(calls, status=503))
    assert len(calls) == 4
    assert await cache_row(sessions) is None


async def test_weather_is_returned_even_if_cache_save_fails(sessions):
    async with sessions() as session:
        service = make_service(session, recorder([]))
        session.commit = AsyncMock(side_effect=SQLAlchemyError("database down"))
        result = await service.get_forecast(1)

    assert result.current.temperature == 21.4
    assert await cache_row(sessions) is None


async def test_unreadable_cache_is_ignored(sessions):
    calls = []
    await forecast(sessions, recorder(calls))
    async with sessions() as session:
        row = await session.get(WeatherCache, 1)
        row.forecast_days = {"old": "format"}
        await session.commit()

    result = await forecast(sessions, recorder(calls))
    assert len(calls) == 4
    assert result.current.temperature == 21.4


async def test_profile_language_is_used_and_cached(sessions):
    async with sessions() as session:
        session.add(UserProfile(id=USER_ID, name="Cinta", language="es"))
        await session.commit()

    calls = []
    result = await forecast(sessions, recorder(calls))
    assert result.lang == "es"
    assert all(request.url.params["lang"] == "es" for request in calls)


async def test_request_language_wins_over_profile(sessions):
    async with sessions() as session:
        session.add(UserProfile(id=USER_ID, name="Cinta", language="es"))
        await session.commit()

    result = await forecast(sessions, recorder([]), lang="en")
    assert result.lang == "en"


async def test_field_owner_is_checked_before_weather_request(sessions):
    calls = []
    with pytest.raises(WeatherDataError) as exc:
        await forecast(sessions, recorder(calls), username="nobody")
    assert exc.value.status_code == 404
    assert calls == []
