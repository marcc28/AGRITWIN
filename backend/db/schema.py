from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

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
