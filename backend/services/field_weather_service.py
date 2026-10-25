import logging
import os
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from db.schema import Field, User, UserProfile, WeatherCache
from models.weather import WeatherForecastResponse
from services.fallback_weather_service import FallbackWeatherService
from services.weather_service import (
    MAX_FORECAST_DAYS,
    WeatherDataError,
    WeatherService,
    normalize_lang,
)

logger = logging.getLogger(__name__)

DEFAULT_CACHE_SECONDS = 600


def _cache_seconds_from_env() -> float:
    try:
        return float(os.getenv("WEATHER_CACHE_SECONDS", DEFAULT_CACHE_SECONDS))
    except ValueError:
        return DEFAULT_CACHE_SECONDS


def _utc_now_without_timezone() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _fahrenheit_to_celsius(value: float) -> float:
    return (value - 32) * 5 / 9


def _decimal(value: float | None) -> Decimal | None:
    return None if value is None else Decimal(str(round(value, 2)))


def _has_coordinates(field: Field) -> bool:
    return field.lat is not None and field.lon is not None


class FieldWeatherService:
    def __init__(
        self,
        session: AsyncSession,
        weather: WeatherService | FallbackWeatherService | None = None,
        cache_seconds: float | None = None,
    ):
        self._db = session
        self._weather = weather or FallbackWeatherService()
        self._cache_seconds = _cache_seconds_from_env() if cache_seconds is None else cache_seconds

    async def get_forecast(
        self,
        field_id: int,
        units: str = "metric",
        lang: str | None = None,
        days: int = MAX_FORECAST_DAYS,
        username: str | None = None,
    ) -> WeatherForecastResponse:
        field = await self._db.get(Field, field_id)
        if field is None or (username is not None and not await self._owns(username, field_id)):
            raise WeatherDataError("Field not found")

        lang = normalize_lang(lang or await self._profile_language(field.id))
        now = _utc_now_without_timezone()
        row = await self._db.get(WeatherCache, field_id)

        result = self._cached_forecast(field, row, now, units, lang)
        if result is None:
            result = await self._fetch(field, units, lang)
            result.fetched_at = now
            await self._save(field.id, row, result, now)

        return result.model_copy(update={"daily": result.daily[:days]})

    async def _owns(self, username: str, field_id: int) -> bool:
        result = await self._db.execute(
            select(Field.id).join(Field.user).where(Field.id == field_id, User.username == username)
        )
        return result.first() is not None

    async def _profile_language(self, field_id: int) -> str | None:
        result = await self._db.execute(
            select(UserProfile.language)
            .join(UserProfile.user)
            .join(User.fields)
            .where(Field.id == field_id)
        )
        return result.scalars().first()

    def _cached_forecast(
        self, field: Field, row: WeatherCache | None, now: datetime, units: str, lang: str
    ) -> WeatherForecastResponse | None:
        if row is None or not row.forecast_days or self._cache_seconds <= 0:
            return None
        if now - row.timestamp >= timedelta(seconds=self._cache_seconds):
            return None
        try:
            cached = WeatherForecastResponse.model_validate(row.forecast_days)
        except ValidationError:
            return None
        if cached.units != units or cached.lang != lang:
            return None
        if self._location_changed(field, cached):
            return None
        return cached

    @staticmethod
    def _location_changed(field: Field, cached: WeatherForecastResponse) -> bool:
        location = cached.location
        if _has_coordinates(field):
            return (location.latitude, location.longitude) != (field.lat, field.lon)
        return location.name != field.location

    async def _fetch(self, field: Field, units: str, lang: str) -> WeatherForecastResponse:
        if _has_coordinates(field):
            result = await self._weather.get_forecast(
                field.lat, field.lon, units=units, lang=lang, days=MAX_FORECAST_DAYS
            )
        elif field.location and field.location.strip():
            result = await self._weather.get_forecast_for_city(
                field.location, units=units, lang=lang, days=MAX_FORECAST_DAYS
            )
        else:
            raise WeatherDataError("Field has no location")

        result.location.field_id = field.id
        if field.location:
            result.location.name = field.location
        return result

    async def _save(
        self,
        field_id: int,
        row: WeatherCache | None,
        result: WeatherForecastResponse,
        now: datetime,
    ) -> None:
        temperature_c = result.current.temperature
        if result.units == "imperial":
            temperature_c = _fahrenheit_to_celsius(temperature_c)

        if row is None:
            row = WeatherCache(field_id=field_id)
            self._db.add(row)
        row.timestamp = now
        row.forecast_temperature_c = _decimal(temperature_c)
        row.forecast_rain_mm = _decimal(result.daily[0].rain_mm) if result.daily else None
        row.forecast_days = result.model_dump(mode="json")

        try:
            await self._db.commit()
        except SQLAlchemyError:
            await self._db.rollback()
            logger.warning("Could not save weather_cache for field %s", field_id, exc_info=True)
