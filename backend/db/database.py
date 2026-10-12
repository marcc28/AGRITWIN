import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from supabase import create_client, Client
from db.schema import Base

load_dotenv()

PRODUCTION = os.getenv("PRODUCTION") == "True"

if PRODUCTION:
    DATABASE_URL = os.getenv("extern_database_URL")
else:
    DATABASE_URL = os.getenv("local_database_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no està configurat. Revisa el teu .env")

engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,
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
#print("URL:", SUPABASE_URL) debug
#print("KEY:", None if not SUPABASE_KEY else (len(SUPABASE_KEY), SUPABASE_KEY[:8], SUPABASE_KEY[-4:])) debug
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
            "temperatura": sensors.get("air_temperature_c"),
            "umidita_aria": sensors.get("air_humidity_percent"),
            "umidita_terreno": sensors.get("soil_moisture_percent"),
            "luce": sensors.get("light_intensity_lux")
        }
        
        # Insert data into the 'telemetria' table
        response = supabase.table('telemetria').insert(data_to_insert).execute()
        print(f"[DATABASE-SUCCESS] Telemetry data from {device_id} saved to Supabase!")
        
    except Exception as e:
        print(f"[DATABASE-ERROR] Error saving telemetry: {e}")