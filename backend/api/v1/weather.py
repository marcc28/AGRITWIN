from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.exceptions import RequestValidationError

from db import AsyncSessionLocal
from models.weather import WeatherForecastResponse
from services.field_weather_service import FieldWeatherService
from services.weather_service import (
    DEFAULT_LANG,
    MAX_FORECAST_DAYS,
    WeatherService,
    WeatherServiceError,
)

router = APIRouter(prefix="/weather", tags=["Weather"])

Units = Literal["metric", "imperial"]
MAX_DB_INTEGER = 2_147_483_647
LANG_PATTERN = r"^[a-zA-Z_]+$"


def get_weather_service() -> WeatherService:
    return WeatherService()


async def get_field_weather_service() -> FieldWeatherService:
    async with AsyncSessionLocal() as session:
        yield FieldWeatherService(session=session)


def _days_query():
    return Query(MAX_FORECAST_DAYS, ge=1, le=MAX_FORECAST_DAYS)


def _missing(field: str, msg: str) -> RequestValidationError:
    return RequestValidationError([{"type": "missing", "loc": ("query", field), "msg": msg}])


@router.get("/fields/{field_id}", response_model=WeatherForecastResponse)
async def get_field_weather(
    field_id: int = Path(..., ge=1, le=MAX_DB_INTEGER, description="Id del camp a la taula fields"),
    units: Units = Query("metric"),
    lang: str | None = Query(
        None,
        min_length=2,
        max_length=5,
        pattern=LANG_PATTERN,
        description="Si no s'envia, l'idioma del perfil de l'usuari (user_profile.language)",
    ),
    days: int = _days_query(),
    service: FieldWeatherService = Depends(get_field_weather_service),
):
    try:
        return await service.get_forecast(field_id, units=units, lang=lang, days=days)
    except WeatherServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/forecast", response_model=WeatherForecastResponse)
async def get_weather_forecast(
    lat: float | None = Query(None, ge=-90, le=90, description="Latitud"),
    lon: float | None = Query(None, ge=-180, le=180, description="Longitud"),
    city: str | None = Query(
        None, min_length=1, max_length=100, description="Nom de la ciutat (si no hi ha lat/lon)"
    ),
    country: str | None = Query(
        None, pattern=r"^[A-Za-z]{2}$", description="Codi de país de 2 lletres, p. ex. ES"
    ),
    units: Units = Query("metric"),
    lang: str = Query(DEFAULT_LANG, min_length=2, max_length=5, pattern=LANG_PATTERN),
    days: int = _days_query(),
    service: WeatherService = Depends(get_weather_service),
):
    if (lat is None) != (lon is None):
        raise _missing("lon" if lon is None else "lat", "Field required")
    if lat is None and not (city and city.strip()):
        raise _missing("lat", "Field required (or use city)")
    try:
        if lat is not None:
            return await service.get_forecast(
                latitude=lat, longitude=lon, units=units, lang=lang, days=days
            )
        return await service.get_forecast_for_city(
            city=city, country=country, units=units, lang=lang, days=days
        )
    except WeatherServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
