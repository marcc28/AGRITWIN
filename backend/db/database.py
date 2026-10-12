import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

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
