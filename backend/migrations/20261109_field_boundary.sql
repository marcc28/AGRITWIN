-- Apply before deploying the field boundary API to an existing PostgreSQL database.
ALTER TABLE fields ADD COLUMN IF NOT EXISTS boundary JSONB;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS excluded_zones JSONB;
