from sqlalchemy import CheckConstraint, ForeignKeyConstraint, Index, UniqueConstraint
from sqlalchemy.dialects import postgresql, sqlite

from db.schema import (
    Base,
    BigIntType,
    Field,
    FieldCrop,
    FieldRecommendation,
    JSONType,
    SocialAuthTicket,
    UsedPasswordResetToken,
)


def test_schema_registers_all_expected_tables():
    assert set(Base.metadata.tables) == {
        "users",
        "user_profile",
        "user_consents",
        "user_auth_providers",
        "social_auth_tickets",
        "anunces",
        "conte_mercat",
        "fields",
        "devices",
        "telemetry",
        "weather_cache",
        "crops",
        "field_crops",
        "field_recommendations",
        "used_password_reset_tokens",  
    }

def test_social_auth_ticket_schema_supports_expiring_one_time_tickets():
    table = SocialAuthTicket.__table__

    assert table.primary_key.columns.keys() == ["ticket"]
    assert table.c.ticket.type.length == 128
    assert table.c.provider.nullable is False
    assert table.c.provider_user_id.nullable is False
    assert table.c.expires_at.nullable is False
    assert table.c.email.nullable is True
    assert table.c.display_name.nullable is True
    assert any(
        isinstance(index, Index)
        and index.name == "idx_social_auth_tickets_expires_at"
        and [column.name for column in index.columns] == ["expires_at"]
        for index in table.indexes
    )


def test_field_constraints_and_cascading_user_foreign_key_are_declared():
    table = Field.__table__
    constraints = {
        constraint.name: str(constraint.sqltext)
        for constraint in table.constraints
        if isinstance(constraint, CheckConstraint)
    }

    assert constraints == {
        "chk_fields_lat": "lat IS NULL OR lat BETWEEN -90 AND 90",
        "chk_fields_lon": "lon IS NULL OR lon BETWEEN -180 AND 180",
        "chk_fields_size": "size_m2 IS NULL OR size_m2 > 0",
    }
    foreign_keys = [
        constraint
        for constraint in table.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    ]
    assert len(foreign_keys) == 1
    assert foreign_keys[0].elements[0].target_fullname == "users.id"
    assert foreign_keys[0].elements[0].ondelete == "CASCADE"
    assert any(index.name == "idx_fields_user_id" for index in table.indexes)


def test_field_crop_and_recommendation_constraints_are_present():
    crop_checks = {
        constraint.name: str(constraint.sqltext)
        for constraint in FieldCrop.__table__.constraints
        if isinstance(constraint, CheckConstraint)
    }
    recommendation_checks = {
        constraint.name: str(constraint.sqltext)
        for constraint in FieldRecommendation.__table__.constraints
        if isinstance(constraint, CheckConstraint)
    }

    assert crop_checks == {
        "chk_field_crop_status": "status IN ('planned', 'planted', 'harvested')",
        "chk_field_crop_dates": (
            "expected_harvest_at IS NULL OR planted_at IS NULL OR expected_harvest_at >= planted_at"
        ),
    }
    assert recommendation_checks == {
        "chk_recommendation_severity": "severity IN ('info', 'low', 'medium', 'high')"
    }


def test_portable_json_and_autoincrement_types_compile_for_supported_databases():
    assert "JSON" in JSONType.compile(dialect=sqlite.dialect()).upper()
    assert "JSONB" in JSONType.compile(dialect=postgresql.dialect()).upper()
    assert BigIntType.compile(dialect=sqlite.dialect()).upper() == "INTEGER"
    assert BigIntType.compile(dialect=postgresql.dialect()).upper() == "BIGINT"


def test_auth_provider_uniqueness_prevents_duplicate_external_accounts():
    table = Base.metadata.tables["user_auth_providers"]
    unique_columns = {
        tuple(column.name for column in constraint.columns)
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    }

    assert ("provider", "provider_user_id") in unique_columns

def test_used_password_reset_token_schema():
    table = UsedPasswordResetToken.__table__

    assert table.name == "used_password_reset_tokens"

    assert table.c.id.primary_key
    assert table.c.id.autoincrement is True

    assert table.c.jti.type.length == 36
    assert table.c.jti.nullable is False
    assert table.c.jti.unique is True

    assert table.c.user_id.nullable is False
    assert table.c.user_id.foreign_keys

    foreign_key = next(iter(table.c.user_id.foreign_keys))
    assert foreign_key.target_fullname == "users.id"
    assert foreign_key.ondelete == "CASCADE"

    assert table.c.expires_at.nullable is False
    assert table.c.created_at.nullable is False
    assert table.c.created_at.server_default is not None