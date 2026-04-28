-- Migration 013: Historical Duties
-- Allow multiple duties with the same duty_code by dropping the unique constraint.
-- This supports preserving historical duty records when a duty is updated.

ALTER TABLE duties DROP CONSTRAINT IF EXISTS duties_duty_code_key;

-- Ensure only one active duty per code
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_duty_code ON duties (duty_code) WHERE expiry_date IS NULL;
