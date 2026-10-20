from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from api.v1.auth import get_current_user
from db import AsyncSessionLocal, User


class FieldRead(BaseModel):
    id: int
    name: str
    location: str | None
    field_type: str | None
    soil_type: str | None
    size_m2: float | None
    device_count: int


class FieldUpdate(BaseModel):
    name: str
    location: str | None = None
    field_type: str | None = None
    soil_type: str | None = None
    size_m2: float | None = None


class FieldDeviceRead(BaseModel):
    id: str
    battery_status: bool


class FieldDetailRead(FieldRead):
    devices: list[FieldDeviceRead]


router = APIRouter()


def _read_field(row) -> FieldRead:
    return FieldRead(
        id=row.id,
        name=row.name,
        location=row.location,
        field_type=row.field_type,
        soil_type=row.soil_type,
        size_m2=row.size_m2,
        device_count=int(row.device_count),
    )


@router.get("/fields")
async def list_fields(
    current_user: User = Depends(get_current_user),
) -> list[FieldRead]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "SELECT fields.id, fields.name, fields.location, "
                "fields.field_type, fields.soil_type, fields.size_m2, "
                "COUNT(devices.id) AS device_count "
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


@router.get("/fields/{field_id}")
async def get_field(
    field_id: int,
    current_user: User = Depends(get_current_user),
) -> FieldDetailRead:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text(
                "SELECT fields.id, fields.name, fields.location, "
                "fields.field_type, fields.soil_type, fields.size_m2 "
                "FROM fields "
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
            text("SELECT id, battery_status FROM devices WHERE field_id = :field_id ORDER BY id"),
            {"field_id": field_id},
        )
        devices = devices_result.all()

    return FieldDetailRead(
        id=row.id,
        name=row.name,
        location=row.location,
        field_type=row.field_type,
        soil_type=row.soil_type,
        size_m2=row.size_m2,
        device_count=len(devices),
        devices=[
            FieldDeviceRead(
                id=device.id,
                battery_status=bool(device.battery_status),
            )
            for device in devices
        ],
    )


@router.put("/fields/{field_id}")
async def update_field(
    field_id: int,
    body: FieldUpdate,
    current_user: User = Depends(get_current_user),
) -> FieldRead:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

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
                "size_m2": body.size_m2,
                "field_id": field_id,
                "user_id": current_user.id,
            },
        )
        updated = result.one_or_none()
        if not updated:
            raise HTTPException(status_code=404, detail="Field not found")

        await session.commit()

        read = await session.execute(
            text(
                "SELECT fields.id, fields.name, fields.location, "
                "fields.field_type, fields.soil_type, fields.size_m2, "
                "COUNT(devices.id) AS device_count "
                "FROM fields "
                "LEFT JOIN devices ON devices.field_id = fields.id "
                "WHERE fields.id = :field_id AND "
                "fields.user_id = :user_id "
                "GROUP BY fields.id"
            ),
            {
                "field_id": field_id,
                "user_id": current_user.id,
            },
        )
        row = read.one()

    return _read_field(row)
