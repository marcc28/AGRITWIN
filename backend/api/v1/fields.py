from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from api.v1.auth import get_current_user
from db import AsyncSessionLocal, User
from services.geocode_service import lookup_location


class FieldRead(BaseModel):
    id: int
    name: str
    location: str | None
    lat: float | None
    lon: float | None
    field_type: str | None
    soil_type: str | None
    size_m2: float | None
    device_count: int


class FieldCreate(BaseModel):
    name: str
    location: str | None = None
    lat: float | None = None
    lon: float | None = None
    field_type: str | None = None
    soil_type: str | None = None
    size_m2: float | None = None


class FieldUpdate(BaseModel):
    name: str
    location: str | None = None
    field_type: str | None = None
    soil_type: str | None = None
    size_m2: float | None = None


class FieldDeviceRead(BaseModel):
    id: str
    battery_status: bool
    brand: str | None = None
    serial_number: str | None = None


class DeviceCreate(BaseModel):
    id: str
    brand: str
    serial_number: str


class FieldDetailRead(FieldRead):
    devices: list[FieldDeviceRead]


router = APIRouter()

FIELD_COLUMNS = (
    "fields.id, fields.name, fields.location, fields.lat, fields.lon, "
    "fields.field_type, fields.soil_type, fields.size_m2"
)


def _read_field(row) -> FieldRead:
    return FieldRead(
        id=row.id,
        name=row.name,
        location=row.location,
        lat=row.lat,
        lon=row.lon,
        field_type=row.field_type,
        soil_type=row.soil_type,
        size_m2=row.size_m2,
        device_count=int(row.device_count),
    )


def _clean_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Name is required")
    return cleaned


def _clean_coords(
    lat: float | None,
    lon: float | None,
) -> tuple[float | None, float | None]:
    if lat is None and lon is None:
        return None, None
    if lat is None or lon is None:
        raise HTTPException(
            status_code=400,
            detail="Latitude and longitude must be sent together",
        )
    if lat < -90 or lat > 90:
        raise HTTPException(status_code=400, detail="Latitude is invalid")
    if lon < -180 or lon > 180:
        raise HTTPException(status_code=400, detail="Longitude is invalid")
    return lat, lon


def _clean_size(size_m2: float | None) -> float | None:
    if size_m2 is None:
        return None
    if size_m2 <= 0:
        raise HTTPException(status_code=400, detail="Size must be greater than 0")
    return size_m2


async def _load_field(session, field_id: int, user_id) -> FieldRead:
    read = await session.execute(
        text(
            "SELECT " + FIELD_COLUMNS + ", COUNT(devices.id) AS device_count "
            "FROM fields "
            "LEFT JOIN devices ON devices.field_id = fields.id "
            "WHERE fields.id = :field_id AND "
            "fields.user_id = :user_id "
            "GROUP BY fields.id"
        ),
        {
            "field_id": field_id,
            "user_id": user_id,
        },
    )
    return _read_field(read.one())


@router.get("/geocode")
async def geocode_location(
    q: str = "",
    current_user: User = Depends(get_current_user),
) -> dict:
    _ = current_user
    result = lookup_location(q)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")
    return result


@router.get("/fields")
async def list_fields(
    current_user: User = Depends(get_current_user),
) -> list[FieldRead]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "SELECT " + FIELD_COLUMNS + ", COUNT(devices.id) AS device_count "
                "FROM fields "
                "LEFT JOIN devices ON devices.field_id = fields.id "
                "WHERE fields.user_id = :user_id "
                "GROUP BY fields.id "
                "ORDER BY fields.id"
            ),
            {"user_id": current_user.id},
        )
        rows = result.all()

    return [_read_field(row) for row in rows]


@router.post("/fields")
async def create_field(
    body: FieldCreate,
    current_user: User = Depends(get_current_user),
) -> FieldRead:
    name = _clean_name(body.name)
    lat, lon = _clean_coords(body.lat, body.lon)
    size_m2 = _clean_size(body.size_m2)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "INSERT INTO fields (user_id, name, location, lat, lon, "
                "field_type, soil_type, size_m2) "
                "VALUES (:user_id, :name, :location, :lat, :lon, "
                ":field_type, :soil_type, :size_m2) "
                "RETURNING fields.id"
            ),
            {
                "user_id": current_user.id,
                "name": name,
                "location": body.location,
                "lat": lat,
                "lon": lon,
                "field_type": body.field_type,
                "soil_type": body.soil_type,
                "size_m2": size_m2,
            },
        )
        created = result.one()
        await session.commit()
        return await _load_field(session, created.id, current_user.id)


@router.get("/fields/{field_id}")
async def get_field(
    field_id: int,
    current_user: User = Depends(get_current_user),
) -> FieldDetailRead:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "SELECT " + FIELD_COLUMNS + " FROM fields "
                "WHERE fields.id = :field_id AND "
                "fields.user_id = :user_id"
            ),
            {
                "field_id": field_id,
                "user_id": current_user.id,
            },
        )
        row = result.one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Field not found")

        devices_result = await session.execute(
            text(
                "SELECT id, battery_status, brand, serial_number "
                "FROM devices WHERE field_id = :field_id ORDER BY id"
            ),
            {"field_id": field_id},
        )
        devices = devices_result.all()

    return FieldDetailRead(
        id=row.id,
        name=row.name,
        location=row.location,
        lat=row.lat,
        lon=row.lon,
        field_type=row.field_type,
        soil_type=row.soil_type,
        size_m2=row.size_m2,
        device_count=len(devices),
        devices=[
            FieldDeviceRead(
                id=device.id,
                battery_status=bool(device.battery_status),
                brand=device.brand,
                serial_number=device.serial_number,
            )
            for device in devices
        ],
    )


async def _require_owned_field(session, field_id: int, user_id) -> None:
    result = await session.execute(
        text(
            "SELECT fields.id FROM fields WHERE fields.id = :field_id AND fields.user_id = :user_id"
        ),
        {"field_id": field_id, "user_id": user_id},
    )
    if result.one_or_none() is None:
        raise HTTPException(status_code=404, detail="Field not found")


@router.post("/fields/{field_id}/devices")
async def create_device(
    field_id: int,
    body: DeviceCreate,
    current_user: User = Depends(get_current_user),
) -> FieldDeviceRead:
    device_id = body.id.strip()
    brand = body.brand.strip()
    serial = body.serial_number.strip()
    if not device_id or not brand or not serial:
        raise HTTPException(
            status_code=400,
            detail="Device id, brand and serial number are required",
        )

    async with AsyncSessionLocal() as session:
        await _require_owned_field(session, field_id, current_user.id)
        try:
            await session.execute(
                text(
                    "INSERT INTO devices (id, field_id, brand, serial_number) "
                    "VALUES (:id, :field_id, :brand, :serial_number)"
                ),
                {
                    "id": device_id,
                    "field_id": field_id,
                    "brand": brand,
                    "serial_number": serial,
                },
            )
            await session.commit()
        except IntegrityError:
            await session.rollback()
            raise HTTPException(
                status_code=409,
                detail="This device is already registered",
            ) from None

    return FieldDeviceRead(
        id=device_id,
        battery_status=False,
        brand=brand,
        serial_number=serial,
    )


class DeviceUpdate(BaseModel):
    brand: str
    serial_number: str


@router.put("/fields/{field_id}/devices/{device_id}")
async def update_device(
    field_id: int,
    device_id: str,
    body: DeviceUpdate,
    current_user: User = Depends(get_current_user),
) -> FieldDeviceRead:
    brand = body.brand.strip()
    serial = body.serial_number.strip()
    if not brand or not serial:
        raise HTTPException(
            status_code=400,
            detail="Device brand and serial number are required",
        )

    async with AsyncSessionLocal() as session:
        await _require_owned_field(session, field_id, current_user.id)
        try:
            result = await session.execute(
                text(
                    "UPDATE devices SET brand = :brand, "
                    "serial_number = :serial_number "
                    "WHERE id = :id AND field_id = :field_id "
                    "RETURNING id, battery_status, brand, serial_number"
                ),
                {
                    "brand": brand,
                    "serial_number": serial,
                    "id": device_id,
                    "field_id": field_id,
                },
            )
            row = result.one_or_none()
            if not row:
                raise HTTPException(status_code=404, detail="Device not found")
            await session.commit()
        except IntegrityError:
            await session.rollback()
            raise HTTPException(
                status_code=409,
                detail="This device is already registered",
            ) from None

    return FieldDeviceRead(
        id=row.id,
        battery_status=bool(row.battery_status),
        brand=row.brand,
        serial_number=row.serial_number,
    )


@router.delete("/fields/{field_id}/devices/{device_id}")
async def delete_device(
    field_id: int,
    device_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    async with AsyncSessionLocal() as session:
        await _require_owned_field(session, field_id, current_user.id)
        result = await session.execute(
            text("DELETE FROM devices WHERE id = :id AND field_id = :field_id RETURNING id"),
            {"id": device_id, "field_id": field_id},
        )
        deleted = result.one_or_none()
        if not deleted:
            raise HTTPException(status_code=404, detail="Device not found")
        await session.commit()

    return {"ok": True}


@router.put("/fields/{field_id}")
async def update_field(
    field_id: int,
    body: FieldUpdate,
    current_user: User = Depends(get_current_user),
) -> FieldRead:
    name = _clean_name(body.name)
    size_m2 = _clean_size(body.size_m2)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "UPDATE fields SET name = :name, location = :location, "
                "field_type = :field_type, soil_type = :soil_type, "
                "size_m2 = :size_m2 "
                "WHERE fields.id = :field_id AND "
                "fields.user_id = :user_id "
                "RETURNING fields.id"
            ),
            {
                "name": name,
                "location": body.location,
                "field_type": body.field_type,
                "soil_type": body.soil_type,
                "size_m2": size_m2,
                "field_id": field_id,
                "user_id": current_user.id,
            },
        )
        updated = result.one_or_none()
        if not updated:
            raise HTTPException(status_code=404, detail="Field not found")

        await session.commit()
        return await _load_field(session, field_id, current_user.id)
