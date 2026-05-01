import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';

export async function GET(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !userId || role === 'employee') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const deptId = searchParams.get('department_id');
    const rgId = searchParams.get('roster_group_id');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 });
    }

    const scope = await getReportScope(role, userId);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('duty_assignments')
      .select(`
        assignment_date, status,
        employees(id, employee_id, first_name, last_name, department_id,
          departments(name), designations(name), roster_groups(name)),
        duties(duty_hours, department_id, roster_group_id)
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = (data ?? []) as any[];

    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r) => scope.rosterGroupIds!.includes(r.duties?.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r) => scope.departmentIds!.includes(r.duties?.department_id));
    }
    if (deptId) rows = rows.filter((r) => r.duties?.department_id === deptId);
    if (rgId) rows = rows.filter((r) => r.duties?.roster_group_id === rgId);

    const empMap = new Map<string, {
      employee_code: string; employee_name: string; department: string;
      designation: string; roster_group: string;
      total_hours: number; total_shifts: number; confirmed_shifts: number;
    }>();

    for (const r of rows) {
      const empId = r.employees?.id ?? '';
      if (!empMap.has(empId)) {
        empMap.set(empId, {
          employee_code: r.employees?.employee_id ?? '',
          employee_name: `${r.employees?.first_name ?? ''} ${r.employees?.last_name ?? ''}`.trim(),
          department: r.employees?.departments?.name ?? '',
          designation: r.employees?.designations?.name ?? '',
          roster_group: r.employees?.roster_groups?.name ?? '',
          total_hours: 0,
          total_shifts: 0,
          confirmed_shifts: 0,
        });
      }
      const entry = empMap.get(empId)!;
      entry.total_hours += Number(r.duties?.duty_hours ?? 0);
      entry.total_shifts += 1;
      if (r.status === 'confirmed') entry.confirmed_shifts += 1;
    }

    const result = Array.from(empMap.values()).sort((a, b) =>
      a.employee_name.localeCompare(b.employee_name)
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
