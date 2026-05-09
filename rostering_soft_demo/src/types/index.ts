export type UserRole = 'system_admin' | 'roster_planner' | 'manager' | 'employee';

export interface Department {
  id: string;
  name: string;
  shortcode: string;
  created_at: string;
}

export interface Designation {
  id: string;
  department_id: string;
  name: string;
  shortcode: string;
  created_at: string;
  departments?: Department;
}

export interface RosterGroup {
  id: string;
  name: string;
  department_id: string;
  designation_id: string;
  end_date: string | null;
  created_at: string;
  departments?: Department;
  designations?: Designation;
}

export type Gender = 'male' | 'female' | 'other';

export interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  address: string | null;
  gender: Gender | null;
  department_id: string;
  designation_id: string;
  joining_date: string;
  resigned_date: string | null;
  relieved_date: string | null;
  nearby_station: string | null;
  assigned_station: string | null;
  roster_group_id: string | null;
  profile_id: string | null;
  created_at: string;
  departments?: Department;
  designations?: Designation;
  roster_groups?: RosterGroup;
}

export interface Duty {
  id: string;
  department_id: string;
  roster_group_id: string;
  designation_id: string;
  duty_type_id: string | null;
  duty_name: string;
  duty_code: string;
  start_time: string;
  end_time: string;
  start_location: string | null;
  end_location: string | null;
  duty_hours: number;
  expiry_date: string | null;
  created_at: string;
  departments?: Department;
  roster_groups?: RosterGroup;
  designations?: Designation;
  duty_types?: DutyType;
}

export interface DutyAssignment {
  id: string;
  employee_id: string;
  duty_id: string;
  assignment_date: string;
  status: 'draft' | 'confirmed';
  comments?: string | null;
  created_at: string;
  employees?: Employee;
  duties?: Duty;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface DutyType {
  id: string;
  name: string;
  shortcode: string;
  description: string | null;
  created_at: string;
}

export interface EmployeeRequest {
  id: string;
  employee_id: string;
  request_type: 'leave' | 'shift_change';
  request_date: string;
  request_date_to?: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  planner_comment?: string | null;
  target_duty_id: string | null;
  created_at: string;
  updated_at: string;
  employees?: Employee;
  target_duty?: Duty;
}
