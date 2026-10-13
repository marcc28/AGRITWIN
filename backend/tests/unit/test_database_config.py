import importlib
import sys
from unittest.mock import MagicMock

import pytest

def reload_database_module(
    monkeypatch,
    *,
    production="False",
    local_url="sqlite+aiosqlite://",
    external_url="postgresql+asyncpg://test:test@localhost/test",
    supabase_url=None,
    supabase_key=None,
):
    # Evita que load_dotenv recuperi valors del fitxer .env.
    monkeypatch.setattr("dotenv.load_dotenv", lambda *args, **kwargs: False)

    monkeypatch.setenv("PRODUCTION", production)

    for name, value in (
        ("LOCAL_DATABASE_URL", local_url),
        ("EXTERN_DATABASE_URL", external_url),
        ("SUPABASE_URL", supabase_url),
        ("SUPABASE_SECRET_KEY", supabase_key),
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


def test_database_uses_external_url_in_production(monkeypatch):
    module = reload_database_module(monkeypatch, production="True")

    assert module.PRODUCTION is True
    assert module.engine.url.drivername == "postgresql+asyncpg"
    assert module.engine.url.host == "localhost"
    assert module.engine.url.database == "test"


def test_database_raises_when_url_is_missing(monkeypatch):
    monkeypatch.setattr("dotenv.load_dotenv", lambda *args, **kwargs: False)
    monkeypatch.setenv("PRODUCTION", "False")
    monkeypatch.delenv("LOCAL_DATABASE_URL", raising=False)
    monkeypatch.delenv("EXTERN_DATABASE_URL", raising=False)

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
