from datetime import UTC, datetime, timedelta

import jwt

from api.v1 import auth


def test_create_access_token_default_expiration():
    token = auth.create_access_token({"sub": "joan"})

    payload = jwt.decode(
        token,
        auth.SECRET_KEY,
        algorithms=[auth.ALGORITHM],
    )

    assert payload["sub"] == "joan"
    assert payload["exp"] > datetime.now(UTC).timestamp()


def test_create_access_token_custom_expiration():
    token = auth.create_access_token(
        {"sub": "joan"},
        expires_delta=timedelta(minutes=30),
    )

    payload = jwt.decode(
        token,
        auth.SECRET_KEY,
        algorithms=[auth.ALGORITHM],
    )

    assert payload["sub"] == "joan"
    assert payload["exp"] > datetime.now(UTC).timestamp()


def test_create_refresh_token():
    token = auth.create_refresh_token({"sub": "joan"})

    payload = jwt.decode(
        token,
        auth.SECRET_KEY,
        algorithms=[auth.ALGORITHM],
    )

    assert payload["sub"] == "joan"
    assert payload["type"] == "refresh"
    assert payload["exp"] > datetime.now(UTC).timestamp()
