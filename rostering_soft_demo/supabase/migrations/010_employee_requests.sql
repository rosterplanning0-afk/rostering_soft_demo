-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS employee_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('leave', 'shift_change')),
  request_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  planner_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_employee_requests_updated_at ON employee_requests;
CREATE TRIGGER update_employee_requests_updated_at
  BEFORE UPDATE ON employee_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE employee_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employee requests are viewable by authenticated users"
  ON employee_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to employee requests"
  ON employee_requests FOR ALL
  USING (auth.role() = 'service_role');
