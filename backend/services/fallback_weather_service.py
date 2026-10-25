"""Routes weather requests to Open-Meteo when the primary service fails."""

import logging
from typing import Any

from models.weather import WeatherForecastResponse
from services.open_meteo_service import OpenMeteoWeatherService
from services.weather_service import WeatherService, WeatherServiceError

logger = logging.getLogger(__name__)


class FallbackWeatherService:
    def __init__(
        self,
        primary: Any | None = None,
        fallback: Any | None = None,
    ):
        self.primary = primary or WeatherService()
        self.fallback = fallback or OpenMeteoWeatherService()

    async def _call(self, method: str, *args, **kwargs) -> WeatherForecastResponse:
        try:
            return await getattr(self.primary, method)(*args, **kwargs)
        except WeatherServiceError as exc:
            # Invalid request parameters are independent of provider availability.
            if exc.status_code == 400:
                raise
            logger.warning(
                "Primary weather service failed (%s); trying Open-Meteo fallback",
                exc.message,
            )
        except NotImplementedError as exc:
            # Keep the working primary implementation intact while allowing the
            # fallback to serve methods that an older primary does not implement.
            logger.warning(
                "Primary weather service does not support this request; "
                "trying Open-Meteo fallback: %s",
                exc,
            )

        return await getattr(self.fallback, method)(*args, **kwargs)

    async def get_forecast(
        self,
        latitude: float,
        longitude: float,
        units: str = "metric",
        lang: str = "ca",
        days: int = 5,
    ) -> WeatherForecastResponse:
        return await self._call(
            "get_forecast", latitude, longitude, units=units, lang=lang, days=days
        )

    async def get_forecast_for_city(
        self,
        city: str,
        country: str | None = None,
        units: str = "metric",
        lang: str = "ca",
        days: int = 5,
    ) -> WeatherForecastResponse:
        return await self._call(
            "get_forecast_for_city",
            city,
            country=country,
            units=units,
            lang=lang,
            days=days,
        )
