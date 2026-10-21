from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID as PyUUID
from uuid import uuid4

from sqlalchemy import (
    JSON,
    UUID,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# PostgreSQL: JSONB. SQLite: JSON.
JSONType = JSON().with_variant(JSONB(), "postgresql")

# BIGINT in PostgreSQL, INTEGER in SQLite so autoincrement works locally.
BigIntType = BigInteger().with_variant(Integer, "sqlite")


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    username: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        default=datetime.utcnow,
    )

    profile: Mapped["UserProfile | None"] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    consents: Mapped[list["UserConsent"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    fields: Mapped[list["Field"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class UserProfile(Base):
    __tablename__ = "user_profile"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    language: Mapped[str] = mapped_column(
        String(50), nullable=False, default="ca", server_default=text("'ca'")
    )
    units: Mapped[str] = mapped_column(
        String(50), nullable=False, default="metric", server_default=text("'metric'")
    )
    notifications_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("TRUE")
    )
    weather_alerts_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("TRUE")
    )
    irrigation_alerts_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("TRUE")
    )
    theme: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="system",
    )

    user: Mapped["User"] = relationship(back_populates="profile")


class UserConsent(Base):
    __tablename__ = "user_consents"
    __table_args__ = (Index("idx_user_consents_user_id", "user_id"),)

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_version: Mapped[str] = mapped_column(String(50), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.current_timestamp(),
    )

    user: Mapped["User"] = relationship(back_populates="consents")


class Anunce(Base):
    __tablename__ = "anunces"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtile: Mapped[str | None] = mapped_column(String(255))
    agent: Mapped[str | None] = mapped_column(String(255))
    content: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.current_timestamp(),
    )


class ConteMercat(Base):
    __tablename__ = "conte_mercat"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    product: Mapped[str] = mapped_column(String(255), nullable=False)
    tecnical_name: Mapped[str | None] = mapped_column(String(255))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    price_per_kg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    left_units: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.current_timestamp(),
    )


class Field(Base):
    """A piece of land owned by a user."""

    __tablename__ = "fields"
    __table_args__ = (
        CheckConstraint(
            "lat IS NULL OR lat BETWEEN -90 AND 90",
            name="chk_fields_lat",
        ),
        CheckConstraint(
            "lon IS NULL OR lon BETWEEN -180 AND 180",
            name="chk_fields_lon",
        ),
        CheckConstraint(
            "size_m2 IS NULL OR size_m2 > 0",
            name="chk_fields_size",
        ),
        Index("idx_fields_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(BigIntType, primary_key=True, autoincrement=True)
    user_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    field_type: Mapped[str | None] = mapped_column(String(50))
    soil_type: Mapped[str | None] = mapped_column(String(50))
    size_m2: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.current_timestamp(),
    )

    user: Mapped["User"] = relationship(back_populates="fields")
    devices: Mapped[list["Device"]] = relationship(
        back_populates="field",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    weather: Mapped["WeatherCache | None"] = relationship(
        back_populates="field",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Device(Base):
    """An Arduino/ESP32 device installed in a field."""

    __tablename__ = "devices"
    __table_args__ = (Index("idx_devices_field_id", "field_id"),)

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    field_id: Mapped[int] = mapped_column(
        BigIntType,
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False,
    )
    brand: Mapped[str | None] = mapped_column(String(100))
    serial_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    warranty_until: Mapped[datetime | None] = mapped_column(Date)
    device_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("TRUE")
    )
    # Binary battery status:
    #   True  (1) = board on and connected
    #   False (0) = battery empty OR board not connected to the Internet
    # A board with an empty battery cannot report False itself: the backend
    # sets it when it stops receiving telemetry from the board.
    battery_status: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("FALSE")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.current_timestamp(),
    )

    field: Mapped["Field"] = relationship(back_populates="devices")
    telemetry: Mapped[list["Telemetry"]] = relationship(
        back_populates="device",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Telemetry(Base):
    """Sensor readings received through MQTT."""

    __tablename__ = "telemetry"
    __table_args__ = (Index("idx_telemetry_device_timestamp", "device_id", "timestamp"),)

    id: Mapped[int] = mapped_column(BigIntType, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(
        String(255),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    air_temperature_c: Mapped[Decimal | None] = mapped_column(Numeric)
    air_humidity_percent: Mapped[Decimal | None] = mapped_column(Numeric)
    soil_moisture_percent: Mapped[Decimal | None] = mapped_column(Numeric)
    light_intensity_lux: Mapped[Decimal | None] = mapped_column(Numeric)

    device: Mapped["Device"] = relationship(back_populates="telemetry")


class WeatherCache(Base):
    """Latest cached forecast and alert for a field."""

    __tablename__ = "weather_cache"

    field_id: Mapped[int] = mapped_column(
        BigIntType,
        ForeignKey("fields.id", ondelete="CASCADE"),
        primary_key=True,
    )
    forecast_rain_mm: Mapped[Decimal | None] = mapped_column(Numeric)
    forecast_temperature_c: Mapped[Decimal | None] = mapped_column(Numeric)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.current_timestamp(),
    )
    forecast_days: Mapped[Any | None] = mapped_column(JSONType)
    alert_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("FALSE")
    )
    alert_type: Mapped[str | None] = mapped_column(String(50))
    alert_message: Mapped[str | None] = mapped_column(Text)

    field: Mapped["Field"] = relationship(back_populates="weather")
