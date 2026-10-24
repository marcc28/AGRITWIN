
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
    DATABASE_URL = os.getenv("DATABASE_URL")
else:
    DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL no està configurat. Revisa el teu .env"
    )

url = make_url(DATABASE_URL)
url = url.difference_update_query(["pgbouncer"])

engine = create_async_engine(
    url,
    pool_pre_ping=True,
    connect_args={"statement_cache_size": 0},
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Supabase principal: dispositius i dades operatives
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("[WARNING] Main Supabase credentials not found.")


def set_device_battery_status(
    device_id: str,
    status: bool,
) -> bool:
    """Actualitza l'estat de bateria d'un dispositiu."""

    if not supabase:
        print("[DATABASE-ERROR] Main Supabase is not configured.")
        return False

    try:
        supabase.table("devices").update(
            {"battery_status": status}
        ).eq("id", device_id).execute()

        return True

    except Exception as e:
        print(
            f"[DATABASE-ERROR] Error updating battery status "
            f"of {device_id}: {e}"
        )
        return False


def get_devices_status() -> dict[str, bool]:
    """Retorna l'estat de bateria dels dispositius registrats."""

    if not supabase:
        print("[DATABASE-ERROR] Main Supabase is not configured.")
        return {}

    try:
        response = supabase.table("devices").select(
            "id, battery_status"
        ).execute()

        return {
            row["id"]: bool(row["battery_status"])
            for row in response.data
        }

    except Exception as e:
        print(f"[DATABASE-ERROR] Error reading devices: {e}")
        return {}
