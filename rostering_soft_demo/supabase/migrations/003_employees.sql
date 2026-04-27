-- Migration 003: Employees
-- Run this after 002_roster_groups.sql

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  designation_id UUID NOT NULL REFERENCES designations(id) ON DELETE RESTRICT,
  joining_date DATE NOT NULL,
  resigned_date DATE,
  relieved_date DATE,
  nearby_station TEXT,
  roster_group_id UUID REFERENCES roster_groups(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_desig ON employees(designation_id);
CREATE INDEX IF NOT EXISTS idx_employees_rg ON employees(roster_group_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);

-- Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees are viewable by authenticated users"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to employees"
  ON employees FOR ALL
  USING (auth.role() = 'service_role');
