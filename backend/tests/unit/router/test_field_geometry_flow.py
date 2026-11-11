"""Exercise field geometry and ownership through the API and a real local database."""

from types import SimpleNamespace
from uuid import UUID

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from api.v1 import fields
from api.v1.auth import get_current_user
from db.schema import Base, Device, User
from tests.unit.services.test_field_geometry_service import HOLE, SQUARE

OWNER = UUID("10000000-0000-4000-a000-000000000001")
OTHER = UUID("10000000-0000-4000-a000-000000000002")
PAYLOAD = {
    "name": "Test field",
    "location": "Sample road, Sample town",
    "field_type": "open_field",
    "soil_type": "loam",
    "size_m2": 1,
    "boundary": SQUARE,
    "excluded_zones": [HOLE],
}


@pytest_asyncio.fixture
async def field_flow(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with sessions() as session:
            session.add(
                User(id=OWNER, username="owner", email="owner@example.com", password_hash="x")
            )
            await session.commit()
        monkeypatch.setattr(fields, "AsyncSessionLocal", sessions)
        app = FastAPI()
        app.include_router(fields.router, prefix="/api/v1")
        # SQLite's untyped raw SQL bindings use the UUID's stored hex representation.
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=OWNER.hex)
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            yield client, sessions, app
    finally:
        await engine.dispose()


async def create_drawn_field(client):
    response = await client.post("/api/v1/fields", json=PAYLOAD)
    assert response.status_code == 200, response.text
    return response.json()


async def test_geometry_round_trip_and_device_counts(field_flow):
    client, sessions, _ = field_flow
    created = await create_drawn_field(client)
    assert created["size_m2"] == 11869.78
    assert created["boundary"] == SQUARE
    assert created["excluded_zones"] == [HOLE]
    async with sessions() as session:
        session.add_all(
            [
                Device(id="online", field_id=created["id"], battery_status=True),
                Device(id="offline", field_id=created["id"], battery_status=False),
            ]
        )
        await session.commit()
    for path in ("/api/v1/fields", f"/api/v1/fields/{created['id']}"):
        response = await client.get(path)
        assert response.status_code == 200, response.text
        result = response.json()[0] if isinstance(response.json(), list) else response.json()
        assert result["boundary"] == SQUARE
        assert result["excluded_zones"] == [HOLE]
        assert result["device_count"] == 2
        assert result["devices_online"] == 1


@pytest.mark.parametrize("clear", [False, True])
async def test_update_preserves_or_explicitly_clears_geometry(field_flow, clear):
    client, _, _ = field_flow
    created = await create_drawn_field(client)
    body = {k: created[k] for k in ("name", "location", "field_type", "soil_type", "size_m2")}
    if clear:
        body.update(boundary=None, excluded_zones=[], size_m2=500)
    response = await client.put(f"/api/v1/fields/{created['id']}", json=body)
    assert response.status_code == 200, response.text
    saved = (await client.get(f"/api/v1/fields/{created['id']}")).json()
    assert saved["boundary"] == (None if clear else SQUARE)
    assert saved["excluded_zones"] == ([] if clear else [HOLE])
    assert saved["size_m2"] == (500 if clear else 11869.78)


async def test_replacing_geometry_recalculates_area(field_flow):
    client, _, _ = field_flow
    created = await create_drawn_field(client)
    body = {**PAYLOAD, "excluded_zones": [], "size_m2": 999}
    response = await client.put(f"/api/v1/fields/{created['id']}", json=body)
    assert response.status_code == 200, response.text
    assert response.json()["size_m2"] == 12364.35
    assert response.json()["excluded_zones"] == []


async def test_another_owner_cannot_read_or_replace_geometry(field_flow):
    client, _, app = field_flow
    created = await create_drawn_field(client)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=OTHER.hex)
    assert (await client.get("/api/v1/fields")).json() == []
    path = f"/api/v1/fields/{created['id']}"
    assert (await client.get(path)).status_code == 404
    assert (await client.put(path, json=PAYLOAD)).status_code == 404
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=OWNER.hex)
    assert (await client.get(path)).json()["excluded_zones"] == [HOLE]
