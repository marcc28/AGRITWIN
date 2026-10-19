from datetime import date, datetime

from pydantic import BaseModel


class WeatherLocation(BaseModel):
    field_id: int | None = None
    name: str | None = None
    country: str | None = None
    latitude: float
    longitude: float
    timezone_offset: int = 0


class WeatherCondition(BaseModel):
    code: int | None = None
    main: str
    description: str
    icon: str


class Wind(BaseModel):
    speed: float
    direction_deg: int | None = None
    gust: float | None = None


class CurrentWeather(BaseModel):
    observed_at: datetime
    temperature: float
    feels_like: float
    humidity: int
    pressure: int
    clouds: int
    rain_last_hour_mm: float = 0.0
    condition: WeatherCondition
    wind: Wind
    rain_probability: float | None = None
    uv_index: float | None = None
    is_day: bool = True


class HourlyForecast(BaseModel):
    time: datetime
    temperature: float
    rain_probability: float | None = None
    condition: WeatherCondition


class DailyForecast(BaseModel):
    date: date
    temp_min: float
    temp_max: float
    rain_probability: float
    rain_mm: float
    condition: WeatherCondition
    wind: Wind
    uv_index_max: float | None = None
    sunrise: datetime | None = None
    sunset: datetime | None = None


class WeatherForecastResponse(BaseModel):
    units: str
    lang: str = "ca"
    temperature_unit: str = "°C"
    wind_speed_unit: str = "km/h"
    fetched_at: datetime | None = None
    location: WeatherLocation
    current: CurrentWeather
    hourly: list[HourlyForecast] = []
    daily: list[DailyForecast]
