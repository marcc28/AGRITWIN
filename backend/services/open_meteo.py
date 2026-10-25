from datetime import date, datetime, timedelta, timezone
from typing import Any

from models.weather import (
    CurrentWeather,
    DailyForecast,
    HourlyForecast,
    WeatherCondition,
    WeatherForecastResponse,
    WeatherLocation,
    Wind,
)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

CURRENT_FIELDS = (
    "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,"
    "weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,"
    "uv_index"
)
HOURLY_FIELDS = "temperature_2m,precipitation_probability,weather_code,is_day"
DAILY_FIELDS = (
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,"
    "precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,"
    "wind_direction_10m_dominant,uv_index_max,sunrise,sunset"
)
DAY_CONDITION_HOUR = "12"
HOURS_AHEAD = 24
MIN_DAYS_FOR_HOURLY = 2

_WMO: dict[int, tuple[str, str, dict[str, str]]] = {
    0: (
        "Clear",
        "01",
        {"en": "clear sky", "es": "cielo despejado", "ca": "cel serè", "it": "cielo sereno"},
    ),
    1: (
        "Clouds",
        "02",
        {
            "en": "mainly clear",
            "es": "mayormente despejado",
            "ca": "majoritàriament serè",
            "it": "prevalentemente sereno",
        },
    ),
    2: (
        "Clouds",
        "03",
        {
            "en": "partly cloudy",
            "es": "parcialmente nublado",
            "ca": "parcialment ennuvolat",
            "it": "parzialmente nuvoloso",
        },
    ),
    3: ("Clouds", "04", {"en": "overcast", "es": "cubierto", "ca": "cobert", "it": "coperto"}),
    45: ("Fog", "50", {"en": "fog", "es": "niebla", "ca": "boira", "it": "nebbia"}),
    48: (
        "Fog",
        "50",
        {"en": "rime fog", "es": "niebla helada", "ca": "boira gebradora", "it": "nebbia gelata"},
    ),
    51: (
        "Drizzle",
        "09",
        {
            "en": "light drizzle",
            "es": "llovizna ligera",
            "ca": "plugim feble",
            "it": "pioviggine leggera",
        },
    ),
    53: ("Drizzle", "09", {"en": "drizzle", "es": "llovizna", "ca": "plugim", "it": "pioviggine"}),
    55: (
        "Drizzle",
        "09",
        {
            "en": "dense drizzle",
            "es": "llovizna intensa",
            "ca": "plugim intens",
            "it": "pioviggine intensa",
        },
    ),
    56: (
        "Drizzle",
        "09",
        {
            "en": "freezing drizzle",
            "es": "llovizna helada",
            "ca": "plugim gelat",
            "it": "pioviggine gelata",
        },
    ),
    57: (
        "Drizzle",
        "09",
        {
            "en": "dense freezing drizzle",
            "es": "llovizna helada intensa",
            "ca": "plugim gelat intens",
            "it": "pioviggine gelata intensa",
        },
    ),
    61: (
        "Rain",
        "10",
        {"en": "light rain", "es": "lluvia ligera", "ca": "pluja feble", "it": "pioggia leggera"},
    ),
    63: (
        "Rain",
        "10",
        {
            "en": "moderate rain",
            "es": "lluvia moderada",
            "ca": "pluja moderada",
            "it": "pioggia moderata",
        },
    ),
    65: (
        "Rain",
        "10",
        {"en": "heavy rain", "es": "lluvia intensa", "ca": "pluja intensa", "it": "pioggia forte"},
    ),
    66: (
        "Rain",
        "13",
        {
            "en": "freezing rain",
            "es": "lluvia helada",
            "ca": "pluja gelada",
            "it": "pioggia gelata",
        },
    ),
    67: (
        "Rain",
        "13",
        {
            "en": "heavy freezing rain",
            "es": "lluvia helada intensa",
            "ca": "pluja gelada intensa",
            "it": "pioggia gelata forte",
        },
    ),
    71: (
        "Snow",
        "13",
        {"en": "light snow", "es": "nevada ligera", "ca": "nevada feble", "it": "neve leggera"},
    ),
    73: ("Snow", "13", {"en": "snow", "es": "nevada", "ca": "nevada", "it": "neve"}),
    75: (
        "Snow",
        "13",
        {"en": "heavy snow", "es": "nevada intensa", "ca": "nevada intensa", "it": "neve forte"},
    ),
    77: (
        "Snow",
        "13",
        {
            "en": "snow grains",
            "es": "granos de nieve",
            "ca": "neu granulada",
            "it": "granuli di neve",
        },
    ),
    80: (
        "Rain",
        "09",
        {
            "en": "light rain showers",
            "es": "chubascos ligeros",
            "ca": "ruixats febles",
            "it": "rovesci leggeri",
        },
    ),
    81: ("Rain", "09", {"en": "rain showers", "es": "chubascos", "ca": "ruixats", "it": "rovesci"}),
    82: (
        "Rain",
        "09",
        {
            "en": "violent rain showers",
            "es": "chubascos fuertes",
            "ca": "ruixats forts",
            "it": "rovesci violenti",
        },
    ),
    85: (
        "Snow",
        "13",
        {
            "en": "snow showers",
            "es": "chubascos de nieve",
            "ca": "ruixats de neu",
            "it": "rovesci di neve",
        },
    ),
    86: (
        "Snow",
        "13",
        {
            "en": "heavy snow showers",
            "es": "chubascos de nieve fuertes",
            "ca": "ruixats de neu forts",
            "it": "forti rovesci di neve",
        },
    ),
    95: (
        "Thunderstorm",
        "11",
        {"en": "thunderstorm", "es": "tormenta", "ca": "tempesta", "it": "temporale"},
    ),
    96: (
        "Thunderstorm",
        "11",
        {
            "en": "thunderstorm with hail",
            "es": "tormenta con granizo",
            "ca": "tempesta amb calamarsa",
            "it": "temporale con grandine",
        },
    ),
    99: (
        "Thunderstorm",
        "11",
        {
            "en": "thunderstorm with heavy hail",
            "es": "tormenta con granizo fuerte",
            "ca": "tempesta amb calamarsa forta",
            "it": "temporale con forte grandine",
        },
    ),
}


def build_params(latitude: float, longitude: float, units: str, days: int) -> dict[str, Any]:
    imperial = units == "imperial"
    return {
        "latitude": latitude,
        "longitude": longitude,
        "current": CURRENT_FIELDS,
        "hourly": HOURLY_FIELDS,
        "daily": DAILY_FIELDS,
        "forecast_days": max(days, MIN_DAYS_FOR_HOURLY),
        "timezone": "auto",
        "temperature_unit": "fahrenheit" if imperial else "celsius",
        "wind_speed_unit": "mph" if imperial else "kmh",
        "precipitation_unit": "mm",
    }


def condition_from_code(code: Any, lang: str, is_day: bool = True) -> WeatherCondition:
    try:
        main, icon_number, descriptions = _WMO[int(code)]
    except (KeyError, TypeError, ValueError):
        return WeatherCondition(code=None, main="Unknown", description="", icon="")
    return WeatherCondition(
        code=int(code),
        main=main,
        description=descriptions.get(lang, descriptions["en"]),
        icon=f"{icon_number}{'d' if is_day else 'n'}",
    )


def parse(
    raw: dict,
    latitude: float,
    longitude: float,
    units: str,
    lang: str,
    days: int,
) -> WeatherForecastResponse:
    tz_offset = int(raw.get("utc_offset_seconds") or 0)
    tz = timezone(timedelta(seconds=tz_offset))
    hourly = raw.get("hourly") or {}
    imperial = units == "imperial"
    return WeatherForecastResponse(
        units=units,
        lang=lang,
        temperature_unit="°F" if imperial else "°C",
        wind_speed_unit="mph" if imperial else "km/h",
        location=WeatherLocation(
            latitude=latitude,
            longitude=longitude,
            timezone_offset=tz_offset,
        ),
        current=_current(raw["current"], hourly, tz, lang),
        hourly=_next_hours(hourly, raw["current"]["time"], tz, lang),
        daily=_daily(raw["daily"], hourly, tz, lang, days),
    )


def _local_time(value: str | None, tz: timezone) -> datetime | None:
    return datetime.fromisoformat(value).replace(tzinfo=tz) if value else None


def _current(current: dict, hourly: dict, tz: timezone, lang: str) -> CurrentWeather:
    temperature = _number(current["temperature_2m"])
    is_day = bool(current.get("is_day", 1))
    return CurrentWeather(
        observed_at=_local_time(current["time"], tz),
        temperature=temperature,
        feels_like=_number(current.get("apparent_temperature"), temperature),
        humidity=int(_number(current.get("relative_humidity_2m"))),
        pressure=round(_number(current.get("pressure_msl"))),
        clouds=int(_number(current.get("cloud_cover"))),
        rain_last_hour_mm=_number(current.get("precipitation")),
        condition=condition_from_code(current.get("weather_code"), lang, is_day),
        wind=Wind(
            speed=_number(current.get("wind_speed_10m")),
            direction_deg=current.get("wind_direction_10m"),
            gust=current.get("wind_gusts_10m"),
        ),
        rain_probability=_rain_probability_at(hourly, current["time"]),
        uv_index=current.get("uv_index"),
        is_day=is_day,
    )


def _next_hours(hourly: dict, now: str, tz: timezone, lang: str) -> list[HourlyForecast]:
    current_hour = now[:13]
    times = hourly.get("time") or []
    result: list[HourlyForecast] = []
    for i, slot_time in enumerate(times):
        temperature = _at(hourly.get("temperature_2m"), i)
        if slot_time[:13] < current_hour or temperature is None:
            continue
        probability = _at(hourly.get("precipitation_probability"), i)
        is_day = _at(hourly.get("is_day"), i)
        result.append(
            HourlyForecast(
                time=_local_time(slot_time, tz),
                temperature=_number(temperature),
                rain_probability=None if probability is None else _number(probability),
                condition=condition_from_code(
                    _at(hourly.get("weather_code"), i), lang, is_day is None or bool(is_day)
                ),
            )
        )
        if len(result) == HOURS_AHEAD:
            break
    return result


def _rain_probability_at(hourly: dict, time: str) -> float | None:
    hour = time[:13]
    for slot_time, probability in _pairs(hourly, "precipitation_probability"):
        if slot_time.startswith(hour):
            return _number(probability)
    return None


def _midday_codes(hourly: dict) -> dict[str, Any]:
    return {
        slot_time[:10]: code
        for slot_time, code in _pairs(hourly, "weather_code")
        if slot_time[11:13] == DAY_CONDITION_HOUR and code is not None
    }


def _daily(daily: dict, hourly: dict, tz: timezone, lang: str, days: int) -> list[DailyForecast]:
    midday_codes = _midday_codes(hourly)
    result: list[DailyForecast] = []
    for i, day in enumerate(daily["time"][:days]):
        temp_min = _at(daily["temperature_2m_min"], i)
        temp_max = _at(daily["temperature_2m_max"], i)
        if temp_min is None or temp_max is None:
            continue
        code = midday_codes.get(day, _at(daily["weather_code"], i))
        result.append(
            DailyForecast(
                date=date.fromisoformat(day),
                temp_min=_number(temp_min),
                temp_max=_number(temp_max),
                rain_probability=_number(_at(daily["precipitation_probability_max"], i)),
                rain_mm=round(_number(_at(daily["precipitation_sum"], i)), 2),
                condition=condition_from_code(code, lang),
                wind=Wind(
                    speed=_number(_at(daily["wind_speed_10m_max"], i)),
                    direction_deg=_at(daily.get("wind_direction_10m_dominant"), i),
                    gust=_at(daily.get("wind_gusts_10m_max"), i),
                ),
                uv_index_max=_at(daily.get("uv_index_max"), i),
                sunrise=_local_time(_at(daily.get("sunrise"), i), tz),
                sunset=_local_time(_at(daily.get("sunset"), i), tz),
            )
        )
    return result


def _pairs(hourly: dict, key: str) -> zip:
    return zip(hourly.get("time") or [], hourly.get(key) or [], strict=False)


def _at(values: list | None, index: int) -> Any:
    return values[index] if values and index < len(values) else None


def _number(value: Any, default: float = 0.0) -> float:
    return default if value is None else float(value)
