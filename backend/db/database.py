import os

from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from supabase import Client, create_client

from db.schema import Base

load_dotenv()

PRODUCTION = os.getenv("PRODUCTION") == "True"

if PRODUCTION:
    DATABASE_URL = os.getenv("EXTERN_DATABASE_URL")
else:
    DATABASE_URL = os.getenv("LOCAL_DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no està configurat. Revisa el teu .env")
url = make_url(DATABASE_URL)
url = url.difference_update_query(["pgbouncer"])
engine = create_async_engine(
    url,
    pool_pre_ping=True,
    connect_args={
        "statement_cache_size": 0,
    },
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")
# print("URL:", SUPABASE_URL) debug
# print("KEY:", None if not SUPABASE_KEY else (len(SUPABASE_KEY), SUPABASE_KEY[:8], SUPABASE_KEY[-4:])) debug
# Initialize Supabase client if credentials exist
if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None
    print("[WARNING] Supabase credentials not found in .env")


def save_telemetry(payload: dict):
    """Function to save MQTT data directly to Supabase"""
    if not supabase:
        print("[DATABASE-ERROR] Cannot save data. Supabase client is not configured.")
        return

    try:
        device_id = payload.get("device_id")
        timestamp = payload.get("timestamp")
        sensors = payload.get("sensors", {})

        # NOTE: Ensure these keys match the exact column names in Supabase
        data_to_insert = {
            "device_id": device_id,
            "timestamp": timestamp,
            "air_temperature_c": sensors.get("air_temperature_c"),
            "air_humidity_percent": sensors.get("air_humidity_percent"),
            "soil_moisture_percent": sensors.get("soil_moisture_percent"),
            "light_intensity_lux": sensors.get("light_intensity_lux"),
        }

        # Insert data into the 'telemetry' table
        supabase.table("telemetry").insert(data_to_insert).execute()
        print(f"[DATABASE-SUCCESS] Telemetry data from {device_id} saved to Supabase!")

    except Exception as e:
        print(f"[DATABASE-ERROR] Error saving telemetry: {e}")


def get_devices_status() -> dict[str, bool]:
    """Returns {device_id: battery_status} for every device registered in Supabase."""
    if not supabase:
        print("[DATABASE-ERROR] Cannot read devices. Supabase client is not configured.")
        return {}

    try:
        response = supabase.table("devices").select("id, battery_status").execute()
        return {row["id"]: bool(row["battery_status"]) for row in response.data}

    except Exception as e:
        print(f"[DATABASE-ERROR] Error reading devices: {e}")
        return {}


def set_device_battery_status(device_id: str, status: bool) -> bool:
    """Updates devices.battery_status for one device. Returns True when the update worked."""
    if not supabase:
        print("[DATABASE-ERROR] Cannot update device. Supabase client is not configured.")
        return False

    try:
        supabase.table("devices").update({"battery_status": status}).eq("id", device_id).execute()
        return True

    except Exception as e:
        print(f"[DATABASE-ERROR] Error updating battery status of {device_id}: {e}")
        return False
