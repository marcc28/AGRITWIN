import os

# Set a fallback database URL for CI environments before importing db.database
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.v1.auth import get_current_user
from api.v1.weather import get_field_weather_service, get_weather_service, router
from db.schema import User
from services.weather_service import (
    WeatherDataError,
    WeatherServiceError,
    WeatherUnavailableError,
)

FORECAST_RESPONSE = {
    "units": "metric",
    "lang": "ca",
    "location": {
        "name": "Lleida",
        "country": "ES",
        "latitude": 41.61,
        "longitude": 0.62,
        "timezone_offset": 7200,
    },
    "current": {
        "observed_at": "2026-10-12T09:00:00Z",
        "temperature": 21.4,
        "feels_like": 20.9,
        "humidity": 55,
        "pressure": 1015,
        "clouds": 40,
        "rain_last_hour_mm": 0.0,
        "condition": {
            "code": 2,
            "main": "Clouds",
            "description": "parcialment ennuvolat",
            "icon": "03d",
        },
        "wind": {"speed": 3.6, "direction_deg": 250, "gust": 5.1},
        "rain_probability": 10.0,
    },
    "daily": [],
}


@pytest.fixture
def mock_service():
    return AsyncMock()


@pytest.fixture
def mock_field_service():
    return AsyncMock()


@pytest.fixture
def client(mock_service, mock_field_service):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_weather_service] = lambda: mock_service
    app.dependency_overrides[get_field_weather_service] = lambda: mock_field_service
    app.dependency_overrides[get_current_user] = lambda: User(
        username="cinta", email="cinta@example.com", password_hash="x"
    )
    return TestClient(app)


# 1. GET /api/v1/weather/forecast


def test_get_forecast_ok(client, mock_service):
    mock_service.get_forecast.return_value = FORECAST_RESPONSE

    response = client.get("/weather/forecast?lat=41.61&lon=0.62")

    assert response.status_code == 200
    body = response.json()
    assert body["location"]["name"] == "Lleida"
    assert body["current"]["wind"]["speed"] == 3.6
    mock_service.get_forecast.assert_awaited_once_with(
        latitude=41.61, longitude=0.62, units="metric", lang="ca", days=5
    )


def test_get_forecast_custom_params(client, mock_service):
    mock_service.get_forecast.return_value = {**FORECAST_RESPONSE, "units": "imperial"}

    response = client.get("/weather/forecast?lat=41.61&lon=0.62&units=imperial&lang=ca&days=3")

    assert response.status_code == 200
    mock_service.get_forecast.assert_awaited_once_with(
        latitude=41.61, longitude=0.62, units="imperial", lang="ca", days=3
    )


@pytest.mark.parametrize(
    "query",
    [
        "",
        "?lat=41.61",
        "?lat=91&lon=0",
        "?lat=0&lon=181",
        "?lat=0&lon=0&units=kelvin",
        "?lat=0&lon=0&days=6",
    ],
)
def test_get_forecast_invalid_params(client, mock_service, query):
    response = client.get(f"/weather/forecast{query}")

    assert response.status_code == 422
    mock_service.get_forecast.assert_not_awaited()


def test_get_forecast_provider_unavailable(client, mock_service):
    mock_service.get_forecast.side_effect = WeatherUnavailableError()

    response = client.get("/weather/forecast?lat=41.61&lon=0.62")

    assert response.status_code == 503
    assert response.json()["detail"] == "Weather provider is unavailable"


def test_get_forecast_provider_error(client, mock_service):
    mock_service.get_forecast.side_effect = WeatherServiceError("boom", status_code=502)

    response = client.get("/weather/forecast?lat=41.61&lon=0.62")

    assert response.status_code == 502


def test_get_forecast_by_city(client, mock_service):
    mock_service.get_forecast_for_city.return_value = FORECAST_RESPONSE

    response = client.get("/weather/forecast?city=Lleida&country=ES&lang=ca")

    assert response.status_code == 200
    mock_service.get_forecast_for_city.assert_awaited_once_with(
        city="Lleida", country="ES", units="metric", lang="ca", days=5
    )
    mock_service.get_forecast.assert_not_awaited()


def test_coordinates_win_over_city(client, mock_service):
    mock_service.get_forecast.return_value = FORECAST_RESPONSE

    response = client.get("/weather/forecast?lat=41.61&lon=0.62&city=Madrid")

    assert response.status_code == 200
    mock_service.get_forecast.assert_awaited_once()
    mock_service.get_forecast_for_city.assert_not_awaited()


@pytest.mark.parametrize(
    ("query", "field"),
    [
        ("", "lat"),
        ("?lat=41.61", "lon"),
        ("?lon=0.62", "lat"),
        ("?city=", "city"),
        ("?city=Lleida&country=ESP", "country"),
        (f"?city={'x' * 101}", "city"),
    ],
)
def test_get_forecast_location_errors(client, mock_service, query, field):
    response = client.get(f"/weather/forecast{query}")

    assert response.status_code == 422
    assert any(e["loc"][-1] == field for e in response.json()["detail"])
    mock_service.get_forecast.assert_not_awaited()
    mock_service.get_forecast_for_city.assert_not_awaited()


def test_city_not_found(client, mock_service):
    mock_service.get_forecast_for_city.side_effect = WeatherDataError("City not found")

    response = client.get("/weather/forecast?city=Ciutatquenoexisteix")

    assert response.status_code == 404
    assert response.json()["detail"] == "City not found"


# 2. GET /api/v1/weather/fields/{field_id}


def test_get_field_weather_ok(client, mock_field_service):
    mock_field_service.get_forecast.return_value = {
        **FORECAST_RESPONSE,
        "location": {**FORECAST_RESPONSE["location"], "field_id": 7},
    }

    response = client.get("/weather/fields/7")

    assert response.status_code == 200
    assert response.json()["location"]["field_id"] == 7
    mock_field_service.get_forecast.assert_awaited_once_with(
        7, units="metric", lang=None, days=5, username="cinta"
    )


def test_get_field_weather_custom_params(client, mock_field_service):
    mock_field_service.get_forecast.return_value = {**FORECAST_RESPONSE, "units": "imperial"}

    response = client.get("/weather/fields/7?units=imperial&lang=es&days=2")

    assert response.status_code == 200
    mock_field_service.get_forecast.assert_awaited_once_with(
        7, units="imperial", lang="es", days=2, username="cinta"
    )


@pytest.mark.parametrize(
    "path",
    [
        "/weather/fields/0",
        "/weather/fields/abc",
        "/weather/fields/7?days=6",
        "/weather/fields/7?units=kelvin",
        "/weather/fields/7?lang=x",
        "/weather/fields/2147483648",
    ],
)
def test_get_field_weather_invalid_params(client, mock_field_service, path):
    response = client.get(path)

    assert response.status_code == 422
    mock_field_service.get_forecast.assert_not_awaited()


@pytest.mark.parametrize(
    ("error", "status", "detail"),
    [
        (WeatherDataError("Field not found"), 404, "Field not found"),
        (WeatherDataError("Field has no location"), 404, "Field has no location"),
        (WeatherUnavailableError(), 503, "Weather provider is unavailable"),
    ],
)
def test_get_field_weather_errors(client, mock_field_service, error, status, detail):
    mock_field_service.get_forecast.side_effect = error

    response = client.get("/weather/fields/7")

    assert response.status_code == status
    assert response.json()["detail"] == detail


@pytest.mark.parametrize("lang", ["es-ES", "es_ES"])
def test_get_field_weather_accepts_regional_language(client, mock_field_service, lang):
    mock_field_service.get_forecast.return_value = FORECAST_RESPONSE

    response = client.get(f"/weather/fields/7?lang={lang}")

    assert response.status_code == 200
    mock_field_service.get_forecast.assert_awaited_once_with(
        7, units="metric", lang=lang, days=5, username="cinta"
    )


def test_field_weather_requires_login(mock_field_service):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_field_weather_service] = lambda: mock_field_service

    response = TestClient(app).get("/weather/fields/7")

    assert response.status_code == 401
    mock_field_service.get_forecast.assert_not_awaited()


def test_forecast_by_coordinates_does_not_need_login(mock_service):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_weather_service] = lambda: mock_service
    mock_service.get_forecast.return_value = FORECAST_RESPONSE

    response = TestClient(app).get("/weather/forecast?lat=41.61&lon=0.62")

    assert response.status_code == 200
