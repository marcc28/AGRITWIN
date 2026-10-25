import importlib
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest


def reload_database_module(
    monkeypatch,
    *,
    production="False",
    local_url="sqlite+aiosqlite://",
    external_url="postgresql+asyncpg://test:test@localhost/test",
    supabase_url=None,
    supabase_key=None,
    region="us-east-1",
):
    # Evita que load_dotenv recuperi valors del fitxer .env.
    monkeypatch.setattr("dotenv.load_dotenv", lambda *args, **kwargs: False)
    monkeypatch.setenv("PROD", production)
    monkeypatch.setenv("REGION", region)

    for name, value in (
        ("DATABASE_URL", local_url),
        ("DSQL_HOST", external_url),
        ("SUPABASE_URL", supabase_url),
        ("SUPABASE_SECRET_KEY", supabase_key)
    ):
        if value is None:
            monkeypatch.delenv(name, raising=False)
        else:
            monkeypatch.setenv(name, value)

    sys.modules.pop("db.database", None)
    return importlib.import_module("db.database")


def test_database_uses_local_url(monkeypatch):
    module = reload_database_module(monkeypatch)

    assert module.engine.url.drivername == "sqlite+aiosqlite"


@pytest.mark.asyncio
async def test_database_uses_dsql_in_production(monkeypatch):
    dsql_host = "example.dsql.us-east-1.on.aws"
    aws_region = "us-east-1"

    module = reload_database_module(
        monkeypatch,
        production="True",
        external_url=dsql_host,
    )

    # En producció s'utilitza un creador de connexions personalitzat.
    assert module.PRODUCTION is True
    assert module.engine.url.drivername == "postgresql+asyncpg"
    assert module.engine.url.host is None

    # Simulem la connexió real amb Aurora DSQL.
    fake_connection = MagicMock()
    mock_connect = AsyncMock(return_value=fake_connection)
    monkeypatch.setattr(module.dsql, "connect", mock_connect)

    # Executem la funció sense contactar amb AWS.
    result = await module.connect_dsql()

    assert result is fake_connection
    mock_connect.assert_awaited_once_with(
        host=dsql_host,
        region=aws_region,
        user="admin",
        database="postgres",
    )

    # Simulem la connexió real amb Aurora DSQL.
    fake_connection = MagicMock()
    mock_connect = AsyncMock(return_value=fake_connection)
    monkeypatch.setattr(module.dsql, "connect", mock_connect)

    # Executem la funció sense contactar amb AWS.
    result = await module.connect_dsql()

    assert result is fake_connection
    mock_connect.assert_awaited_once_with(
        host=dsql_host,
        region=aws_region,
        user="admin",
        database="postgres",
    )

def test_database_raises_when_url_is_missing(monkeypatch):
    monkeypatch.setattr("dotenv.load_dotenv", lambda *args, **kwargs: False)
    monkeypatch.setenv("PROD", "False")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("DSQL_HOST", raising=False)

    sys.modules.pop("db.database", None)

    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        importlib.import_module("db.database")


def test_supabase_client_is_none_without_credentials(monkeypatch, capsys):
    module = reload_database_module(
        monkeypatch,
        supabase_url=None,
        supabase_key=None,
    )

    assert module.supabase is None
    assert "Supabase credentials not found" in capsys.readouterr().out


def test_supabase_client_is_created_with_credentials(monkeypatch):
    fake_client = MagicMock()

    # Impede que create_client real s'executi durant la importació.
    import db.database as existing_module

    monkeypatch.setattr(existing_module, "create_client", lambda url, key: fake_client)

    module = reload_database_module(
        monkeypatch,
        supabase_url="https://example.supabase.co",
        supabase_key="test-key",
    )

    assert module.supabase is not None
