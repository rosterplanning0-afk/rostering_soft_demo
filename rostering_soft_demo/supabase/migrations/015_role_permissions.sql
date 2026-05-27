-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE,
  visible_items text[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage role_permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Everyone else can only SELECT
CREATE POLICY "Authenticated users can view role_permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert defaults for existing roles
INSERT INTO role_permissions (role, visible_items)
VALUES 
  ('system_admin', '{/dashboard,/departments,/designations,/roster-groups,/duty-types,/employees,/users,/delegations,/audit-logs,/duties,/dispatch,/reports,/employee-requests}'),
  ('roster_planner', '{/dashboard,/duties,/dispatch,/reports,/employees}'),
  ('manager', '{/dashboard,/reports,/employee-requests}'),
  ('employee', '{/employee-requests}'),
  ('hod', '{/dashboard,/reports,/employees}'),
  ('cxo', '{/dashboard,/reports}')
ON CONFLICT (role) DO NOTHING;
