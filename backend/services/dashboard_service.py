from uuid import UUID

from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.dashboard import DashboardResponse, Reading

HISTORY_LIMIT = 50


class DashboardService:
    def __init__(self, session: AsyncSession):
        self._db = session

    async def get_dashboard(
        self,
        user_id: UUID,
        field_id: int | None = None,
    ) -> DashboardResponse:
        # 1. Obtenir un camp de l'usuari.
        if field_id is None:
            result = await self._db.execute(
                text(
                    """
                    SELECT id, name
                    FROM fields
                    WHERE user_id = :user_id
                    ORDER BY id
                    LIMIT 1
                    """
                ),
                {"user_id": user_id},
            )
        else:
            result = await self._db.execute(
                text(
                    """
                    SELECT id, name
                    FROM fields
                    WHERE user_id = :user_id
                      AND id = :field_id
                    """
                ),
                {
                    "user_id": user_id,
                    "field_id": field_id,
                },
            )

        field = result.first()

        if field is None:
            return DashboardResponse(
                field_name=None,
                device_ids=[],
                latest=None,
                history=[],
            )

        # 2. Obtenir els dispositius del camp.
        result = await self._db.execute(
            text(
                """
                SELECT id
                FROM devices
                WHERE field_id = :field_id
                ORDER BY id
                """
            ),
            {"field_id": field.id},
        )

        device_ids = [row.id for row in result.all()]

        if not device_ids:
            return DashboardResponse(
                field_name=field.name,
                device_ids=[],
                latest=None,
                history=[],
            )

        # 3. Obtenir les lectures agrupades per minut.
        query = text(
            """
            SELECT
                date_trunc('minute', timestamp) AS timestamp,
                AVG(air_temperature_c) AS air_temperature_c,
                AVG(air_humidity_percent) AS air_humidity_percent,
                AVG(soil_moisture_percent) AS soil_moisture_percent,
                AVG(light_intensity_lux) AS light_intensity_lux
            FROM telemetry
            WHERE device_id IN :device_ids
            GROUP BY date_trunc('minute', timestamp)
            ORDER BY timestamp DESC
            LIMIT :limit
            """
        ).bindparams(bindparam("device_ids", expanding=True))

        result = await self._db.execute(
            query,
            {
                "device_ids": device_ids,
                "limit": HISTORY_LIMIT,
            },
        )

        rows = result.all()

        # La consulta retorna de més recent a més antiga.
        # Invertim l'ordre per tenir l'historial cronològic.
        history = [
            Reading(
                timestamp=row.timestamp,
                temperature=float(getattr(row, "air_temperature_c", None) or 0),
                air_humidity=float(getattr(row, "air_humidity_percent", None) or 0),
                soil_humidity=float(getattr(row, "soil_moisture_percent", None) or 0),
                light=float(getattr(row, "light_intensity_lux", None) or 0),
            )
            for row in reversed(rows)
        ]

        latest = history[-1] if history else None

        return DashboardResponse(
            field_name=field.name,
            device_ids=device_ids,
            latest=latest,
            history=history,
        )
