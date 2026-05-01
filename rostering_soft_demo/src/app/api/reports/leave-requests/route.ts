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

    const scope = await getReportScope(role, userId);
    const supabase = createAdminClient();

    let query = supabase
      .from('employee_requests')
      .select(`
        id, request_type, request_date, request_date_to, reason,
        status, planner_comment, created_at,
        employees(id, employee_id, first_name, last_name, department_id, roster_group_id,
          departments(name), designations(name), roster_groups(name))
      `)
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('request_date', startDate);
    if (endDate) query = query.lte('request_date', endDate);

    const { data, error } = await query;
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

    const result = rows.map((r) => ({
      employee_code: r.employees?.employee_id ?? '',
      employee_name: `${r.employees?.first_name ?? ''} ${r.employees?.last_name ?? ''}`.trim(),
      department: r.employees?.departments?.name ?? '',
      designation: r.employees?.designations?.name ?? '',
      roster_group: r.employees?.roster_groups?.name ?? '',
      request_type: r.request_type,
      request_date: r.request_date,
      request_date_to: r.request_date_to ?? '',
      reason: r.reason,
      status: r.status,
      planner_comment: r.planner_comment ?? '',
      submitted_at: r.created_at,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
