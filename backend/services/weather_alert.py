"""Weather alerts from the forecast of a field (alert columns of weather_cache)."""

from collections.abc import Callable
from datetime import date, datetime, time, timedelta

from models.weather import (
    CurrentWeather,
    DailyForecast,
    HourlyForecast,
    WeatherAlert,
    WeatherForecastResponse,
)
from services.weather_service import DEFAULT_LANG, normalize_lang

# The alerts look at the next 24 hours and the next 3 days of the forecast.
ALERT_HOURS = 24
ALERT_DAYS = 3

# Rain probability (%) or daily rain (mm) from which rain is expected.
RAIN_PROBABILITY = 60
RAIN_MM = 1.0

# Limits in °C and km/h (imperial forecasts are converted before comparing).
HEAT_TEMPERATURE = 35
FROST_TEMPERATURE = 2
WIND_SPEED = 50

# WMO codes 96 and 99 (Open-Meteo) and 906 (OpenWeatherMap) are hail.
HAIL_CODES = {96, 99, 906}

# Alerts that show the rain probability and the rain of the day.
PRECIPITATION_TYPES = {"hail", "storm", "snow", "rain"}

# Order of the alerts, from the most to the least important.
ALERT_TYPES = ("hail", "storm", "snow", "frost", "wind", "heat", "rain")

_EXPECTED: dict[str, dict[str, str]] = {
    "hail": {
        "en": "Hail is expected",
        "es": "Se prevé granizo",
        "ca": "Es preveu calamarsa",
        "it": "È prevista grandine",
    },
    "storm": {
        "en": "A storm is expected",
        "es": "Se prevé tormenta",
        "ca": "Es preveu tempesta",
        "it": "È previsto un temporale",
    },
    "snow": {
        "en": "Snow is expected",
        "es": "Se prevé nieve",
        "ca": "Es preveu neu",
        "it": "È prevista neve",
    },
    "frost": {
        "en": "Frost is expected",
        "es": "Se prevé helada",
        "ca": "Es preveu gelada",
        "it": "È prevista una gelata",
    },
    "wind": {
        "en": "Strong wind is expected",
        "es": "Se prevé viento fuerte",
        "ca": "Es preveu vent fort",
        "it": "È previsto vento forte",
    },
    "heat": {
        "en": "High temperatures are expected",
        "es": "Se prevén temperaturas altas",
        "ca": "Es preveuen temperatures altes",
        "it": "Sono previste temperature alte",
    },
    "rain": {
        "en": "Rain is expected",
        "es": "Se prevé lluvia",
        "ca": "Es preveu pluja",
        "it": "È prevista pioggia",
    },
}
_NOW: dict[str, dict[str, str]] = {
    "hail": {
        "en": "It is hailing now",
        "es": "Actualmente hay granizo",
        "ca": "Ara hi ha calamarsa",
        "it": "Ora c'è grandine",
    },
    "storm": {
        "en": "There is a storm now",
        "es": "Actualmente hay tormenta",
        "ca": "Ara hi ha tempesta",
        "it": "Ora c'è un temporale",
    },
    "snow": {
        "en": "It is snowing now",
        "es": "Actualmente hay nieve",
        "ca": "Ara hi ha neu",
        "it": "Ora c'è neve",
    },
    "frost": {
        "en": "There is frost now",
        "es": "Actualmente hay helada",
        "ca": "Ara hi ha gelada",
        "it": "Ora c'è una gelata",
    },
    "wind": {
        "en": "There is strong wind now",
        "es": "Actualmente hay viento fuerte",
        "ca": "Ara hi ha vent fort",
        "it": "Ora c'è vento forte",
    },
    "heat": {
        "en": "There are high temperatures now",
        "es": "Actualmente hay temperaturas altas",
        "ca": "Ara hi ha temperatures altes",
        "it": "Ora ci sono temperature alte",
    },
    "rain": {
        "en": "It is raining now",
        "es": "Actualmente hay lluvia",
        "ca": "Ara hi ha pluja",
        "it": "Ora c'è pioggia",
    },
}
_ON_DAY = {"en": "on", "es": "el", "ca": "el", "it": "il"}
_AT_TIME = {"en": "at", "es": "a las", "ca": "a les", "it": "alle"}


def _text(texts: dict[str, str], lang: str) -> str:
    return texts.get(lang, texts[DEFAULT_LANG])


class _Units:
    def __init__(self, forecast: WeatherForecastResponse):
        self.imperial = forecast.units == "imperial"
        self.temperature = forecast.temperature_unit
        self.wind = forecast.wind_speed_unit

    def celsius(self, value: float) -> float:
        return (value - 32) * 5 / 9 if self.imperial else value

    def kmh(self, value: float) -> float:
        return value * 1.609344 if self.imperial else value


def _is_hail(code: int | None) -> bool:
    return code in HAIL_CODES


def _is_storm(code: int | None, main: str) -> bool:
    return main == "Thunderstorm" and not _is_hail(code)


def _has_own_alert(code: int | None, main: str) -> bool:
    return _is_hail(code) or main in {"Thunderstorm", "Snow"}


def _wind(speed: float, gust: float | None) -> float:
    return max(speed, gust or 0)


def _hour_checks(units: _Units) -> dict[str, Callable[[HourlyForecast], bool]]:
    return {
        "hail": lambda hour: _is_hail(hour.condition.code),
        "storm": lambda hour: _is_storm(hour.condition.code, hour.condition.main),
        "snow": lambda hour: hour.condition.main == "Snow",
        "frost": lambda hour: units.celsius(hour.temperature) <= FROST_TEMPERATURE,
        "heat": lambda hour: units.celsius(hour.temperature) >= HEAT_TEMPERATURE,
        "rain": lambda hour: (
            not _has_own_alert(hour.condition.code, hour.condition.main)
            and (
                hour.condition.main in {"Rain", "Drizzle"}
                or (hour.rain_probability or 0) >= RAIN_PROBABILITY
            )
        ),
    }


def _day_checks(units: _Units) -> dict[str, Callable[[DailyForecast], bool]]:
    return {
        "hail": lambda day: _is_hail(day.condition.code),
        "storm": lambda day: _is_storm(day.condition.code, day.condition.main),
        "snow": lambda day: day.condition.main == "Snow",
        "frost": lambda day: units.celsius(day.temp_min) <= FROST_TEMPERATURE,
        "wind": lambda day: units.kmh(_wind(day.wind.speed, day.wind.gust)) >= WIND_SPEED,
        "heat": lambda day: units.celsius(day.temp_max) >= HEAT_TEMPERATURE,
        "rain": lambda day: (
            not _has_own_alert(day.condition.code, day.condition.main)
            and (day.rain_probability >= RAIN_PROBABILITY or day.rain_mm >= RAIN_MM)
        ),
    }


def _now_checks(units: _Units) -> dict[str, Callable[[CurrentWeather], bool]]:
    return {
        "hail": lambda now: _is_hail(now.condition.code),
        "storm": lambda now: _is_storm(now.condition.code, now.condition.main),
        "snow": lambda now: now.condition.main == "Snow",
        "frost": lambda now: units.celsius(now.temperature) <= FROST_TEMPERATURE,
        "wind": lambda now: units.kmh(_wind(now.wind.speed, now.wind.gust)) >= WIND_SPEED,
        "heat": lambda now: units.celsius(now.temperature) >= HEAT_TEMPERATURE,
        "rain": lambda now: now.condition.main in {"Rain", "Drizzle"},
    }


def _detail(
    alert_type: str,
    units: _Units,
    probability: float | None = None,
    temperature: float | None = None,
    wind_speed: float | None = None,
) -> str:
    if alert_type in {"frost", "heat"} and temperature is not None:
        return f" ({round(temperature)} {units.temperature})"
    if alert_type == "wind" and wind_speed is not None:
        return f" ({round(wind_speed)} {units.wind})"
    if alert_type in PRECIPITATION_TYPES and probability:
        return f" ({round(probability)}%)"
    return ""


def _from_now(alert_type: str, now: CurrentWeather, units: _Units, lang: str) -> WeatherAlert:
    wind_speed = _wind(now.wind.speed, now.wind.gust)
    message = _text(_NOW[alert_type], lang)
    message += _detail(alert_type, units, temperature=now.temperature, wind_speed=wind_speed)
    return WeatherAlert(
        type=alert_type,
        message=message,
        starts_at=now.observed_at,
        day=now.observed_at.date(),
        temperature=now.temperature if alert_type in {"frost", "heat"} else None,
        wind_speed=wind_speed if alert_type == "wind" else None,
    )


def _expected(alert_type: str, lang: str, day: date, at: datetime | None = None) -> str:
    message = f"{_text(_EXPECTED[alert_type], lang)} {_text(_ON_DAY, lang)} {day:%d/%m}"
    if at is not None:
        message += f" {_text(_AT_TIME, lang)} {at:%H:%M}"
    return message


def _from_hour(alert_type: str, hour: HourlyForecast, units: _Units, lang: str) -> WeatherAlert:
    message = _expected(alert_type, lang, hour.time.date(), hour.time)
    message += _detail(alert_type, units, hour.rain_probability, hour.temperature)
    return WeatherAlert(
        type=alert_type,
        message=message,
        starts_at=hour.time,
        day=hour.time.date(),
        rain_probability=hour.rain_probability if alert_type in PRECIPITATION_TYPES else None,
        temperature=hour.temperature if alert_type in {"frost", "heat"} else None,
    )


def _from_day(alert_type: str, day: DailyForecast, units: _Units, lang: str) -> WeatherAlert:
    temperature = day.temp_min if alert_type == "frost" else day.temp_max
    wind_speed = _wind(day.wind.speed, day.wind.gust)
    message = _expected(alert_type, lang, day.date)
    message += _detail(alert_type, units, day.rain_probability, temperature, wind_speed)
    return WeatherAlert(
        type=alert_type,
        message=message,
        day=day.date,
        rain_probability=day.rain_probability if alert_type in PRECIPITATION_TYPES else None,
        rain_mm=day.rain_mm if alert_type in PRECIPITATION_TYPES else None,
        temperature=temperature if alert_type in {"frost", "heat"} else None,
        wind_speed=wind_speed if alert_type == "wind" else None,
    )


def _next_hours(forecast: WeatherForecastResponse) -> list[HourlyForecast]:
    if not forecast.hourly:
        return []
    end = forecast.hourly[0].time + timedelta(hours=ALERT_HOURS)
    return [hour for hour in forecast.hourly if hour.time < end]


def _expected_alert(
    alert_type: str,
    hours: list[HourlyForecast],
    days: list[DailyForecast],
    units: _Units,
    lang: str,
) -> WeatherAlert | None:
    in_hour = _hour_checks(units).get(alert_type)
    if in_hour is not None:
        hour = next((hour for hour in hours if in_hour(hour)), None)
        if hour is not None:
            return _from_hour(alert_type, hour, units, lang)
    in_day = _day_checks(units)[alert_type]
    day = next((day for day in days if in_day(day)), None)
    return None if day is None else _from_day(alert_type, day, units, lang)


def _when(alert: WeatherAlert) -> tuple[date, time]:
    # Alerts of a whole day go before the alerts with an hour of that day.
    return alert.day, alert.starts_at.time() if alert.starts_at else time.min


def detect_current_alerts(forecast: WeatherForecastResponse) -> list[WeatherAlert]:
    lang = normalize_lang(forecast.lang)
    units = _Units(forecast)
    now_checks = _now_checks(units)
    return [
        _from_now(alert_type, forecast.current, units, lang)
        for alert_type in ALERT_TYPES
        if now_checks[alert_type](forecast.current)
    ]


def detect_alerts(forecast: WeatherForecastResponse) -> list[WeatherAlert]:
    lang = normalize_lang(forecast.lang)
    units = _Units(forecast)
    hours = _next_hours(forecast)
    days = forecast.daily[:ALERT_DAYS]
    now_checks = _now_checks(units)
    alerts: list[WeatherAlert] = []

    for alert_type in ALERT_TYPES:
        # If it is happening now, the forecast starts after the current hour.
        next_hours = hours[1:] if now_checks[alert_type](forecast.current) else hours
        expected = _expected_alert(alert_type, next_hours, days, units, lang)
        if expected is not None:
            alerts.append(expected)

    # The closest first; at the same moment, the most important first.
    return sorted(alerts, key=_when)
