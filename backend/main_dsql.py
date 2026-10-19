import asyncio
import os

import aurora_dsql_asyncpg as dsql
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("EXTERN_DATABASE_URL")
if not host:
    raise RuntimeError("Revisa el teu .env")
async def main():
    conn = await dsql.connect(
        host=host,
        region="eu-north-1",
        user="admin",
        profile="deafult"
    )

    try:
        result = await conn.fetchval("SELECT 1")
        print("Connexió correcta:", result)
    finally:
        await conn.close()

asyncio.run(main())