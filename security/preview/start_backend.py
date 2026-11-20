"""Local-only demo harness. Never import or use project .env files.

This intentionally mounts a safe subset of the real routers. It is a UI
preview, not a substitute for integration tests of backend.main.
"""
from __future__ import annotations

import argparse
import asyncio
import ipaddress
import os
from pathlib import Path
import sqlite3
import struct
import tempfile
import sys
import zlib
from uuid import UUID

PREVIEW = Path(tempfile.gettempdir()) / "agritwin-security-preview"
PREVIEW.mkdir(parents=True, exist_ok=True)
REPO = Path(__file__).resolve().parents[2]
BACKEND = REPO / "backend"
DB_FILE = PREVIEW / "demo.sqlite"
USERNAME = "demo-local"
NEW_USERNAME = "demo-new"
PASSWORD = "Demo-local-2026!"

# Clear inherited credentials and avoid both dotenv loading and bytecode writes
# into the source checkout. The command in README also starts Python with -I.
os.environ.clear()
os.environ.update({
    "PATH": "/usr/bin:/bin:/usr/sbin:/sbin",
    "HOME": str(PREVIEW),
    "TMPDIR": str(PREVIEW),
    "PYTHON_DOTENV_DISABLED": "1",
    "PYTHONDONTWRITEBYTECODE": "1",
    "DATABASE_URL": f"sqlite+aiosqlite:///{DB_FILE}",
    "SECRET_KEY": "dummy-preview-secret-no-live-use-2026-at-least-32-characters",
    "PROD": "False",
    "PRODUCTION": "False",
    "ENVIRONMENT": "development",
    "AWS_EC2_METADATA_DISABLED": "true",
    "GEOCODING_BASE_URL": "http://127.0.0.1:8765/disabled-geocoder",
    "GEOCODING_FALLBACK_URL": "",
})
sys.dont_write_bytecode = True
sys.path.insert(0, str(BACKEND))


def is_loopback(host):
    if isinstance(host, bytes):
        host = host.decode("ascii", "strict")
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except (ValueError, TypeError):
        return False


def local_network_only(event, args):
    if event == "socket.getaddrinfo" and not is_loopback(args[0]):
        raise OSError("Demo harness blocks external DNS and provider connections")
    if event == "socket.connect":
        address = args[1]
        if not isinstance(address, tuple) or not is_loopback(address[0]):
            raise OSError("Demo harness blocks external provider connections")
    if event == "socket.sendto":
        address = args[-1]
        if not isinstance(address, tuple) or not is_loopback(address[0]):
            raise OSError("Demo harness blocks external datagrams")


sys.addaudithook(local_network_only)
sqlite3.register_adapter(UUID, lambda value: value.hex)

from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import event, select

from api.v1 import auth, crops, crops_field, dashboard, fields, legal, user, weather
from db import AsyncSessionLocal, engine, init_db
from db.schema import Crop, Device, Field, FieldCrop, Telemetry, User
from services.field_geometry_service import field_geometry
from services.user_service import UserService


@event.listens_for(engine.sync_engine, "connect")
def configure_sqlite(connection, _record):
    connection.create_function(
        "date_trunc", 2,
        lambda precision, value: str(value)[:16] + ":00" if precision == "minute" else value,
    )
    connection.execute("PRAGMA foreign_keys=ON")


@asynccontextmanager
async def lifespan(_app):
    await init_db()
    async with AsyncSessionLocal() as session:
        service = UserService(session)
        owner = await service.get_user_by_username(USERNAME)
        if owner is None:
            owner = await service.create_user(
                USERNAME, "demo-local@example.invalid", PASSWORD, True, True,
            )
        if await service.get_user_by_username(NEW_USERNAME) is None:
            await service.create_user(
                NEW_USERNAME, "demo-new@example.invalid", PASSWORD, True, True,
            )
        existing = await session.execute(select(Field).where(Field.user_id == owner.id))
        if existing.first() is None:
            boundary = [
                {"lat": 41.6000, "lon": 0.6170},
                {"lat": 41.6000, "lon": 0.6180},
                {"lat": 41.6010, "lon": 0.6180},
                {"lat": 41.6010, "lon": 0.6170},
            ]
            area, latitude, longitude = field_geometry(boundary)
            field = Field(
                user_id=owner.id, name="Hort de demostració", location="Lleida · dades fictícies",
                lat=latitude, lon=longitude, field_type="open_field", soil_type="loam",
                size_m2=area, boundary=boundary, excluded_zones=[],
            )
            session.add(field)
            await session.flush()
            device = Device(
                id="DEMO-SENSOR-001", field_id=field.id, brand="Demo", serial_number="LOCAL-001",
                battery_status=True,
            )
            session.add(device)
            await session.flush()
            now = datetime.now(UTC).replace(tzinfo=None, second=0, microsecond=0)
            for index in range(24):
                session.add(Telemetry(
                    device_id=device.id, timestamp=now - timedelta(minutes=5 * (23-index)),
                    air_temperature_c=18 + index / 10,
                    air_humidity_percent=63-index/3,
                    soil_moisture_percent=42+index/8,
                    light_intensity_lux=8000+100*index,
                ))
            crop = await session.scalar(select(Crop).where(Crop.name == "Tomàquet (demo)"))
            if crop is None:
                crop = Crop(name="Tomàquet (demo)", scientific_name="Solanum lycopersicum", category="Hortalissa")
                session.add(crop)
                await session.flush()
            session.add(FieldCrop(field_id=field.id, crop_id=crop.id, status="planted", planted_at=now.date()))
            await session.commit()
    yield
    await engine.dispose()


app = FastAPI(title="AgriTwin local dummy-data preview", lifespan=lifespan, docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8081", "http://localhost:8081"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)


@app.middleware("http")
async def identify_preview(request: Request, call_next):
    if request.url.path == "/api/v1/token":
        await asyncio.sleep(getattr(app.state, "login_delay_ms", 0) / 1000)
    response = await call_next(request)
    response.headers["X-AgriTwin-Preview"] = "dummy-data-local-only"
    response.headers["Cache-Control"] = "no-store"
    return response


# Real auth, fields, crops, dashboard, profiles, and legal routes.
app.include_router(crops_field.router, prefix="/api/v1/crops")
for module in [auth, fields, crops, dashboard, user, legal, weather]:
    app.include_router(module.router, prefix="/api/v1")

# Resolve addresses deterministically in memory. Nothing reaches a geocoder.
fields.lookup_location = lambda query: ({"lat": 41.6005, "lon": 0.6175, "label": "Lleida · ubicació de demostració"} if query.strip() else None)
fields.reverse_location = lambda lat, lon: {"lat": lat, "lon": lon, "label": "Lleida · ubicació de demostració"}


def forecast(latitude=41.6005, longitude=0.6175, *, field_id=None, name="Lleida · demo", units="metric", lang="ca", days=5):
    now = datetime.now(UTC).replace(second=0, microsecond=0)
    condition = {"code": 800, "main": "Clear", "description": "Cel serè · dades de demostració", "icon": "01d"}
    return {
        "units": units, "lang": lang, "fetched_at": now,
        "location": {"field_id": field_id, "name": name, "country": "ES", "latitude": latitude, "longitude": longitude, "timezone_offset": 3600},
        "current": {"observed_at": now, "temperature": 20.3, "feels_like": 20, "humidity": 55, "pressure": 1015, "clouds": 10, "condition": condition, "wind": {"speed": 8, "direction_deg": 120}},
        "daily": [{"date": (now+timedelta(days=index)).date(), "temp_min": 9+index, "temp_max": 21+index, "rain_probability": 0.1, "rain_mm": 0, "condition": condition, "wind": {"speed": 8, "direction_deg": 120}} for index in range(days)],
        "hourly": [{"time": now+timedelta(hours=index), "temperature": 20+index/10, "rain_probability": 0.1, "condition": condition} for index in range(12)],
        "current_alerts": [], "alerts": [],
    }


async def owned_field(field_id, owner):
    async with AsyncSessionLocal() as session:
        field = await session.scalar(select(Field).where(Field.id == field_id, Field.user_id == owner.id))
        if field is None:
            raise HTTPException(status_code=404, detail="Field not found")
        return field


class LocalFieldWeather:
    async def get_forecast(self, field_id, *, username, units="metric", lang=None, days=5):
        async with AsyncSessionLocal() as session:
            field = await session.scalar(select(Field).join(User).where(Field.id == field_id, User.username == username))
            if field is None:
                raise HTTPException(status_code=404, detail="Field not found")
            return forecast(field.lat or 41.6005, field.lon or 0.6175, field_id=field.id, name=field.name, units=units, lang=lang or "ca", days=days)


class LocalWeather:
    async def get_forecast(self, latitude, longitude, **kwargs):
        return forecast(latitude, longitude, **kwargs)

    async def get_forecast_for_city(self, city, country=None, **kwargs):
        return forecast(name=f"{city} · demo", **kwargs)


app.dependency_overrides[weather.get_field_weather_service] = lambda: LocalFieldWeather()
app.dependency_overrides[weather.get_weather_service] = lambda: LocalWeather()


@app.get("/api/v1/tasks")
async def demo_tasks(field_id: int, current_user: User = Depends(auth.get_current_user)):
    field = await owned_field(field_id, current_user)
    return {"today": datetime.now(UTC).date(), "has_sensors": field.id == 1, "refresh": False, "tasks": [], "recommendations": []}


@app.get("/api/v1/anunces/count")
async def empty_count():
    return {"total": 0}


@app.get("/api/v1/anunces")
async def empty_catalog():
    return []


@app.get("/ping")
async def ping():
    return {"preview": "dummy-data-local-only", "external_provider_calls": "blocked"}


def grid_png():
    def chunk(kind, value):
        return struct.pack(">I", len(value)) + kind + value + struct.pack(">I", zlib.crc32(kind+value))
    rows = []
    for y in range(256):
        row = bytearray([0])
        for x in range(256):
            color = (199, 208, 187) if x % 32 == 0 or y % 32 == 0 else (229, 235, 219)
            row.extend(color)
        rows.append(bytes(row))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB",256,256,8,2,0,0,0)) + chunk(b"IDAT", zlib.compress(b"".join(rows))) + chunk(b"IEND", b"")


TILE = grid_png()


@app.get("/preview/tiles/{z}/{x}/{y}.png")
async def preview_tile(z: int, x: int, y: int):
    return Response(content=TILE, media_type="image/png")


# Public catalogue fixtures only; checkout/payment endpoints remain absent.
DEMO_PRODUCTS = [{"id": n, "product": ["Tomàquet", "Enciam", "Carbassó"][n % 3] + f" · demo {n}",
                  "tecnical_name": "Producte de demostració", "price": 2.5, "price_per_kg": 2.5,
                  "left_units": 10, "image_url": None} for n in range(1, 16)]


@app.get("/api/v1/conte_mercat/count")
async def market_count():
    return {"total": len(DEMO_PRODUCTS)}


@app.get("/api/v1/conte_mercat/search")
async def market_search(product: str = ""):
    return [item for item in DEMO_PRODUCTS if product.casefold() in item["product"].casefold()]


@app.get("/api/v1/conte_mercat/{product_id}")
async def market_product(product_id: int):
    item = next((p for p in DEMO_PRODUCTS if p["id"] == product_id), None)
    if item is None:
        raise HTTPException(404, "Demo product not found")
    return item


@app.get("/api/v1/conte_mercat")
async def market_list(offset: int = 0, limit: int = 5):
    return DEMO_PRODUCTS[max(0, offset):max(0, offset) + min(50, max(0, limit))]


def self_test():
    from fastapi.testclient import TestClient
    import socket
    with TestClient(app) as client:
        assert client.get("/ping").status_code == 200
        assert client.get("/api/v1/fields").status_code == 401
        login = client.post("/api/v1/token", data={"username": USERNAME, "password": PASSWORD})
        assert login.status_code == 200, login.text
        headers = {"Authorization": "Bearer " + login.json()["access_token"]}
        listed = client.get("/api/v1/fields", headers=headers)
        assert listed.status_code == 200 and listed.json(), listed.text
        field_id = listed.json()[0]["id"]
        for path in ["/api/v1/me", f"/api/v1/fields/{field_id}", f"/api/v1/weather/fields/{field_id}", f"/api/v1/crops/field-crops?field_id={field_id}", f"/api/v1/dashboard?field_id={field_id}", f"/api/v1/tasks?field_id={field_id}", "/api/v1/geocode?q=Lleida"]:
            response = client.get(path, headers=headers)
            assert response.status_code == 200, (path, response.status_code, response.text)
        data = client.get(f"/api/v1/dashboard?field_id={field_id}", headers=headers).json()
        assert data["latest"] and len(data["history"]) == 24, data
        new_login = client.post("/api/v1/token", data={"username": NEW_USERNAME, "password": PASSWORD})
        new_headers = {"Authorization": "Bearer " + new_login.json()["access_token"]}
        assert client.get(f"/api/v1/fields/{field_id}", headers=new_headers).status_code == 404
        created = client.post("/api/v1/fields", headers=new_headers, json={"name": "Self-test garden", "location": "Lleida · demo", "lat": 41.6005, "lon": 0.6175, "field_type": "home_garden", "soil_type": "loam", "size_m2": 20})
        assert created.status_code == 200, created.text
        assert client.delete(f"/api/v1/fields/{created.json()['id']}", headers=new_headers).status_code == 200
        assert client.get("/preview/tiles/16/1/1.png").content.startswith(b"\x89PNG")
    try:
        socket.getaddrinfo("example.invalid", 443)
    except OSError as error:
        assert "blocks external" in str(error)
    else:
        raise AssertionError("External DNS was not blocked")
    assert not any(name in os.environ for name in ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "STRIPE_SECRET_KEY", "GEMINI_API_KEY", "OPENWEATHER_API_KEY", "AWS_ACCESS_KEY_ID"])
    print("PASS: real auth/fields/dashboard/crops with local dummy records; local weather/geocode; owner isolation; field creation/deletion; external DNS blocked; no provider credentials")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--login-delay-ms", type=int, default=0)
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        import uvicorn
        app.state.login_delay_ms = max(0, args.login_delay_ms)
        print(f"Local demo only: {USERNAME} / {PASSWORD}; empty-field account: {NEW_USERNAME}")
        uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")
