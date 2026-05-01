import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';
import rulesData from '@/app/data/rules.json';

function isNightShift(startTime: string): boolean {
  if (!startTime) return false;
  const [h] = startTime.split(':').map(Number);
  return h >= 22 || h <= 5;
}

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
        employees(id, employee_id, first_name, last_name, designation_id, department_id, roster_group_id,
          departments(name), designations(name, id), roster_groups(name)),
        duties(start_time, duty_code, department_id, roster_group_id)
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
      designation: string; roster_group: string; roster_group_id: string;
      night_shift_count: number; total_shifts: number;
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
          roster_group_id: r.employees?.roster_group_id ?? '',
          night_shift_count: 0,
          total_shifts: 0,
        });
      }
      const entry = empMap.get(empId)!;
      entry.total_shifts += 1;
      
      const dutyCode = (r.duties?.duty_code ?? '').toUpperCase();
      if (dutyCode.startsWith('N')) {
        entry.night_shift_count += 1;
      }
    }

    const rules = rulesData as Record<string, { rules?: { night_shift_limit?: number; night_shift_allowance?: number } }>;

    const result = Array.from(empMap.values()).map((e) => {
      const ruleEntry = rules[e.roster_group_id];
      const limit = ruleEntry?.rules?.night_shift_limit ?? null;
      const allowanceRate = ruleEntry?.rules?.night_shift_allowance ?? 0;
      const complianceStatus =
        limit === null ? 'no_rule' : e.night_shift_count > limit ? 'exceeded' : 'ok';
      return {
        employee_code: e.employee_code,
        employee_name: e.employee_name,
        department: e.department,
        designation: e.designation,
        roster_group: e.roster_group,
        total_shifts: e.total_shifts,
        night_shift_count: e.night_shift_count,
        night_shift_limit: limit ?? 'N/A',
        night_shift_allowance: e.night_shift_count * allowanceRate,
        compliance_status: complianceStatus,
      };
    }).sort((a, b) => a.employee_name.localeCompare(b.employee_name));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
