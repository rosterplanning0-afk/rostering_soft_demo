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
        employees(id, employee_id, first_name, last_name, department_id, roster_group_id,
          departments(name), designations(name), roster_groups(name)),
        duties(duty_hours, duty_code, department_id, roster_group_id)
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows = (data ?? []) as any[];

    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r) => scope.rosterGroupIds!.includes(r.employees?.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r) => scope.departmentIds!.includes(r.employees?.department_id));
    }
    if (deptId) rows = rows.filter((r) => r.employees?.department_id === deptId);
    if (rgId) rows = rows.filter((r) => r.employees?.roster_group_id === rgId);

    const empMap = new Map<string, {
      employee_code: string; employee_name: string; department: string;
      designation: string; roster_group: string;
      total_hours: number; total_shifts: number; confirmed_shifts: number;
      m_shifts: number; e_shifts: number; n_shifts: number; g_shifts: number;
      cl_days: number; sl_days: number; el_days: number; lmcl_days: number;
      ab_days: number; lwp_days: number; wo_days: number; total_days: number;
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
          m_shifts: 0,
          e_shifts: 0,
          n_shifts: 0,
          g_shifts: 0,
          cl_days: 0,
          sl_days: 0,
          el_days: 0,
          lmcl_days: 0,
          ab_days: 0,
          lwp_days: 0,
          wo_days: 0,
          total_days: 0,
        });
      }
      const entry = empMap.get(empId)!;
      entry.total_hours += Number(r.duties?.duty_hours ?? 0);
      if (r.status === 'confirmed') entry.confirmed_shifts += 1;

      const code = (r.duties?.duty_code ?? '').toUpperCase();
      
      // Categorize
      if (code === 'CL') entry.cl_days += 1;
      else if (code === 'SL') entry.sl_days += 1;
      else if (code === 'EL') entry.el_days += 1;
      else if (code === 'LMCL') entry.lmcl_days += 1;
      else if (code === 'AB') entry.ab_days += 1;
      else if (code === 'LWP') entry.lwp_days += 1;
      else if (code === 'WO') entry.wo_days += 1;
      else {
        // Work shifts
        entry.total_shifts += 1;
        if (code.startsWith('M')) entry.m_shifts += 1;
        else if (code.startsWith('E')) entry.e_shifts += 1;
        else if (code.startsWith('N')) entry.n_shifts += 1;
        else if (code.startsWith('G')) entry.g_shifts += 1;
      }
      
      // Total Days includes everything
      entry.total_days += 1;
    }

    const result = Array.from(empMap.values()).sort((a, b) =>
      a.employee_name.localeCompare(b.employee_name)
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
