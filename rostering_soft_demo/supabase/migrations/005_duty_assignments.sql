-- Migration 005: Duty Assignments
-- Run this after 004_duties.sql

CREATE TABLE IF NOT EXISTS duty_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  duty_id UUID NOT NULL REFERENCES duties(id) ON DELETE RESTRICT,
  assignment_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, assignment_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_da_employee ON duty_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_da_duty ON duty_assignments(duty_id);
CREATE INDEX IF NOT EXISTS idx_da_date ON duty_assignments(assignment_date);

-- Row Level Security
ALTER TABLE duty_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Duty assignments are viewable by authenticated users"
  ON duty_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to duty_assignments"
  ON duty_assignments FOR ALL
  USING (auth.role() = 'service_role');
