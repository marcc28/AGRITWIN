from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# JSONB on PostgreSQL (Supabase), plain JSON on SQLite (local tests)
JSONType = JSON().with_variant(JSONB(), "postgresql")


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(
        String(255),
        primary_key=True,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    profile: Mapped["UserProfile"] = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    consents: Mapped[list["UserConsent"]] = relationship(
        "UserConsent",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    fields: Mapped[list["Field"]] = relationship(
        "Field",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserProfile(Base):
    __tablename__ = "user_profile"

    username: Mapped[str] = mapped_column(
        String(255),
        ForeignKey("users.username"),
        primary_key=True,
    )

    language: Mapped[str] = mapped_column(
        String(50),
        default="ca",
        nullable=False,
    )

    units: Mapped[str] = mapped_column(
        String(50),
        default="metric",
        nullable=False,
    )

    notifications_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    weather_alerts_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    irrigation_alerts_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    theme: Mapped[str] = mapped_column(
        String(50),
        default="system",
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="profile",
    )


class UserConsent(Base):
    __tablename__ = "user_consents"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    username: Mapped[str] = mapped_column(
        String(255),
        ForeignKey("users.username"),
        nullable=False,
    )

    document_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    document_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    accepted_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="consents",
    )


class Anunce(Base):
    __tablename__ = "anunces"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    subtile: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    agent: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    content: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )


class ConteMercat(Base):
    __tablename__ = "conte_mercat"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    product: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    tecnical_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    price_per_kg: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
    )

    left_units: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )


class Field(Base):
    """A piece of land owned by a user (home garden, open field, greenhouse...)."""

    __tablename__ = "fields"
    __table_args__ = (
        CheckConstraint("lat IS NULL OR lat BETWEEN -90 AND 90", name="chk_fields_lat"),
        CheckConstraint("lon IS NULL OR lon BETWEEN -180 AND 180", name="chk_fields_lon"),
        CheckConstraint("size_m2 IS NULL OR size_m2 > 0", name="chk_fields_size"),
        Index("idx_fields_username", "username"),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    username: Mapped[str] = mapped_column(
        String(255),
        ForeignKey("users.username", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Human readable place (town, address...)
    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # GPS coordinates, used by the weather API
    lat: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    lon: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # e.g. 'home_garden', 'open_field', 'greenhouse'
    field_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # e.g. 'clay', 'sandy', 'loam'
    soil_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # Surface in square meters
    size_m2: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="fields",
    )

    devices: Mapped[list["Device"]] = relationship(
        "Device",
        back_populates="field",
        cascade="all, delete-orphan",
    )

    weather: Mapped["WeatherCache | None"] = relationship(
        "WeatherCache",
        back_populates="field",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Device(Base):
    """An IoT board (Arduino / ESP32) installed in a field.

    The id is the hardware identifier sent in the MQTT payload (e.g. 'esp32_sim_01').
    """

    __tablename__ = "devices"
    __table_args__ = (Index("idx_devices_field_id", "field_id"),)

    id: Mapped[str] = mapped_column(
        String(255),
        primary_key=True,
    )

    field_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    field: Mapped["Field"] = relationship(
        "Field",
        back_populates="devices",
    )

    telemetry: Mapped[list["Telemetry"]] = relationship(
        "Telemetry",
        back_populates="device",
        cascade="all, delete-orphan",
    )


class Telemetry(Base):
    """A sensor reading received from a device through MQTT.

    Column names match the keys of the MQTT 'sensors' payload.
    """

    __tablename__ = "telemetry"
    __table_args__ = (
        # Used to read the latest readings of a device quickly
        Index("idx_telemetry_device_timestamp", "device_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    device_id: Mapped[str] = mapped_column(
        String(255),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    air_temperature_c: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
    )

    air_humidity_percent: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
    )

    soil_moisture_percent: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
    )

    light_intensity_lux: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
    )

    device: Mapped["Device"] = relationship(
        "Device",
        back_populates="telemetry",
    )


class WeatherCache(Base):
    """Last weather forecast fetched for a field, plus the active alert (if any)."""

    __tablename__ = "weather_cache"

    field_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("fields.id", ondelete="CASCADE"),
        primary_key=True,
    )

    forecast_rain_mm: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
    )

    forecast_temperature_c: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
    )

    # When the forecast was fetched from the weather API
    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # Raw daily forecast returned by the weather API
    forecast_days: Mapped[Any | None] = mapped_column(
        JSONType,
        nullable=True,
    )

    alert_active: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # e.g. 'hail', 'heavy_rain', 'frost'
    alert_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    alert_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    field: Mapped["Field"] = relationship(
        "Field",
        back_populates="weather",
    )
