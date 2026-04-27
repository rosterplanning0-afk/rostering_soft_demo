-- Migration 002: Roster Groups
-- Run this after 001_departments_designations.sql

CREATE TABLE IF NOT EXISTS roster_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  designation_id UUID NOT NULL REFERENCES designations(id) ON DELETE RESTRICT,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roster_groups_dept ON roster_groups(department_id);
CREATE INDEX IF NOT EXISTS idx_roster_groups_desig ON roster_groups(designation_id);

-- Row Level Security
ALTER TABLE roster_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roster groups are viewable by authenticated users"
  ON roster_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to roster_groups"
  ON roster_groups FOR ALL
  USING (auth.role() = 'service_role');
