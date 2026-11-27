import os
from uuid import UUID

# Set a fallback database URL for CI environments before importing db.database
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault(
    "LOCAL_DATABASE_URL",
    "postgresql+asyncpg://user:pass@localhost:5432/testdb",
)

import asyncio
import sqlite3
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from api.v1 import auth, dashboard, fields
from db.schema import Base, Device, Field, GardenTask, Telemetry, User
from services.simulated_readings_service import HISTORY_READINGS

# Full flow of the simulated readings (#288): route -> service -> database.
# The database is an in-memory SQLite, like in test_weather_flow.py.

TIGRE = UUID("7a9e0000-0000-4000-a000-000000000288")
FIELD = "/api/v1/fields"


def sqlite_date_trunc(unit: str, value: str | None) -> str | None:
    """SQLite version of PostgreSQL date_trunc('minute', ...), used by the dashboard."""
    if value is None:
        return None
    assert unit == "minute"
    return value[:16] + ":00"


async def create_database(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add(User(id=TIGRE, username="tigre", email="tigre@example.com", password_hash="x"))
        await session.commit()
    return factory


@pytest.fixture
def flow(monkeypatch):
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine.sync_engine, "connect")
    def add_functions(connection, _record):
        connection.create_function("date_trunc", 2, sqlite_date_trunc)

    # The routes send the user id as a UUID in raw SQL. SQLite cannot bind it,
    # so it is stored like the ORM does (32 hex characters), only in this test.
    monkeypatch.setitem(sqlite3.adapters, (UUID, sqlite3.PrepareProtocol), lambda value: value.hex)

    sessions = asyncio.run(create_database(engine))
    # Every route of the flow uses the same test database.
    monkeypatch.setattr(auth, "AsyncSessionLocal", sessions)
    monkeypatch.setattr(fields, "AsyncSessionLocal", sessions)
    monkeypatch.setattr(dashboard, "AsyncSessionLocal", sessions)

    app = FastAPI()
    app.include_router(fields.router, prefix="/api/v1")
    app.include_router(dashboard.router, prefix="/api/v1")

    yield TestClient(app), sessions

    asyncio.run(engine.dispose())


def login(username="tigre"):
    token = auth.create_access_token({"sub": username})
    return {"Authorization": f"Bearer {token}"}


def run(sessions, work):
    async def go():
        async with sessions() as session:
            result = await work(session)
            await session.commit()
            return result

    return asyncio.run(go())


def devices_of(sessions, field_id):
    async def work(session):
        rows = await session.execute(
            select(Device.id, Device.is_simulated)
            .where(Device.field_id == field_id)
            .order_by(Device.id)
        )
        return [(row.id, row.is_simulated) for row in rows]

    return run(sessions, work)


def readings_of(sessions, device_id):
    async def work(session):
        result = await session.scalars(
            select(Telemetry.timestamp).where(Telemetry.device_id == device_id)
        )
        return list(result.all())

    return run(sessions, work)


def add_real_reading(sessions, device_id, minutes_ago, soil):
    moment = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=minutes_ago)

    async def work(session):
        session.add(
            Telemetry(
                device_id=device_id,
                timestamp=moment,
                air_temperature_c=21,
                air_humidity_percent=50,
                soil_moisture_percent=soil,
                light_intensity_lux=1000,
            )
        )

    run(sessions, work)


def add_ai_task(sessions, field_id, title, **values):
    async def work(session):
        session.add(
            GardenTask(
                field_id=field_id,
                title=title,
                source=values.pop("source", "ai"),
                kind="task",
                due_on=datetime.now(UTC).date(),
                **values,
            )
        )

    run(sessions, work)


def task_titles(sessions, field_id):
    async def work(session):
        result = await session.scalars(
            select(GardenTask.title).where(GardenTask.field_id == field_id).order_by(GardenTask.id)
        )
        return list(result.all())

    return run(sessions, work)


def create_garden(client, name="Hort de prova"):
    response = client.post(
        FIELD,
        headers=login(),
        json={"name": name, "lat": 41.6, "lon": 0.6, "field_type": "home_garden", "size_m2": 20},
    )
    assert response.status_code == 200, response.text
    return response.json()


def register_board(client, field_id, board_id):
    return client.post(
        f"{FIELD}/{field_id}/devices",
        headers=login(),
        json={"id": board_id, "brand": "AgriTwin", "serial_number": f"SN-{board_id}"},
    )


def open_dashboard(client, field_id):
    response = client.get(f"/api/v1/dashboard?field_id={field_id}", headers=login())
    assert response.status_code == 200, response.text
    return response.json()


# ---------------------------------------------------------------------------
# 1. A garden with no device shows simulated readings
# ---------------------------------------------------------------------------


def test_new_garden_without_device_shows_simulated_readings(flow):
    client, sessions = flow

    garden = create_garden(client)

    # The app sees a garden without boards that shows simulated data.
    assert garden["device_count"] == 0
    assert garden["simulated_data"] is True
    detail = client.get(f"{FIELD}/{garden['id']}", headers=login()).json()
    assert detail["devices"] == []
    assert detail["simulated_data"] is True

    # In the database there is one simulated device with its readings.
    simulated_id = f"sim-field-{garden['id']}"
    assert devices_of(sessions, garden["id"]) == [(simulated_id, True)]
    assert len(readings_of(sessions, simulated_id)) == HISTORY_READINGS

    # The dashboard shows them, marked as simulated.
    board = open_dashboard(client, garden["id"])
    assert board["simulated"] is True
    assert board["device_ids"] == [simulated_id]
    assert len(board["history"]) == HISTORY_READINGS
    assert board["latest"] is not None


def test_opening_the_dashboard_again_does_not_duplicate_anything(flow):
    client, sessions = flow
    garden = create_garden(client)
    simulated_id = f"sim-field-{garden['id']}"

    open_dashboard(client, garden["id"])
    open_dashboard(client, garden["id"])

    assert devices_of(sessions, garden["id"]) == [(simulated_id, True)]
    times = readings_of(sessions, simulated_id)
    assert len(times) == len(set(times))


def test_simulated_device_cannot_be_deleted_from_the_app(flow):
    client, sessions = flow
    garden = create_garden(client)

    response = client.delete(
        f"{FIELD}/{garden['id']}/devices/sim-field-{garden['id']}", headers=login()
    )

    assert response.status_code == 404
    assert devices_of(sessions, garden["id"]) == [(f"sim-field-{garden['id']}", True)]


# ---------------------------------------------------------------------------
# 2. The first real device deletes the simulated readings
# ---------------------------------------------------------------------------


def test_first_real_device_deletes_the_simulated_readings(flow):
    client, sessions = flow
    garden = create_garden(client)
    simulated_id = f"sim-field-{garden['id']}"
    add_ai_task(sessions, garden["id"], "Water now (AI)", signature="water")
    add_ai_task(
        sessions, garden["id"], "Done (AI)", signature="done", completed_at=datetime.now(UTC)
    )
    add_ai_task(sessions, garden["id"], "My own task", source="user")

    response = register_board(client, garden["id"], "esp32_A")

    assert response.status_code == 200, response.text
    # Only the real board is left, and no simulated reading.
    assert devices_of(sessions, garden["id"]) == [("esp32_A", False)]
    assert readings_of(sessions, simulated_id) == []
    # Pending AI work made from simulated data is gone; history and user tasks stay.
    assert task_titles(sessions, garden["id"]) == ["Done (AI)", "My own task"]

    detail = client.get(f"{FIELD}/{garden['id']}", headers=login()).json()
    assert detail["simulated_data"] is False
    assert detail["device_count"] == 1
    assert [device["id"] for device in detail["devices"]] == ["esp32_A"]


def test_after_the_first_device_the_dashboard_shows_only_real_readings(flow):
    client, sessions = flow
    garden = create_garden(client)
    register_board(client, garden["id"], "esp32_A")
    add_real_reading(sessions, "esp32_A", minutes_ago=5, soil=42)

    board = open_dashboard(client, garden["id"])

    assert board["simulated"] is False
    assert board["device_ids"] == ["esp32_A"]
    assert len(board["history"]) == 1
    assert board["latest"]["soil_humidity"] == 42
    # Opening the dashboard never brings the simulated device back.
    assert devices_of(sessions, garden["id"]) == [("esp32_A", False)]


def test_failed_registration_keeps_the_simulated_readings(flow):
    client, sessions = flow
    first = create_garden(client, "Hort 1")
    second = create_garden(client, "Hort 2")
    register_board(client, first["id"], "esp32_A")

    # The board already belongs to another garden: 409, nothing is deleted.
    response = register_board(client, second["id"], "esp32_A")

    assert response.status_code == 409
    simulated_id = f"sim-field-{second['id']}"
    assert devices_of(sessions, second["id"]) == [(simulated_id, True)]
    assert len(readings_of(sessions, simulated_id)) == HISTORY_READINGS


# ---------------------------------------------------------------------------
# 3. A second device leaves the real readings in place
# ---------------------------------------------------------------------------


def test_second_device_leaves_the_real_readings_in_place(flow):
    client, sessions = flow
    garden = create_garden(client)
    register_board(client, garden["id"], "esp32_A")
    add_real_reading(sessions, "esp32_A", minutes_ago=30, soil=40)
    add_real_reading(sessions, "esp32_A", minutes_ago=20, soil=41)
    add_ai_task(sessions, garden["id"], "Water tomorrow (AI)", signature="water")

    response = register_board(client, garden["id"], "esp32_B")

    assert response.status_code == 200, response.text
    assert devices_of(sessions, garden["id"]) == [("esp32_A", False), ("esp32_B", False)]
    # The readings of the first board and the AI tasks made from them stay.
    assert len(readings_of(sessions, "esp32_A")) == 2
    assert task_titles(sessions, garden["id"]) == ["Water tomorrow (AI)"]

    board = open_dashboard(client, garden["id"])
    assert board["simulated"] is False
    assert board["device_ids"] == ["esp32_A", "esp32_B"]
    assert len(board["history"]) == 2


def test_removing_one_of_two_boards_keeps_the_other_readings(flow):
    client, sessions = flow
    garden = create_garden(client)
    register_board(client, garden["id"], "esp32_A")
    register_board(client, garden["id"], "esp32_B")
    add_real_reading(sessions, "esp32_A", minutes_ago=10, soil=44)

    response = client.delete(f"{FIELD}/{garden['id']}/devices/esp32_B", headers=login())

    assert response.status_code == 200
    assert devices_of(sessions, garden["id"]) == [("esp32_A", False)]
    assert len(readings_of(sessions, "esp32_A")) == 1
    assert open_dashboard(client, garden["id"])["simulated"] is False


def test_garden_of_another_user_is_not_touched(flow):
    client, sessions = flow
    garden = create_garden(client)

    async def add_other_user(session):
        other = UUID("0e000000-0000-4000-a000-000000000001")
        session.add(User(id=other, username="other", email="o@example.com", password_hash="x"))
        await session.flush()
        session.add(Field(id=999, user_id=other, name="Not mine"))

    run(sessions, add_other_user)

    response = register_board(client, 999, "esp32_X")

    assert response.status_code == 404
    assert devices_of(sessions, garden["id"]) == [(f"sim-field-{garden['id']}", True)]
    assert devices_of(sessions, 999) == []
    