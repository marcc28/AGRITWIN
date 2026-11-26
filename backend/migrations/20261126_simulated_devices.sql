-- Apply before deploying the simulated readings feature (#286) to an existing
-- PostgreSQL database. Safe to run more than once.

-- TRUE for the device the backend creates for a garden without real devices,
-- so the garden shows simulated readings. It is deleted, with its readings,
-- when the first real device is registered in the garden.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT FALSE;
