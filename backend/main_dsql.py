import os

import aurora_dsql_psycopg as dsql
from dotenv import load_dotenv
from fastapi import FastAPI
from mangum import Mangum

app = FastAPI(title="My API")
load_dotenv()

DSQL_HOST = os.getenv("DSQL_HOST", "").strip()
AWS_REGION = os.getenv("AWS_REGION", "us-east-1").strip()
if not DSQL_HOST:
    raise RuntimeError("Revisa el teu .env:host")
if not AWS_REGION:
    raise RuntimeError("Revisa el teu .env:region")


def get_dsql_connection():
    return dsql.connect(
        host=DSQL_HOST,
        region=AWS_REGION,
        user="admin",
        dbname="postgres",
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-check")
def db_check():
    with get_dsql_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            result = cur.fetchone()

    return {"database": result[0]}

handler = Mangum(app)
