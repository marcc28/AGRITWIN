import httpx
import pytest

from services import city_search
from services.open_meteo import condition_from_code
from services.weather_service import (
    WeatherDataError,
    WeatherService,
    WeatherServiceError,
    WeatherUnavailableError,
    normalize_lang,
)

OPEN_METEO = {
    "latitude": 41.62,
    "longitude": 0.62,
    "utc_offset_seconds": 7200,
    "timezone": "Europe/Madrid",
    "current": {
        "time": "2026-10-12T11:00",
        "temperature_2m": 21.4,
        "relative_humidity_2m": 55,
        "apparent_temperature": 20.9,
        "is_day": 1,
        "precipitation": 0.0,
        "weather_code": 61,
        "cloud_cover": 80,
        "pressure_msl": 1015.3,
        "wind_speed_10m": 3.6,
        "wind_direction_10m": 250,
        "wind_gusts_10m": 7.2,
        "uv_index": 2.5,
    },
    "hourly": {
        "time": ["2026-10-12T10:00", "2026-10-12T11:00", "2026-10-12T12:00"],
        "temperature_2m": [19.8, 21.4, 22.9],
        "precipitation_probability": [20, 45, 60],
        "weather_code": [45, 61, 0],
        "is_day": [1, 1, 1],
    },
    "daily": {
        "time": ["2026-10-12", "2026-10-13"],
        "weather_code": [61, 0],
        "temperature_2m_max": [25.0, 23.1],
        "temperature_2m_min": [14.0, 12.5],
        "precipitation_sum": [3.4, 0.0],
        "precipitation_probability_max": [75, 5],
        "wind_speed_10m_max": [6.2, 4.0],
        "wind_gusts_10m_max": [11.0, 8.0],
        "wind_direction_10m_dominant": [240, 300],
        "uv_index_max": [4.1, 5.0],
        "sunrise": ["2026-10-12T08:05", "2026-10-13T08:06"],
        "sunset": ["2026-10-12T19:20", "2026-10-13T19:18"],
    },
}

GEOCODING_HOST = "geocoding-api.open-meteo.com"
CORDOBA = {
    "results": [
        {"name": "Córdoba", "latitude": -31.4135, "longitude": -64.1811, "country_code": "AR"},
        {"name": "Córdoba", "latitude": 37.8916, "longitude": -4.7728, "country_code": "ES"},
    ]
}
LLEIDA = {
    "results": [{"name": "Lleida", "latitude": 41.6176, "longitude": 0.62, "country_code": "ES"}]
}


def make_service(handler) -> WeatherService:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return WeatherService(client=client, retry_delay=0)


def ok_handler(request: httpx.Request) -> httpx.Response:
    return httpx.Response(200, json=OPEN_METEO)


def city_handler(found, searches=None, weather=None):
    def handler(request):
        if request.url.host == GEOCODING_HOST:
            if searches is not None:
                searches.append(request)
            return httpx.Response(200, json=found)
        if weather is not None:
            weather.append(request)
        return httpx.Response(200, json=OPEN_METEO)

    return handler


@pytest.fixture(autouse=True)
def _clear_caches():
    WeatherService.clear_cache()
    yield
    WeatherService.clear_cache()


# 1. FORECAST PARSING (backend/services/open_meteo.py)


async def test_get_forecast_parses_current_and_daily():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "api.open-meteo.com"
        assert request.url.params["latitude"] == "41.61"
        assert request.url.params["wind_speed_unit"] == "kmh"
        return httpx.Response(200, json=OPEN_METEO)

    result = await make_service(handler).get_forecast(41.61, 0.62, lang="es")

    assert result.units == "metric"
    assert result.lang == "es"
    assert result.current.temperature == 21.4
    assert result.current.condition.code == 61
    assert result.current.condition.main == "Rain"
    assert result.current.condition.description == "lluvia ligera"
    assert result.current.condition.icon == "10d"
    assert result.current.rain_probability == 45.0
    assert result.wind_speed_unit == "km/h"
    assert result.current.wind.speed == 3.6
    assert result.current.pressure == 1015
    assert (result.location.latitude, result.location.longitude) == (41.61, 0.62)
    assert result.location.timezone_offset == 7200
    assert len(result.daily) == 2
    assert result.daily[0].rain_probability == 75.0
    assert result.daily[0].rain_mm == 3.4
    assert result.daily[0].wind.speed == 6.2


async def test_fields_for_the_weather_screen():
    result = await make_service(ok_handler).get_forecast(41.61, 0.62)

    assert result.temperature_unit == "°C"
    assert result.current.feels_like == 20.9
    assert result.current.humidity == 55
    assert result.current.uv_index == 2.5
    assert result.current.is_day is True
    today = result.daily[0]
    assert today.uv_index_max == 4.1
    assert today.sunrise.isoformat() == "2026-10-12T08:05:00+02:00"
    assert today.sunset.isoformat() == "2026-10-12T19:20:00+02:00"


async def test_todays_outlook_starts_at_the_current_hour():
    result = await make_service(ok_handler).get_forecast(41.61, 0.62)

    assert [h.time.isoformat() for h in result.hourly] == [
        "2026-10-12T11:00:00+02:00",
        "2026-10-12T12:00:00+02:00",
    ]
    assert [h.temperature for h in result.hourly] == [21.4, 22.9]
    assert [h.rain_probability for h in result.hourly] == [45.0, 60.0]
    assert [h.condition.main for h in result.hourly] == ["Rain", "Clear"]


async def test_todays_outlook_has_at_most_24_hours():
    times = [f"2026-10-{12 + h // 24}T{h % 24:02d}:00" for h in range(48)]
    payload = {
        **OPEN_METEO,
        "hourly": {
            "time": times,
            "temperature_2m": [15.0] * 48,
            "precipitation_probability": [0] * 48,
            "weather_code": [0] * 48,
            "is_day": [h % 24 in range(8, 20) for h in range(48)],
        },
    }
    result = await make_service(lambda r: httpx.Response(200, json=payload)).get_forecast(
        41.61, 0.62
    )

    assert len(result.hourly) == 24
    assert result.hourly[0].time.hour == 11
    assert result.hourly[-1].time.isoformat() == "2026-10-13T10:00:00+02:00"
    assert result.hourly[10].condition.icon == "01n"


async def test_missing_new_fields_do_not_break_the_answer():
    payload = {
        **OPEN_METEO,
        "current": {k: v for k, v in OPEN_METEO["current"].items() if k != "uv_index"},
        "hourly": {},
        "daily": {
            k: v
            for k, v in OPEN_METEO["daily"].items()
            if k not in ("uv_index_max", "sunrise", "sunset")
        },
    }
    result = await make_service(lambda r: httpx.Response(200, json=payload)).get_forecast(
        41.61, 0.62
    )

    assert result.current.uv_index is None
    assert result.hourly == []
    assert result.daily[0].sunrise is None
    assert result.daily[0].uv_index_max is None


async def test_three_day_forecast():
    payload = {**OPEN_METEO, "daily": {k: v * 3 for k, v in OPEN_METEO["daily"].items()}}

    def handler(request):
        assert request.url.params["forecast_days"] == "3"
        return httpx.Response(200, json=payload)

    result = await make_service(handler).get_forecast(41.61, 0.62, days=3)

    assert len(result.daily) == 3


# 2. LANGUAGES AND UNITS


async def test_default_language_is_catalan():
    result = await make_service(ok_handler).get_forecast(41.61, 0.62)

    assert result.lang == "ca"
    assert result.current.condition.description == "pluja feble"


async def test_language_is_not_case_sensitive():
    result = await make_service(ok_handler).get_forecast(41.61, 0.62, lang="CA")

    assert result.lang == "ca"
    assert result.current.condition.description == "pluja feble"


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("es", "es"),
        ("EN", "en"),
        ("es-ES", "es"),
        ("it_IT", "it"),
        (" ca ", "ca"),
        (None, "ca"),
        ("", "ca"),
        ("12", "ca"),
        ("castellano", "ca"),
    ],
)
def test_normalize_lang(value, expected):
    assert normalize_lang(value) == expected


async def test_imperial_units_and_days():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["temperature_unit"] == "fahrenheit"
        assert request.url.params["wind_speed_unit"] == "mph"
        assert request.url.params["forecast_days"] == "2"
        return httpx.Response(200, json=OPEN_METEO)

    result = await make_service(handler).get_forecast(41.61, 0.62, units="imperial", days=1)

    assert result.units == "imperial"
    assert result.temperature_unit == "°F"
    assert result.wind_speed_unit == "mph"
    assert len(result.daily) == 1


async def test_days_out_of_range_are_limited():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["forecast_days"] == "5"
        return httpx.Response(200, json=OPEN_METEO)

    await make_service(handler).get_forecast(41.61, 0.62, days=10)


# 3. PROVIDER ERRORS (backend/services/weather_service.py)


async def test_invalid_units_raises_bad_request():
    with pytest.raises(WeatherServiceError) as exc:
        await make_service(ok_handler).get_forecast(41.61, 0.62, units="kelvin")
    assert exc.value.status_code == 400


@pytest.mark.parametrize(
    ("status", "error_cls", "http_code"),
    [
        (404, WeatherDataError, 404),
        (429, WeatherUnavailableError, 503),
        (500, WeatherUnavailableError, 503),
        (503, WeatherUnavailableError, 503),
        (400, WeatherServiceError, 502),
    ],
)
async def test_provider_errors_are_mapped(status, error_cls, http_code):
    service = make_service(lambda request: httpx.Response(status, json={"reason": "x"}))

    with pytest.raises(error_cls) as exc:
        await service.get_forecast(41.61, 0.62)
    assert exc.value.status_code == http_code


async def test_timeout_raises_unavailable():
    def handler(request):
        raise httpx.ReadTimeout("timeout", request=request)

    with pytest.raises(WeatherUnavailableError) as exc:
        await make_service(handler).get_forecast(41.61, 0.62)
    assert exc.value.message == "Weather provider timed out"


async def test_connection_error_raises_unavailable():
    def handler(request):
        raise httpx.ConnectError("no network", request=request)

    with pytest.raises(WeatherUnavailableError):
        await make_service(handler).get_forecast(41.61, 0.62)


@pytest.mark.parametrize("payload", [{"unexpected": True}, {"daily": {}}, [], "text"])
async def test_unexpected_payload_raises_service_error(payload):
    service = make_service(lambda request: httpx.Response(200, json=payload))

    with pytest.raises(WeatherServiceError) as exc:
        await service.get_forecast(41.61, 0.62)
    assert exc.value.status_code == 502


async def test_invalid_json_raises_service_error():
    service = make_service(lambda request: httpx.Response(200, content=b"<html>"))

    with pytest.raises(WeatherServiceError) as exc:
        await service.get_forecast(41.61, 0.62)
    assert exc.value.message == "Invalid response from weather provider"


# 4. RETRIES


async def test_retries_once_after_provider_503():
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(503) if len(calls) == 1 else httpx.Response(200, json=OPEN_METEO)

    result = await make_service(handler).get_forecast(41.61, 0.62)

    assert result.current.temperature == 21.4
    assert len(calls) == 2


async def test_retries_once_after_timeout():
    calls = []

    def handler(request):
        calls.append(1)
        if len(calls) == 1:
            raise httpx.ConnectTimeout("timeout", request=request)
        return httpx.Response(200, json=OPEN_METEO)

    await make_service(handler).get_forecast(41.61, 0.62)

    assert len(calls) == 2


async def test_gives_up_after_two_attempts():
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(502)

    with pytest.raises(WeatherUnavailableError):
        await make_service(handler).get_forecast(41.61, 0.62)
    assert len(calls) == 2


async def test_client_errors_are_not_retried():
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(404)

    with pytest.raises(WeatherDataError):
        await make_service(handler).get_forecast(41.61, 0.62)
    assert len(calls) == 1


async def test_without_client_a_new_one_is_created(monkeypatch):
    real_client = httpx.AsyncClient

    def fake_client(**kwargs):
        assert kwargs["timeout"] == 10.0
        return real_client(transport=httpx.MockTransport(ok_handler))

    monkeypatch.setattr(httpx, "AsyncClient", fake_client)

    result = await WeatherService().get_forecast(41.61, 0.62)

    assert result.current.temperature == 21.4


# 5. WEATHER CONDITIONS


async def test_daily_condition_is_the_midday_weather():
    result = await make_service(ok_handler).get_forecast(41.61, 0.62)

    assert result.daily[0].condition.main == "Clear"
    assert result.daily[1].condition.main == "Clear"


async def test_requests_hourly_weather_code():
    def handler(request):
        assert "weather_code" in request.url.params["hourly"]
        return httpx.Response(200, json=OPEN_METEO)

    await make_service(handler).get_forecast(41.61, 0.62)


def test_condition_from_code():
    assert condition_from_code(1234, "ca").main == "Unknown"
    assert condition_from_code(None, "ca").code is None
    assert condition_from_code(3, "ca", is_day=False).icon == "04n"
    assert condition_from_code(96, "ca").description == "tempesta amb calamarsa"
    assert condition_from_code(3, "fr").description == "overcast"


# 6. TOWN SEARCH (backend/services/city_search.py)


async def test_city_name_gives_weather_with_that_place():
    searches, weather = [], []
    service = make_service(city_handler(LLEIDA, searches, weather))

    result = await service.get_forecast_for_city("Lleida", lang="ca")

    assert result.location.name == "Lleida"
    assert result.location.country == "ES"
    assert (result.location.latitude, result.location.longitude) == (41.6176, 0.62)
    assert weather[0].url.params["latitude"] == "41.6176"
    assert searches[0].url.params["name"] == "Lleida"
    assert searches[0].url.params["language"] == "ca"
    assert result.current.temperature == 21.4


async def test_city_country_chooses_between_same_names():
    service = make_service(city_handler(CORDOBA))

    spain = await service.get_forecast_for_city("Córdoba", country="ES")
    first = await service.get_forecast_for_city("Córdoba")

    assert spain.location.country == "ES" and spain.location.latitude == 37.8916
    assert first.location.country == "AR"


async def test_city_country_is_case_insensitive():
    service = make_service(city_handler(CORDOBA))

    result = await service.get_forecast_for_city("Córdoba", country="es")

    assert result.location.country == "ES"


async def test_unknown_city_is_404():
    with pytest.raises(WeatherDataError) as exc:
        await make_service(city_handler({})).get_forecast_for_city("Ciutatquenoexisteix")
    assert exc.value.status_code == 404
    assert exc.value.message == "City not found"


async def test_city_in_other_country_is_404():
    with pytest.raises(WeatherDataError):
        await make_service(city_handler(LLEIDA)).get_forecast_for_city("Lleida", country="FR")


async def test_city_search_is_remembered():
    searches = []
    service = make_service(city_handler(LLEIDA, searches))

    await service.get_forecast_for_city("Lleida")
    await service.get_forecast_for_city("  lleida ")

    assert len(searches) == 1


async def test_city_search_down_is_503():
    def handler(request):
        if request.url.host == GEOCODING_HOST:
            return httpx.Response(503)
        return httpx.Response(200, json=OPEN_METEO)

    with pytest.raises(WeatherUnavailableError):
        await make_service(handler).get_forecast_for_city("Lleida")


def test_city_search_pick():
    assert city_search.pick({}) is None
    assert city_search.pick({"results": [{"name": "Sense coordenades"}]}) is None
    assert city_search.pick(CORDOBA, "ES")["latitude"] == 37.8916
    assert city_search.build_params("Lleida", "es")["language"] == "es"
