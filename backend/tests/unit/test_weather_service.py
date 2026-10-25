from datetime import UTC, datetime

import httpx
import pytest

from services.weather_service import (
    WeatherDataError,
    WeatherService,
    WeatherServiceError,
    WeatherUnavailableError,
    normalize_lang,
)

CURRENT = {
    "name": "Lleida",
    "dt": int(datetime(2026, 10, 12, 9, tzinfo=UTC).timestamp()),
    "main": {"temp": 21.4, "feels_like": 20.9, "humidity": 55, "pressure": 1015},
    "weather": [{"id": 500, "main": "Rain", "description": "light rain", "icon": "10d"}],
    "wind": {"speed": 1.0, "deg": 250, "gust": 2.0},
    "clouds": {"all": 80},
    "rain": {"1h": 0.4},
}

FORECAST = {
    "city": {"name": "Lleida", "country": "ES", "timezone": 7200},
    "list": [
        {
            "dt": int(datetime(2026, 10, 12, 10, tzinfo=UTC).timestamp()),
            "main": {"temp": 21.4},
            "weather": [{"id": 500, "main": "Rain", "description": "light rain", "icon": "10d"}],
            "wind": {"speed": 1.0, "deg": 250},
            "pop": 0.45,
            "rain": {"3h": 1.2},
        },
        {
            "dt": int(datetime(2026, 10, 12, 13, tzinfo=UTC).timestamp()),
            "main": {"temp": 25.0},
            "weather": [{"id": 800, "main": "Clear", "description": "clear sky", "icon": "01d"}],
            "wind": {"speed": 1.72, "deg": 240},
            "pop": 0.75,
            "rain": {"3h": 2.2},
        },
        {
            "dt": int(datetime(2026, 10, 13, 10, tzinfo=UTC).timestamp()),
            "main": {"temp": 12.5},
            "weather": [{"id": 800, "main": "Clear", "description": "clear sky", "icon": "01d"}],
            "wind": {"speed": 1.0, "deg": 300},
            "pop": 0.05,
        },
    ],
}


@pytest.fixture(autouse=True)
def _api_key(monkeypatch):
    monkeypatch.setenv("OPENWEATHER_API_KEY", "test-api-key")


def make_service(handler) -> WeatherService:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return WeatherService(client=client)


def handler_for(request: httpx.Request) -> httpx.Response:
    if request.url.path.endswith("/weather"):
        return httpx.Response(200, json=CURRENT)
    return httpx.Response(200, json=FORECAST)


async def test_get_forecast_parses_current_and_daily():
    def handler(request):
        assert request.url.host == "api.openweathermap.org"
        assert request.url.params["lat"] == "41.61"
        assert request.url.params["lon"] == "0.62"
        assert request.url.params["units"] == "metric"
        assert request.url.params["appid"] == "test-api-key"
        return handler_for(request)

    result = await make_service(handler).get_forecast(41.61, 0.62, lang="es")

    assert result.lang == "es"
    assert result.current.temperature == 21.4
    assert result.current.condition.code == 500
    assert result.current.condition.description == "light rain"
    assert result.current.rain_last_hour_mm == 0.4
    assert result.current.wind.speed == 3.6
    assert result.location.name == "Lleida"
    assert result.location.country == "ES"
    assert result.location.timezone_offset == 7200
    assert result.hourly[0].rain_probability == 45.0
    assert result.daily[0].rain_probability == 75.0
    assert result.daily[0].rain_mm == pytest.approx(3.4)
    assert result.daily[0].wind.speed == 6.192


async def test_forecast_requests_weather_and_forecast_endpoints():
    requests = []

    def handler(request):
        requests.append(request)
        return handler_for(request)

    await make_service(handler).get_forecast(41.61, 0.62, days=3, lang="ca-ES")

    assert {request.url.path for request in requests} == {
        "/data/2.5/weather",
        "/data/2.5/forecast",
    }
    assert all(request.url.params["lang"] == "ca" for request in requests)


async def test_forecast_limits_days_and_supports_imperial_units():
    requests = []

    def handler(request):
        requests.append(request)
        return handler_for(request)

    result = await make_service(handler).get_forecast(41.61, 0.62, units="imperial", days=10)

    assert result.units == "imperial"
    assert result.temperature_unit == "°F"
    assert result.wind_speed_unit == "mph"
    assert len(result.daily) == 2
    assert all(request.url.params["units"] == "imperial" for request in requests)


async def test_invalid_units_raises_bad_request():
    with pytest.raises(WeatherServiceError) as exc:
        await make_service(handler_for).get_forecast(41.61, 0.62, units="kelvin")
    assert exc.value.status_code == 400


@pytest.mark.parametrize(
    ("status", "error_cls", "http_code"),
    [
        (404, WeatherDataError, 404),
        (429, WeatherUnavailableError, 503),
        (500, WeatherUnavailableError, 503),
        (503, WeatherUnavailableError, 503),
        (400, WeatherServiceError, 502),
        (401, WeatherServiceError, 502),
    ],
)
async def test_provider_errors_are_mapped(status, error_cls, http_code):
    with pytest.raises(error_cls) as exc:
        await make_service(lambda request: httpx.Response(status)).get_forecast(41.61, 0.62)
    assert exc.value.status_code == http_code


async def test_timeout_raises_unavailable_after_retry():
    calls = []

    def handler(request):
        calls.append(request)
        raise httpx.ReadTimeout("timeout", request=request)

    with pytest.raises(WeatherUnavailableError):
        await make_service(handler).get_forecast(41.61, 0.62)
    assert len(calls) == 4


async def test_retries_once_after_provider_error(monkeypatch):
    calls = []

    async def no_wait(_):
        return None

    monkeypatch.setattr("services.weather_service.asyncio.sleep", no_wait)

    def handler(request):
        calls.append(request)
        if len(calls) == 1:
            return httpx.Response(503)
        return handler_for(request)

    await make_service(handler).get_forecast(41.61, 0.62)
    assert len(calls) == 3


def test_normalize_lang():
    assert normalize_lang("ES-es") == "es"
    assert normalize_lang(" ca ") == "ca"
    assert normalize_lang("12") == "ca"


async def test_city_lookup_uses_openweather_geocoding():
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(
            200,
            json=[{"lat": 41.6176, "lon": 0.62, "name": "Lleida", "country": "ES"}],
        )

    city = await make_service(handler).find_city("Lleida", "es", lang="ca")

    assert requests[0].url.host == "api.openweathermap.org"
    assert requests[0].url.path == "/geo/1.0/direct"
    assert requests[0].url.params["q"] == "Lleida,ES"
    assert city == (41.6176, 0.62, "Lleida", "ES")
