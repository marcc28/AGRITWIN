import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_PATH, override=True)

TELEMETRY_SUPABASE_URL = os.getenv("TELEMETRY_SUPABASE_URL")
TELEMETRY_SUPABASE_KEY = os.getenv("TELEMETRY_SUPABASE_SECRET_KEY")

supabase_telemetry: Client | None = None

if TELEMETRY_SUPABASE_URL and TELEMETRY_SUPABASE_KEY:
    supabase_telemetry = create_client(
        TELEMETRY_SUPABASE_URL,
        TELEMETRY_SUPABASE_KEY,
    )
else:
    print("[WARNING] Telemetry Supabase credentials not found.")

def save_telemetry(payload: dict) -> bool:
    """Desa les lectures dels sensors al Supabase de telemetria."""

    if not supabase_telemetry:
        print(
            "[DATABASE-ERROR] Telemetry Supabase "
            "is not configured."
        )
        return False

    try:
        device_id = payload.get("device_id")
        timestamp = payload.get("timestamp")
        sensors = payload.get("sensors", {})

        if not device_id or not isinstance(sensors, dict):
            print("[DATABASE-ERROR] Invalid telemetry payload.")
            return False
        
        data_to_insert = {
            "device_id": device_id,
            "timestamp": timestamp,
            "air_temperature_c": sensors.get("air_temperature_c"),
            "air_humidity_percent": sensors.get(
                "air_humidity_percent"
            ),
            "soil_moisture_percent": sensors.get(
                "soil_moisture_percent"
            ),
            "light_intensity_lux": sensors.get(
                "light_intensity_lux"
            ),
        }

        supabase_telemetry.table("telemetry").insert(
            data_to_insert
        ).execute()

        print(
            f"[TELEMETRY-SUCCESS] Data from {device_id} saved."
        )
        return True

    except Exception as e:
        print(f"[TELEMETRY-ERROR] Error saving telemetry: {e}")
        return False
