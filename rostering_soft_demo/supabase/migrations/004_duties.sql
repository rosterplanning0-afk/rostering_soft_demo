-- Migration 004: Duties
-- Run this after 003_employees.sql

CREATE TABLE IF NOT EXISTS duties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  roster_group_id UUID NOT NULL REFERENCES roster_groups(id) ON DELETE RESTRICT,
  designation_id UUID NOT NULL REFERENCES designations(id) ON DELETE RESTRICT,
  duty_name TEXT NOT NULL,
  duty_code TEXT UNIQUE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  start_location TEXT,
  end_location TEXT,
  duty_hours NUMERIC(4,2) GENERATED ALWAYS AS (
    CASE
      WHEN end_time > start_time THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
      ELSE EXTRACT(EPOCH FROM ('24:00:00'::interval - (start_time - end_time))) / 3600
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_duties_dept ON duties(department_id);
CREATE INDEX IF NOT EXISTS idx_duties_rg ON duties(roster_group_id);
CREATE INDEX IF NOT EXISTS idx_duties_code ON duties(duty_code);

-- Row Level Security
ALTER TABLE duties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Duties are viewable by authenticated users"
  ON duties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to duties"
  ON duties FOR ALL
  USING (auth.role() = 'service_role');
