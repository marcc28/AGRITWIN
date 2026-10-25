"""Open-Meteo provider used when the primary weather provider is unavailable."""

import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from models.weather import WeatherForecastResponse
from services import city_search, open_meteo
from services.weather_service import (
    DEFAULT_TIMEOUT_SECONDS,
    MAX_FORECAST_DAYS,
    DEFAULT_LANG,
    WeatherDataError,
    WeatherServiceError,
    WeatherUnavailableError,
    normalize_lang,
)

logger = logging.getLogger(__name__)


class OpenMeteoWeatherService:
    """Fetch and parse forecasts from Open-Meteo's forecast and geocoding APIs."""

    def __init__(self, client: httpx.AsyncClient | None = None):
        self._client = client

    async def _request(self, url: str, params: dict[str, Any]) -> Any:
        async def perform(client: httpx.AsyncClient) -> Any:
            try:
                response = await client.get(url, params=params)
            except httpx.TimeoutException as exc:
                raise WeatherUnavailableError("Open-Meteo request timed out") from exc
            except httpx.HTTPError as exc:
                raise WeatherUnavailableError("Open-Meteo is unavailable") from exc

            if response.status_code == 404:
                raise WeatherDataError("Open-Meteo data not found")
            if response.status_code == 429 or response.status_code >= 500:
                raise WeatherUnavailableError("Open-Meteo is unavailable")
            if response.status_code >= 400:
                raise WeatherServiceError(
                    f"Open-Meteo error (HTTP {response.status_code})"
                )
            try:
                return response.json()
            except ValueError as exc:
                raise WeatherServiceError("Invalid Open-Meteo response") from exc

        if self._client is not None:
            return await perform(self._client)
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS) as client:
            return await perform(client)

    async def get_forecast(
        self,
        latitude: float,
        longitude: float,
        units: str = "metric",
        lang: str = DEFAULT_LANG,
        days: int = MAX_FORECAST_DAYS,
    ) -> WeatherForecastResponse:
        if units not in ("metric", "imperial"):
            raise WeatherServiceError(f"Unsupported units '{units}'", status_code=400)
        days = max(1, min(days, MAX_FORECAST_DAYS))
        lang = normalize_lang(lang)
        params = open_meteo.build_params(latitude, longitude, units, days)
        raw = await self._request(open_meteo.OPEN_METEO_URL, params)
        try:
            result = open_meteo.parse(raw, latitude, longitude, units, lang, days)
        except (KeyError, TypeError, ValueError, IndexError, AttributeError) as exc:
            logger.exception("Unexpected Open-Meteo response")
            raise WeatherServiceError("Unexpected Open-Meteo response") from exc
        result.fetched_at = datetime.now(timezone.utc)
        return result

    async def find_city(
        self, city: str, country: str | None = None, lang: str = DEFAULT_LANG
    ) -> tuple[float, float, str, str | None]:
        language = normalize_lang(lang)
        raw = await self._request(
            city_search.GEOCODING_URL,
            city_search.build_params(city.strip(), language),
        )
        found = city_search.pick(raw, country)
        if found is None:
            raise WeatherDataError("City not found")
        return (
            float(found["latitude"]),
            float(found["longitude"]),
            found["name"],
            found.get("country_code"),
        )

    async def get_forecast_for_city(
        self,
        city: str,
        country: str | None = None,
        units: str = "metric",
        lang: str = DEFAULT_LANG,
        days: int = MAX_FORECAST_DAYS,
    ) -> WeatherForecastResponse:
        latitude, longitude, name, country_code = await self.find_city(city, country, lang)
        result = await self.get_forecast(latitude, longitude, units, lang, days)
        result.location.name = name
        result.location.country = country_code
        return result
