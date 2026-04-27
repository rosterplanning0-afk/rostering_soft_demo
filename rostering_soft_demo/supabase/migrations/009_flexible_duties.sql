-- Migration 009: Flexible Duties
-- Run this in your Supabase SQL Editor to allow duties without timing

-- 1. Make timing columns nullable
ALTER TABLE duties ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE duties ALTER COLUMN end_time DROP NOT NULL;

-- 2. Update duty_hours calculation to handle nulls
-- We must drop and recreate the generated column
ALTER TABLE duties DROP COLUMN duty_hours;
ALTER TABLE duties ADD COLUMN duty_hours NUMERIC(4,2) GENERATED ALWAYS AS (
  CASE
    WHEN start_time IS NULL OR end_time IS NULL THEN 0
    WHEN end_time > start_time THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
    ELSE EXTRACT(EPOCH FROM ('24:00:00'::interval - (start_time - end_time))) / 3600
  END
) STORED;

-- 3. Ensure duty_type_id exists (just in case)
-- If your duties table doesn't have it yet, this will add it:
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='duties' AND column_name='duty_type_id') THEN
    ALTER TABLE duties ADD COLUMN duty_type_id UUID REFERENCES duty_types(id) ON DELETE SET NULL;
  END IF;
END $$;
