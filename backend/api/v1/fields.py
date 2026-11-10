import json
import math

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from pydantic import Field as PydanticField
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from starlette.concurrency import run_in_threadpool

from api.v1.auth import get_current_user
from db import AsyncSessionLocal, User
from services.field_geometry_service import BORDER_FIELD_TYPES, MAX_AREA, field_geometry
from services.geocode_service import lookup_location, reverse_location


class BoundaryPoint(BaseModel):
    lat: float = PydanticField(ge=-90, le=90, allow_inf_nan=False, strict=True)
    lon: float = PydanticField(ge=-180, le=180, allow_inf_nan=False, strict=True)


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
    boundary: list[BoundaryPoint] | None = None
    excluded_zones: list[list[BoundaryPoint]] = PydanticField(default_factory=list)
    devices_online: int = 0


class FieldCreate(BaseModel):
    boundary: list[BoundaryPoint] | None = PydanticField(default=None, max_length=200)
    excluded_zones: list[list[BoundaryPoint]] = PydanticField(default_factory=list, max_length=20)
    name: str
    location: str | None = PydanticField(default=None, max_length=255)
    lat: float | None = None
    lon: float | None = None
    field_type: str | None = None
    soil_type: str | None = None
    size_m2: float | None = None


class FieldUpdate(BaseModel):
    boundary: list[BoundaryPoint] | None = PydanticField(default=None, max_length=200)
    excluded_zones: list[list[BoundaryPoint]] = PydanticField(default_factory=list, max_length=20)
    name: str
    location: str | None = PydanticField(default=None, max_length=255)
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
    "fields.field_type, fields.soil_type, fields.size_m2, fields.boundary, fields.excluded_zones"
)
SELECT_PREFIX = "SELECT "
FIELD_NOT_FOUND = "Field not found"
DEVICE_NOT_FOUND = "Device not found"
DEVICE_CONFLICT = "This device is already registered"
DEVICE_COUNTS = (
    ", COUNT(devices.id) AS device_count, "
    "COALESCE(SUM(CASE WHEN devices.battery_status IS TRUE THEN 1 ELSE 0 END), 0) "
    "AS devices_online "
)
HTTP_400 = {400: {"description": "Invalid request"}}
HTTP_404 = {404: {"description": "Not found"}}
HTTP_409 = {409: {"description": "Conflict"}}


class FieldAccessError(Exception):
    pass


def _read_boundary(value):
    return json.loads(value) if isinstance(value, str) else value


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
        boundary=_read_boundary(getattr(row, "boundary", None)),
        excluded_zones=_read_boundary(getattr(row, "excluded_zones", None)) or [],
        devices_online=int(getattr(row, "devices_online", 0) or 0),
    )


def _clean_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned:
        raise ValueError("Name is required")
    return cleaned


def _clean_coords(
    lat: float | None,
    lon: float | None,
) -> tuple[float | None, float | None]:
    if lat is None and lon is None:
        return None, None
    if lat is None or lon is None:
        raise ValueError("Latitude and longitude must be sent together")
    if not math.isfinite(lat) or lat < -90 or lat > 90:
        raise ValueError("Latitude is invalid")
    if not math.isfinite(lon) or lon < -180 or lon > 180:
        raise ValueError("Longitude is invalid")
    return lat, lon


def _clean_size(size_m2: float | None) -> float | None:
    if size_m2 is None:
        return None
    if not math.isfinite(size_m2) or size_m2 < 0.01 or size_m2 > MAX_AREA:
        raise ValueError("Size must be positive and below 100000000 square metres")
    return size_m2


async def _load_field(session, field_id: int, user_id) -> FieldRead:
    read = await session.execute(
        text(
            SELECT_PREFIX + FIELD_COLUMNS + DEVICE_COUNTS +
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


@router.get("/geocode", responses=HTTP_404)
async def geocode_location(
    q: str = "",
    current_user: User = Depends(get_current_user),
) -> dict:
    _ = current_user
    result = await run_in_threadpool(lookup_location, q)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")
    return result


@router.get("/reverse-geocode", responses=HTTP_404)
async def reverse_geocode_location(
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
    current_user: User = Depends(get_current_user),
) -> dict:
    _ = current_user
    result = await run_in_threadpool(reverse_location, lat, lon)
    if not result:
        raise HTTPException(status_code=404, detail="Address not found for this location")
    return result


@router.get("/fields")
async def list_fields(
    current_user: User = Depends(get_current_user),
) -> list[FieldRead]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                SELECT_PREFIX + FIELD_COLUMNS + DEVICE_COUNTS +
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


@router.post("/fields", responses=HTTP_400)
async def create_field(
    body: FieldCreate,
    current_user: User = Depends(get_current_user),
) -> FieldRead:
    try:
        name = _clean_name(body.name)
        lat, lon = _clean_coords(body.lat, body.lon)
        size_m2 = _clean_size(body.size_m2)
        boundary = None
        excluded_zones = [[p.model_dump() for p in zone] for zone in body.excluded_zones]
        if excluded_zones and body.boundary is None:
            raise ValueError("Exclusions require a field boundary")
        if body.boundary is not None:
            if body.field_type not in BORDER_FIELD_TYPES:
                raise ValueError("This field type does not support a boundary")
            boundary = [point.model_dump() for point in body.boundary]
            size_m2, lat, lon = field_geometry(boundary, excluded_zones)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "INSERT INTO fields (user_id, name, location, lat, lon, "
                "field_type, soil_type, size_m2, boundary, excluded_zones) "
                "VALUES (:user_id, :name, :location, :lat, :lon, "
                ":field_type, :soil_type, :size_m2, :boundary, :excluded_zones) "
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
                "boundary": json.dumps(boundary) if boundary is not None else None,
                "excluded_zones": json.dumps(excluded_zones),
            },
        )
        created = result.one()
        await session.commit()
        return await _load_field(session, created.id, current_user.id)


@router.get("/fields/{field_id}", responses=HTTP_404)
async def get_field(
    field_id: int,
    current_user: User = Depends(get_current_user),
) -> FieldDetailRead:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                SELECT_PREFIX + FIELD_COLUMNS + " FROM fields "
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
            raise HTTPException(status_code=404, detail=FIELD_NOT_FOUND)

        devices_result = await session.execute(
            text(
                SELECT_PREFIX + "id, battery_status, brand, serial_number "
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
        boundary=_read_boundary(getattr(row, "boundary", None)),
        excluded_zones=_read_boundary(getattr(row, "excluded_zones", None)) or [],
        devices_online=sum(1 for device in devices if device.battery_status),
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
            SELECT_PREFIX
            + "fields.id FROM fields WHERE fields.id = :field_id AND fields.user_id = :user_id"
        ),
        {"field_id": field_id, "user_id": user_id},
    )
    if result.one_or_none() is None:
        raise FieldAccessError()


@router.post(
    "/fields/{field_id}/devices",
    responses=HTTP_400 | HTTP_404 | HTTP_409,
)
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
        try:
            await _require_owned_field(session, field_id, current_user.id)
        except FieldAccessError:
            raise HTTPException(status_code=404, detail=FIELD_NOT_FOUND) from None
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
                detail=DEVICE_CONFLICT,
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


@router.put(
    "/fields/{field_id}/devices/{device_id}",
    responses=HTTP_400 | HTTP_404 | HTTP_409,
)
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
        try:
            await _require_owned_field(session, field_id, current_user.id)
        except FieldAccessError:
            raise HTTPException(status_code=404, detail=FIELD_NOT_FOUND) from None
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
                raise HTTPException(status_code=404, detail=DEVICE_NOT_FOUND)
            await session.commit()
        except IntegrityError:
            await session.rollback()
            raise HTTPException(
                status_code=409,
                detail=DEVICE_CONFLICT,
            ) from None

    return FieldDeviceRead(
        id=row.id,
        battery_status=bool(row.battery_status),
        brand=row.brand,
        serial_number=row.serial_number,
    )


@router.delete(
    "/fields/{field_id}/devices/{device_id}",
    responses=HTTP_404,
)
async def delete_device(
    field_id: int,
    device_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    async with AsyncSessionLocal() as session:
        try:
            await _require_owned_field(session, field_id, current_user.id)
        except FieldAccessError:
            raise HTTPException(status_code=404, detail=FIELD_NOT_FOUND) from None
        result = await session.execute(
            text("DELETE FROM devices WHERE id = :id AND field_id = :field_id RETURNING id"),
            {"id": device_id, "field_id": field_id},
        )
        deleted = result.one_or_none()
        if not deleted:
            raise HTTPException(status_code=404, detail=DEVICE_NOT_FOUND)
        await session.commit()

    return {"ok": True}


@router.put("/fields/{field_id}", responses=HTTP_400 | HTTP_404)
async def update_field(
    field_id: int,
    body: FieldUpdate,
    current_user: User = Depends(get_current_user),
) -> FieldRead:
    try:
        name = _clean_name(body.name)
        size_m2 = _clean_size(body.size_m2)
        geometry_sent = "boundary" in body.model_fields_set
        excluded_zones = [[p.model_dump() for p in zone] for zone in body.excluded_zones]
        if excluded_zones and body.boundary is None:
            raise ValueError("Exclusions require a field boundary")
        boundary = [p.model_dump() for p in body.boundary] if body.boundary is not None else None
        coordinates = ""
        parameters = {
            "name": name,
            "location": body.location,
            "field_type": body.field_type,
            "soil_type": body.soil_type,
            "size_m2": size_m2,
            "field_id": field_id,
            "user_id": current_user.id,
        }
        if boundary is not None:
            if body.field_type not in BORDER_FIELD_TYPES:
                raise ValueError("This field type does not support a boundary")
            size_m2, lat, lon = field_geometry(boundary, excluded_zones)
            parameters.update(size_m2=size_m2, lat=lat, lon=lon)
            coordinates = "lat = :lat, lon = :lon, "
        if geometry_sent:
            geometry = "boundary = :boundary, excluded_zones = :excluded_zones, "
            parameters.update(
                boundary=json.dumps(boundary) if boundary is not None else None,
                excluded_zones=json.dumps(excluded_zones),
            )
        else:
            geometry = (
                "boundary = CASE WHEN field_type = :field_type AND size_m2 = :size_m2 THEN boundary ELSE NULL END, "
                "excluded_zones = CASE WHEN field_type = :field_type AND size_m2 = :size_m2 THEN excluded_zones ELSE NULL END, "
            )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "UPDATE fields SET "
                + geometry
                + coordinates
                + "name = :name, location = :location, field_type = :field_type, "
                "soil_type = :soil_type, size_m2 = :size_m2 "
                "WHERE fields.id = :field_id AND fields.user_id = :user_id RETURNING fields.id"
            ),
            parameters,
        )
        if result.one_or_none() is None:
            raise HTTPException(status_code=404, detail=FIELD_NOT_FOUND)
        await session.commit()
        return await _load_field(session, field_id, current_user.id)
