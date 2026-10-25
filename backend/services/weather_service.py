import asyncio
import logging
import os
import re
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

import httpx

from models.weather import (
    CurrentWeather,
    DailyForecast,
    HourlyForecast,
    WeatherCondition,
    WeatherForecastResponse,
    WeatherLocation,
    Wind,
)

logger = logging.getLogger(__name__)

BASE_URL = "https://api.openweathermap.org/data/2.5"
GEOCODING_URL = "https://api.openweathermap.org/geo/1.0/direct"

DEFAULT_LANG = "ca"
DEFAULT_TIMEOUT_SECONDS = 10.0
MAX_FORECAST_DAYS = 5
SUPPORTED_UNITS = ("metric", "imperial")


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
    def __init__(self, message: str = "Weather data not available"):
        super().__init__(message, status_code=404)


class WeatherService:
    def __init__(self, client: httpx.AsyncClient | None = None):
        self._client = client
        self._api_key = os.getenv("OPENWEATHER_API_KEY")

    async def _request(self, url: str, params: dict[str, Any]) -> dict:
        if not self._api_key:
            raise WeatherServiceError("OPENWEATHER_API_KEY is not configured", status_code=500)

        request_params = {**params, "appid": self._api_key}

        async def perform(client: httpx.AsyncClient) -> dict:
            for attempt in range(2):
                try:
                    response = await client.get(url, params=request_params)
                except (httpx.TimeoutException, httpx.HTTPError) as exc:
                    logger.warning("OpenWeather request failed: %s", exc)
                    if attempt == 0:
                        await asyncio.sleep(0.5)
                        continue
                    raise WeatherUnavailableError() from exc

                if response.status_code == 401:
                    raise WeatherServiceError(
                        "OpenWeather API key is invalid or not yet active",
                        status_code=502,
                    )
                if response.status_code == 404:
                    raise WeatherDataError()
                if response.status_code == 429:
                    raise WeatherUnavailableError("Weather provider rate limit exceeded")
                if response.status_code >= 500:
                    if attempt == 0:
                        await asyncio.sleep(0.5)
                        continue
                    raise WeatherUnavailableError()
                if response.status_code >= 400:
                    raise WeatherServiceError(
                        f"Weather provider error (HTTP {response.status_code})"
                    )

                try:
                    return response.json()
                except ValueError as exc:
                    raise WeatherServiceError("Invalid response from weather provider") from exc

            raise WeatherUnavailableError()

        if self._client is not None:
            return await perform(self._client)

        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS) as client:
            return await perform(client)

    async def find_city(
        self,
        city: str,
        country: str | None = None,
        lang: str = DEFAULT_LANG,
    ) -> tuple[float, float, str, str | None]:
        query = city.strip()
        if country:
            query = f"{query},{country.strip().upper()}"

        results = await self._request(
            GEOCODING_URL,
            {"q": query, "limit": 1},
        )

        if not isinstance(results, list) or not results:
            raise WeatherDataError("City not found")

        found = results[0]

        try:
            latitude = float(found["lat"])
            longitude = float(found["lon"])
        except (KeyError, TypeError, ValueError) as exc:
            raise WeatherDataError("Invalid geocoding response") from exc

        local_names = found.get("local_names") or {}
        name = local_names.get(lang) or found.get("name") or city

        return (
            latitude,
            longitude,
            name,
            found.get("country"),
        )

    @staticmethod
    def _condition(item: dict) -> WeatherCondition:
        weather = (item.get("weather") or [{}])[0]
        return WeatherCondition(
            code=weather.get("id"),
            main=weather.get("main", "Unknown"),
            description=weather.get("description", ""),
            icon=weather.get("icon", ""),
        )

    def _wind_speed(self, speed: float, units: str) -> float:
        # OpenWeather metric wind speed is m/s; imperial is miles/hour.
        return speed * 3.6 if units == "metric" else speed

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
        params = {
            "lat": latitude,
            "lon": longitude,
            "units": units,
            "lang": lang,
        }

        current_raw, forecast_raw = await asyncio.gather(
            self._request(f"{BASE_URL}/weather", params),
            self._request(f"{BASE_URL}/forecast", params),
        )

        try:
            offset = int(forecast_raw["city"].get("timezone", 0))
            city = forecast_raw["city"]
            now = datetime.fromtimestamp(current_raw["dt"], tz=UTC)
            current_wind = current_raw.get("wind", {})
            current_rain = current_raw.get("rain", {})

            current = CurrentWeather(
                observed_at=now,
                temperature=current_raw["main"]["temp"],
                feels_like=current_raw["main"]["feels_like"],
                humidity=current_raw["main"]["humidity"],
                pressure=current_raw["main"]["pressure"],
                clouds=current_raw.get("clouds", {}).get("all", 0),
                rain_last_hour_mm=current_rain.get("1h", 0.0),
                condition=self._condition(current_raw),
                wind=Wind(
                    speed=self._wind_speed(current_wind.get("speed", 0.0), units),
                    direction_deg=current_wind.get("deg"),
                    gust=current_wind.get("gust"),
                ),
            )

            groups = defaultdict(list)
            hourly = []

            for item in forecast_raw.get("list", []):
                local_time = datetime.fromtimestamp(item["dt"] + offset, tz=UTC).replace(
                    tzinfo=None
                )
                local_date = local_time.date()

                if len(groups) == 0 or local_date in groups or len(groups) < days:
                    if local_date not in groups and len(groups) >= days:
                        continue
                    groups[local_date].append(item)

                if len(groups) <= days:
                    hourly.append(
                        HourlyForecast(
                            time=local_time,
                            temperature=item["main"]["temp"],
                            rain_probability=round(item.get("pop", 0.0) * 100, 1),
                            condition=self._condition(item),
                        )
                    )

            daily = []
            for forecast_date, entries in list(groups.items())[:days]:
                temps = [entry["main"]["temp"] for entry in entries]
                representative = min(
                    entries,
                    key=lambda entry: abs(
                        (datetime.fromtimestamp(entry["dt"] + offset, tz=UTC).hour) - 12
                    ),
                )
                rain_mm = sum(entry.get("rain", {}).get("3h", 0.0) for entry in entries)
                wind_speeds = [
                    self._wind_speed(entry.get("wind", {}).get("speed", 0.0), units)
                    for entry in entries
                ]

                daily.append(
                    DailyForecast(
                        date=forecast_date,
                        temp_min=min(temps),
                        temp_max=max(temps),
                        rain_probability=round(
                            max(entry.get("pop", 0.0) for entry in entries) * 100,
                            1,
                        ),
                        rain_mm=rain_mm,
                        condition=self._condition(representative),
                        wind=Wind(
                            speed=max(wind_speeds, default=0.0),
                            direction_deg=representative.get("wind", {}).get("deg"),
                            gust=representative.get("wind", {}).get("gust"),
                        ),
                    )
                )

            return WeatherForecastResponse(
                units=units,
                lang=lang,
                temperature_unit="°C" if units == "metric" else "°F",
                wind_speed_unit="km/h" if units == "metric" else "mph",
                fetched_at=datetime.now(UTC),
                location=WeatherLocation(
                    name=city.get("name") or current_raw.get("name"),
                    country=city.get("country"),
                    latitude=latitude,
                    longitude=longitude,
                    timezone_offset=offset,
                ),
                current=current,
                hourly=hourly,
                daily=daily,
            )
        except WeatherServiceError:
            raise
        except (KeyError, TypeError, ValueError, IndexError, AttributeError) as exc:
            logger.exception("Unexpected OpenWeather response")
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
