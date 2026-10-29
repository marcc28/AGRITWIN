from datetime import date, datetime, timedelta

import pytest

from models.weather import (
    CurrentWeather,
    DailyForecast,
    HourlyForecast,
    WeatherCondition,
    WeatherForecastResponse,
    WeatherLocation,
    Wind,
)
from services.weather_alert import detect_alerts, detect_current_alerts

NOW = datetime(2026, 10, 28, 9)
CLEAR = WeatherCondition(code=800, main="Clear", description="clear sky", icon="01d")
RAIN = WeatherCondition(code=500, main="Rain", description="light rain", icon="10d")
HAIL = WeatherCondition(code=96, main="Thunderstorm", description="hail", icon="11d")
STORM = WeatherCondition(code=95, main="Thunderstorm", description="storm", icon="11d")
SNOW = WeatherCondition(code=71, main="Snow", description="snow", icon="13d")


def hour(hours_ahead, condition=CLEAR, rain_probability=0, temperature=15):
    return HourlyForecast(
        time=NOW + timedelta(hours=hours_ahead),
        temperature=temperature,
        rain_probability=rain_probability,
        condition=condition,
    )


def day(days_ahead, condition=CLEAR, rain_probability=0, rain_mm=0, temp=(8, 18), wind=5):
    return DailyForecast(
        date=NOW.date() + timedelta(days=days_ahead),
        temp_min=temp[0],
        temp_max=temp[1],
        rain_probability=rain_probability,
        rain_mm=rain_mm,
        condition=condition,
        wind=Wind(speed=wind),
    )


def current(condition=CLEAR, temperature=15, wind=5, gust=None):
    return CurrentWeather(
        observed_at=NOW,
        temperature=temperature,
        feels_like=temperature,
        humidity=60,
        pressure=1015,
        clouds=20,
        condition=condition,
        wind=Wind(speed=wind, gust=gust),
    )


def forecast(hourly=(), daily=(), now=None, lang="ca", units="metric"):
    return WeatherForecastResponse(
        units=units,
        lang=lang,
        temperature_unit="°C" if units == "metric" else "°F",
        wind_speed_unit="km/h" if units == "metric" else "mph",
        location=WeatherLocation(latitude=41.56, longitude=0.52),
        current=now or current(),
        hourly=list(hourly),
        daily=list(daily) or [day(0)],
    )


def messages(result):
    alerts = detect_current_alerts(result) + detect_alerts(result)
    return [alert.message for alert in alerts]


# 1. NO ALERTS


def test_good_weather_has_no_alerts():
    result = forecast(
        hourly=[hour(0, rain_probability=59, temperature=3), hour(24, HAIL)],
        daily=[
            day(0, rain_probability=59, rain_mm=0.9, temp=(3, 34), wind=49),
            day(1),
            day(2),
            day(3, HAIL, 100, 20, (-5, 40), 90),
        ],
    )

    assert messages(result) == []


# 2. RAIN AND HAIL


@pytest.mark.parametrize(
    ("next_hour", "message"),
    [
        (hour(3, RAIN), "Es preveu pluja el 28/10 a les 12:00"),
        (hour(3, rain_probability=60), "Es preveu pluja el 28/10 a les 12:00 (60%)"),
        (hour(3, HAIL, 70), "Es preveu calamarsa el 28/10 a les 12:00 (70%)"),
    ],
)
def test_rain_and_hail_in_the_next_hours(next_hour, message):
    alerts = detect_alerts(forecast(hourly=[hour(0), next_hour]))

    assert [alert.message for alert in alerts] == [message]
    assert alerts[0].starts_at == NOW + timedelta(hours=3)


# 3. OTHER ALERTS


@pytest.mark.parametrize(
    ("next_day", "message"),
    [
        (day(2, rain_mm=1), "Es preveu pluja el 30/10"),
        (day(2, STORM), "Es preveu tempesta el 30/10"),
        (day(2, SNOW), "Es preveu neu el 30/10"),
        (day(2, temp=(-1, 10)), "Es preveu gelada el 30/10 (-1 °C)"),
        (day(2, temp=(20, 38)), "Es preveuen temperatures altes el 30/10 (38 °C)"),
        (day(2, wind=55), "Es preveu vent fort el 30/10 (55 km/h)"),
    ],
)
def test_alerts_in_the_next_days(next_day, message):
    alerts = detect_alerts(forecast(daily=[day(0), day(1), next_day]))

    assert [alert.message for alert in alerts] == [message]
    assert alerts[0].day == date(2026, 10, 30)


def test_current_alerts_go_apart_from_the_forecast():
    result = forecast(
        hourly=[hour(0, RAIN), hour(1), hour(6, RAIN, 80, temperature=1)],
        now=current(RAIN, wind=20, gust=52),
    )

    assert [alert.message for alert in detect_current_alerts(result)] == [
        "Ara hi ha vent fort (52 km/h)",
        "Ara hi ha pluja",
    ]
    assert [alert.message for alert in detect_alerts(result)] == [
        "Es preveu gelada el 28/10 a les 15:00 (1 °C)",
        "Es preveu pluja el 28/10 a les 15:00 (80%)",
    ]


# 4. ORDER, LANGUAGE AND UNITS


def test_alerts_are_sorted_by_date_and_importance():
    result = forecast(
        hourly=[hour(0), hour(2, temperature=1), hour(6, RAIN, 80)],
        daily=[day(0, wind=70), day(1, HAIL, 90, 12, wind=60)],
    )

    assert [alert.type for alert in detect_alerts(result)] == [
        "wind",
        "frost",
        "rain",
        "hail",
    ]


@pytest.mark.parametrize(
    ("lang", "message"),
    [
        ("es", "Se prevé granizo el 28/10 a las 09:00 (75%)"),
        ("en-GB", "Hail is expected on 28/10 at 09:00 (75%)"),
        ("it", "È prevista grandine il 28/10 alle 09:00 (75%)"),
        ("fr", "Es preveu calamarsa el 28/10 a les 09:00 (75%)"),
    ],
)
def test_alert_message_uses_the_forecast_language(lang, message):
    assert messages(forecast(hourly=[hour(0, HAIL, 75)], lang=lang)) == [message]


def test_imperial_forecast_uses_the_same_limits():
    result = forecast(
        hourly=[hour(0, temperature=50)],
        daily=[day(0, temp=(30, 96), wind=32)],
        now=current(temperature=60),
        units="imperial",
    )

    assert messages(result) == [
        "Es preveu gelada el 28/10 (30 °F)",
        "Es preveu vent fort el 28/10 (32 mph)",
        "Es preveuen temperatures altes el 28/10 (96 °F)",
    ]
