import asyncio
import logging
import re
from typing import Any

import httpx

from models.weather import WeatherForecastResponse
from services import city_search, open_meteo

DEFAULT_LANG = "ca"
DEFAULT_TIMEOUT_SECONDS = 10.0
SUPPORTED_UNITS = ("metric", "imperial")
MAX_FORECAST_DAYS = 5
MAX_ATTEMPTS = 2
RETRY_DELAY_SECONDS = 0.5
MAX_CACHED_CITIES = 500

logger = logging.getLogger(__name__)


def normalize_lang(lang: str | None) -> str:
    code = re.split(r"[-_]", (lang or "").strip().lower())[0]
    return code if code.isalpha() and 2 <= len(code) <= 3 else DEFAULT_LANG


class WeatherServiceError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class WeatherUnavailableError(WeatherServiceError):
    def __init__(self, message: str = "Weather provider is unavailable"):
        super().__init__(message, status_code=503)


class WeatherDataError(WeatherServiceError):
    def __init__(self, message: str = "Weather data not available for this location"):
        super().__init__(message, status_code=404)


class WeatherService:
    _cities: dict[tuple, tuple[float, float, str, str | None]] = {}

    def __init__(
        self,
        client: httpx.AsyncClient | None = None,
        forecast_url: str = open_meteo.OPEN_METEO_URL,
        city_search_url: str = city_search.GEOCODING_URL,
        retry_delay: float = RETRY_DELAY_SECONDS,
    ):
        self._client = client
        self._forecast_url = forecast_url
        self._city_search_url = city_search_url
        self._retry_delay = retry_delay

    @classmethod
    def clear_cache(cls) -> None:
        cls._cities.clear()

    async def get_forecast(
        self,
        latitude: float,
        longitude: float,
        units: str = "metric",
        lang: str = DEFAULT_LANG,
        days: int = MAX_FORECAST_DAYS,
    ) -> WeatherForecastResponse:
        if units not in SUPPORTED_UNITS:
            raise WeatherServiceError(f"Unsupported units '{units}'", status_code=400)
        days = max(1, min(days, MAX_FORECAST_DAYS))
        lang = normalize_lang(lang)

        raw = await self._request(
            self._forecast_url, open_meteo.build_params(latitude, longitude, units, days)
        )
        try:
            return open_meteo.parse(raw, latitude, longitude, units, lang, days)
        except (KeyError, TypeError, ValueError, IndexError, AttributeError) as exc:
            raise WeatherServiceError("Unexpected response from weather provider") from exc

    async def get_forecast_for_city(
        self,
        city: str,
        country: str | None = None,
        units: str = "metric",
        lang: str = DEFAULT_LANG,
        days: int = MAX_FORECAST_DAYS,
    ) -> WeatherForecastResponse:
        latitude, longitude, name, country_code = await self.find_city(city, country, lang)
        result = await self.get_forecast(latitude, longitude, units=units, lang=lang, days=days)
        result.location.name = name
        result.location.country = country_code
        return result

    async def find_city(
        self, city: str, country: str | None = None, lang: str = DEFAULT_LANG
    ) -> tuple[float, float, str, str | None]:
        lang = normalize_lang(lang)
        key = (city.strip().lower(), (country or "").upper(), lang)
        if key in self._cities:
            return self._cities[key]

        raw = await self._request(
            self._city_search_url, city_search.build_params(city.strip(), lang)
        )
        found = city_search.pick(raw, country)
        if found is None:
            raise WeatherDataError("City not found")
        place = (
            float(found["latitude"]),
            float(found["longitude"]),
            found.get("name") or city,
            (found.get("country_code") or "").upper() or None,
        )

        if len(self._cities) >= MAX_CACHED_CITIES:
            self._cities.clear()
        self._cities[key] = place
        return place

    async def _request(self, url: str, params: dict[str, Any]) -> dict:
        if self._client is not None:
            return await self._get_with_retry(self._client, url, params)
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS) as client:
            return await self._get_with_retry(client, url, params)


    async def _get_with_retry(
        self, client: httpx.AsyncClient, url: str, params: dict[str, Any]
    ) -> dict:
        error = WeatherUnavailableError()

        for attempt in range(MAX_ATTEMPTS):
            if attempt:
                await asyncio.sleep(self._retry_delay)

            try:
                response = await client.get(url, params=params)

            except httpx.TimeoutException as exc:
                logger.warning(
                    "Timeout del proveïdor %s: %s (intent %s/%s)",
                    url,
                    str(exc),
                    attempt + 1,
                    MAX_ATTEMPTS,
                )
                error = WeatherUnavailableError("Weather provider timed out")
                continue

            except httpx.HTTPError as exc:
                logger.warning(
                    "Error de connexió amb %s: %r (intent %s/%s)",
                    url,
                    exc,
                    attempt + 1,
                    MAX_ATTEMPTS,
                )
                error = WeatherUnavailableError()
                continue

            if response.status_code == 429:
                logger.warning(
                    "Open-Meteo HTTP 429 | URL=%s | body=%s | headers=%s",
                    str(response.request.url),
                    response.text[:2000],
                    dict(response.headers),
                )
                raise WeatherUnavailableError(
                    "Weather provider rate limit exceeded"
                )
            if response.status_code >= 500:
                logger.warning(
                    "Error del proveïdor %s: HTTP %s (intent %s/%s)",
                    url,
                    response.status_code,
                    attempt + 1,
                    MAX_ATTEMPTS,
                )
                error = WeatherUnavailableError()
                continue

            return self._read(response)

        raise error

    @staticmethod
    def _read(response: httpx.Response) -> dict:
        if response.status_code == 404:
            raise WeatherDataError()
        if response.status_code == 429:
            raise WeatherUnavailableError("Weather provider rate limit exceeded")
        if response.status_code >= 400:
            raise WeatherServiceError(f"Weather provider error (HTTP {response.status_code})")
        try:
            return response.json()
        except ValueError as exc:
            raise WeatherServiceError("Invalid response from weather provider") from exc
