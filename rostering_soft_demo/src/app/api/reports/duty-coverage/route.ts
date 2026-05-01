import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';

export async function GET(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !userId || role !== 'system_admin') {
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
        duties(id, duty_code, duty_name, start_time, end_time, department_id, roster_group_id,
          departments(name), roster_groups(name))
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows = (data ?? []) as any[];

    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r) => scope.rosterGroupIds!.includes(r.duties?.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r) => scope.departmentIds!.includes(r.duties?.department_id));
    }
    if (deptId) rows = rows.filter((r) => r.duties?.department_id === deptId);
    if (rgId) rows = rows.filter((r) => r.duties?.roster_group_id === rgId);

    const coverageMap = new Map<string, {
      duty_code: string; duty_name: string; department: string; roster_group: string;
      start_time: string; end_time: string; assignment_date: string;
      assigned_count: number; confirmed_count: number;
    }>();

    for (const r of rows) {
      const key = `${r.duties?.id}_${r.assignment_date}`;
      if (!coverageMap.has(key)) {
        coverageMap.set(key, {
          duty_code: r.duties?.duty_code ?? '',
          duty_name: r.duties?.duty_name ?? '',
          department: r.duties?.departments?.name ?? '',
          roster_group: r.duties?.roster_groups?.name ?? '',
          start_time: r.duties?.start_time ?? '',
          end_time: r.duties?.end_time ?? '',
          assignment_date: r.assignment_date,
          assigned_count: 0,
          confirmed_count: 0,
        });
      }
      const entry = coverageMap.get(key)!;
      entry.assigned_count += 1;
      if (r.status === 'confirmed') entry.confirmed_count += 1;
    }

    const result = Array.from(coverageMap.values()).sort((a, b) =>
      a.assignment_date.localeCompare(b.assignment_date) || a.duty_code.localeCompare(b.duty_code)
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
