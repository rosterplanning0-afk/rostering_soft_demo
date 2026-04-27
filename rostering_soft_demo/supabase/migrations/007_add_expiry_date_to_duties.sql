-- Migration 007: Add expiry_date to Duties
ALTER TABLE duties ADD COLUMN expiry_date TIMESTAMPTZ;
