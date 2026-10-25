from unittest.mock import AsyncMock

import httpx
import pytest

from services.fallback_weather_service import FallbackWeatherService
from services.open_meteo_service import OpenMeteoWeatherService
from services.weather_service import WeatherServiceError, WeatherUnavailableError


@pytest.mark.asyncio
async def test_successful_primary_does_not_call_fallback():
    primary = AsyncMock()
    fallback = AsyncMock()
    primary.get_forecast.return_value = "primary forecast"
    service = FallbackWeatherService(primary=primary, fallback=fallback)

    result = await service.get_forecast(41.6, 0.6)

    assert result == "primary forecast"
    primary.get_forecast.assert_awaited_once()
    fallback.get_forecast.assert_not_awaited()


@pytest.mark.asyncio
async def test_provider_error_uses_fallback():
    primary = AsyncMock()
    fallback = AsyncMock()
    primary.get_forecast.side_effect = WeatherServiceError("provider down", status_code=503)
    fallback.get_forecast.return_value = "fallback forecast"
    service = FallbackWeatherService(primary=primary, fallback=fallback)

    result = await service.get_forecast(41.6, 0.6, units="imperial", lang="es", days=3)

    assert result == "fallback forecast"
    fallback.get_forecast.assert_awaited_once_with(41.6, 0.6, units="imperial", lang="es", days=3)


@pytest.mark.asyncio
async def test_bad_request_does_not_use_fallback():
    primary = AsyncMock()
    fallback = AsyncMock()
    primary.get_forecast.side_effect = WeatherServiceError("bad units", status_code=400)
    service = FallbackWeatherService(primary=primary, fallback=fallback)

    with pytest.raises(WeatherServiceError, match="bad units"):
        await service.get_forecast(41.6, 0.6, units="kelvin")
    fallback.get_forecast.assert_not_awaited()


@pytest.mark.asyncio
async def test_unimplemented_primary_city_lookup_uses_fallback():
    primary = AsyncMock()
    fallback = AsyncMock()
    primary.get_forecast_for_city.side_effect = NotImplementedError("geocoding unavailable")
    fallback.get_forecast_for_city.return_value = "city forecast"
    service = FallbackWeatherService(primary=primary, fallback=fallback)

    result = await service.get_forecast_for_city("Lleida", country="ES", lang="ca")

    assert result == "city forecast"
    fallback.get_forecast_for_city.assert_awaited_once_with(
        "Lleida", country="ES", units="metric", lang="ca", days=5
    )


@pytest.mark.asyncio
async def test_open_meteo_fallback_fetches_and_parses_forecast():
    raw = {
        "utc_offset_seconds": 7200,
        "current": {
            "time": "2026-10-12T11:00",
            "temperature_2m": 21.4,
            "relative_humidity_2m": 55,
            "apparent_temperature": 20.9,
            "is_day": 1,
            "precipitation": 0,
            "weather_code": 61,
            "cloud_cover": 80,
            "pressure_msl": 1015,
            "wind_speed_10m": 3.6,
            "wind_direction_10m": 250,
            "wind_gusts_10m": 7.2,
        },
        "hourly": {
            "time": ["2026-10-12T11:00"],
            "temperature_2m": [21.4],
            "precipitation_probability": [45],
            "weather_code": [61],
            "is_day": [1],
        },
        "daily": {
            "time": ["2026-10-12"],
            "weather_code": [61],
            "temperature_2m_max": [25],
            "temperature_2m_min": [14],
            "precipitation_sum": [3.4],
            "precipitation_probability_max": [75],
            "wind_speed_10m_max": [6.2],
            "wind_direction_10m_dominant": [240],
        },
    }
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(200, json=raw)

    primary = AsyncMock()
    primary.get_forecast.side_effect = WeatherUnavailableError("primary down")
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    service = FallbackWeatherService(
        primary=primary,
        fallback=OpenMeteoWeatherService(client=client),
    )
    try:
        result = await service.get_forecast(41.6, 0.6)
    finally:
        await client.aclose()

    assert len(requests) == 1
    assert requests[0].url.host == "api.open-meteo.com"
    assert result.current.temperature == 21.4
    assert result.current.condition.description == "pluja feble"
