-- Indexes for employee_requests to speed up leave-requests API
CREATE INDEX IF NOT EXISTS idx_emp_req_date ON employee_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_emp_req_created ON employee_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emp_req_emp_id ON employee_requests(employee_id);

-- Index for employees to speed up sorting in employee-master and dispatch-data APIs
CREATE INDEX IF NOT EXISTS idx_employees_first_name ON employees(first_name);

-- Index for duties to speed up sorting in dispatch-data API
CREATE INDEX IF NOT EXISTS idx_duties_name ON duties(duty_name);
