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
from tests.unit.test_weather_service import GEOCODING_HOST, LLEIDA, OPEN_METEO

USER_IDS = {
    "cinta": UUID("c1a7a5e0-0000-4000-a000-00000000000a"),
    "marc": UUID("a2c0b5e0-0000-4000-a000-00000000000b"),
}


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
            User(
                id=USER_IDS["cinta"],
                username="cinta",
                email="cinta@example.com",
                password_hash="x",
            )
        )
        session.add_all(
            [
                Field(
                    id=1,
                    user_id=USER_IDS["cinta"],
                    name="Hort",
                    location="Alcarràs",
                    lat=41.56,
                    lon=0.52,
                ),
                Field(id=2, user_id=USER_IDS["cinta"], name="Camp sense GPS", location="Lleida"),
                Field(id=3, user_id=USER_IDS["cinta"], name="Camp buit"),
            ]
        )
        await session.commit()

    yield factory
    await engine.dispose()


@pytest.fixture(autouse=True)
def _clear_caches():
    WeatherService.clear_cache()
    yield
    WeatherService.clear_cache()


def recorder(calls, status=200):
    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.url.host == GEOCODING_HOST:
            return httpx.Response(200, json=LLEIDA)
        if status != 200:
            return httpx.Response(status)
        return httpx.Response(200, json=OPEN_METEO)

    return handler


def make_service(session, handler, cache_seconds=600) -> FieldWeatherService:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    weather = WeatherService(client=client, retry_delay=0)
    return FieldWeatherService(session, weather=weather, cache_seconds=cache_seconds)


async def forecast(sessions, handler, field_id=1, cache_seconds=600, **kwargs):
    async with sessions() as session:
        service = make_service(session, handler, cache_seconds)
        return await service.get_forecast(field_id, **kwargs)


async def cache_row(sessions, field_id=1) -> WeatherCache | None:
    async with sessions() as session:
        return await session.get(WeatherCache, field_id)


# 1. WEATHER CACHE (weather_cache table)


async def test_field_with_coordinates_uses_them_and_saves_the_forecast(sessions):
    calls = []

    result = await forecast(sessions, recorder(calls))

    assert len(calls) == 1
    assert calls[0].url.params["latitude"] == "41.56"
    assert calls[0].url.params["longitude"] == "0.52"
    assert calls[0].url.params["forecast_days"] == "5"
    assert result.location.field_id == 1
    assert result.location.name == "Alcarràs"
    assert result.fetched_at is not None

    row = await cache_row(sessions)
    assert float(row.forecast_temperature_c) == 21.4
    assert float(row.forecast_rain_mm) == 3.4
    assert row.forecast_days["location"]["field_id"] == 1
    assert len(row.forecast_days["daily"]) == 2
    assert row.alert_active is False


async def test_second_request_uses_weather_cache(sessions):
    calls = []

    first = await forecast(sessions, recorder(calls))
    second = await forecast(sessions, recorder(calls), days=1)

    assert len(calls) == 1
    assert second.current == first.current
    assert second.fetched_at == first.fetched_at
    assert len(second.daily) == 1


async def test_old_cache_is_refreshed_and_the_row_updated(sessions):
    calls = []
    await forecast(sessions, recorder(calls))

    async with sessions() as session:
        row = await session.get(WeatherCache, 1)
        row.timestamp -= timedelta(minutes=11)
        await session.commit()

    await forecast(sessions, recorder(calls))

    assert len(calls) == 2
    async with sessions() as session:
        rows = (await session.execute(WeatherCache.__table__.select())).all()
    assert len(rows) == 1


async def test_cache_is_not_used_after_the_field_moves(sessions):
    calls = []
    await forecast(sessions, recorder(calls))

    async with sessions() as session:
        field = await session.get(Field, 1)
        field.lat, field.lon = 41.70, 0.80
        await session.commit()

    result = await forecast(sessions, recorder(calls))

    assert len(calls) == 2
    assert calls[1].url.params["latitude"] == "41.7"
    assert (result.location.latitude, result.location.longitude) == (41.70, 0.80)


async def test_cache_is_not_used_after_the_location_name_changes(sessions):
    calls = []
    await forecast(sessions, recorder(calls), field_id=2)

    async with sessions() as session:
        field = await session.get(Field, 2)
        field.location = "Lleida, Segrià"
        await session.commit()

    result = await forecast(sessions, recorder(calls), field_id=2)

    assert len(calls) == 4
    assert result.location.name == "Lleida, Segrià"


async def test_language_in_capitals_uses_the_same_cache(sessions):
    calls = []

    await forecast(sessions, recorder(calls), lang="ca")
    result = await forecast(sessions, recorder(calls), lang="CA")

    assert len(calls) == 1
    assert result.lang == "ca"


async def test_cache_disabled_always_asks_the_provider(sessions):
    calls = []

    await forecast(sessions, recorder(calls), cache_seconds=0)
    await forecast(sessions, recorder(calls), cache_seconds=0)

    assert len(calls) == 2


@pytest.mark.parametrize(("units", "lang"), [("imperial", "ca"), ("metric", "es")])
async def test_other_units_or_language_are_not_taken_from_cache(sessions, units, lang):
    calls = []

    await forecast(sessions, recorder(calls))
    result = await forecast(sessions, recorder(calls), units=units, lang=lang)

    assert len(calls) == 2
    assert (result.units, result.lang) == (units, lang)


async def test_imperial_forecast_is_saved_in_celsius(sessions):
    payload = {**OPEN_METEO, "current": {**OPEN_METEO["current"], "temperature_2m": 68.0}}

    def handler(request):
        return httpx.Response(200, json=payload)

    await forecast(sessions, handler, units="imperial")

    row = await cache_row(sessions)
    assert float(row.forecast_temperature_c) == 20.0


# 2. FIELD LOCATION AND ERRORS


async def test_field_without_coordinates_uses_its_location_name(sessions):
    calls = []

    result = await forecast(sessions, recorder(calls), field_id=2)

    assert calls[0].url.host == GEOCODING_HOST
    assert calls[0].url.params["name"] == "Lleida"
    assert calls[1].url.params["latitude"] == "41.6176"
    assert result.location.name == "Lleida"
    assert result.location.country == "ES"
    assert result.location.field_id == 2


async def test_field_without_location_is_404(sessions):
    calls = []

    handler = recorder(calls)
    with pytest.raises(WeatherDataError) as exc:
        await forecast(sessions, handler, field_id=3)

    assert exc.value.status_code == 404
    assert exc.value.message == "Field has no location"
    assert calls == []


async def test_unknown_field_is_404(sessions):
    handler = recorder([])
    with pytest.raises(WeatherDataError) as exc:
        await forecast(sessions, handler, field_id=99)

    assert exc.value.message == "Field not found"


async def test_provider_error_saves_nothing(sessions):
    handler = recorder([], status=503)
    with pytest.raises(WeatherUnavailableError):
        await forecast(sessions, handler)

    assert await cache_row(sessions) is None


async def test_weather_is_returned_even_if_it_cannot_be_saved(sessions):
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

    assert len(calls) == 2
    assert result.current.temperature == 21.4


# 3. LANGUAGE OF THE USER PROFILE (user_profile.language)


async def set_profile_language(sessions, language, username="cinta"):
    async with sessions() as session:
        profile = await session.get(UserProfile, USER_IDS[username])
        if profile is None:
            session.add(UserProfile(id=USER_IDS[username], name=username, language=language))
        else:
            profile.language = language
        await session.commit()


async def test_without_profile_the_language_is_catalan(sessions):
    result = await forecast(sessions, recorder([]))

    assert result.lang == "ca"
    assert result.current.condition.description == "pluja feble"


@pytest.mark.parametrize(
    ("language", "lang", "description"),
    [
        ("es", "es", "lluvia ligera"),
        ("en", "en", "light rain"),
        ("it", "it", "pioggia leggera"),
        ("ca", "ca", "pluja feble"),
        ("ES", "es", "lluvia ligera"),
    ],
)
async def test_language_of_the_user_profile_is_used(sessions, language, lang, description):
    await set_profile_language(sessions, language)

    result = await forecast(sessions, recorder([]))

    assert result.lang == lang
    assert result.current.condition.description == description
    assert result.daily[0].condition.description != ""


async def test_lang_in_the_request_wins_over_the_profile(sessions):
    await set_profile_language(sessions, "es")

    result = await forecast(sessions, recorder([]), lang="en")

    assert result.lang == "en"
    assert result.current.condition.description == "light rain"


async def test_profile_language_change_is_not_hidden_by_the_cache(sessions):
    calls = []
    await set_profile_language(sessions, "es")
    first = await forecast(sessions, recorder(calls))

    await set_profile_language(sessions, "it")
    second = await forecast(sessions, recorder(calls))
    third = await forecast(sessions, recorder(calls))

    assert (first.lang, second.lang, third.lang) == ("es", "it", "it")
    assert len(calls) == 2


async def test_field_without_coordinates_searches_in_the_profile_language(sessions):
    calls = []
    await set_profile_language(sessions, "es")

    await forecast(sessions, recorder(calls), field_id=2)

    assert calls[0].url.host == GEOCODING_HOST
    assert calls[0].url.params["language"] == "es"


def test_invalid_cache_setting_falls_back_to_default(monkeypatch):
    monkeypatch.setenv("WEATHER_CACHE_SECONDS", "abc")

    service = FieldWeatherService(session=None)

    assert service._cache_seconds == 600


async def test_regional_language_code_uses_the_language(sessions):
    result = await forecast(sessions, recorder([]), lang="es-ES")

    assert result.lang == "es"
    assert result.current.condition.description == "lluvia ligera"


# 4. FIELDS OF THE LOGGED USER


async def add_other_user_field(sessions):
    async with sessions() as session:
        session.add(
            User(
                id=USER_IDS["marc"],
                username="marc",
                email="marc@example.com",
                password_hash="x",
            )
        )
        session.add(
            Field(
                id=9,
                user_id=USER_IDS["marc"],
                name="Finca",
                location="Mollerussa",
                lat=41.63,
                lon=0.89,
            )
        )
        await session.commit()


async def test_owner_gets_the_weather_of_the_field(sessions):
    result = await forecast(sessions, recorder([]), username="cinta")

    assert result.location.field_id == 1


async def test_field_of_another_user_is_not_found(sessions):
    calls = []
    await add_other_user_field(sessions)

    handler = recorder(calls)
    with pytest.raises(WeatherDataError) as exc:
        await forecast(sessions, handler, field_id=9, username="cinta")

    assert exc.value.status_code == 404
    assert exc.value.message == "Field not found"
    assert calls == []


async def test_unknown_user_does_not_see_the_field(sessions):
    handler = recorder([])
    with pytest.raises(WeatherDataError):
        await forecast(sessions, handler, username="nobody")
