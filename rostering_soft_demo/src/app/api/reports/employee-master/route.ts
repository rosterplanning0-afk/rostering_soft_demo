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
    const deptId = searchParams.get('department_id');
    const rgId = searchParams.get('roster_group_id');

    const scope = await getReportScope(role, userId);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('employees')
      .select(`
        id, employee_id, first_name, last_name, gender, joining_date,
        resigned_date, relieved_date, nearby_station, department_id, roster_group_id,
        departments(name), designations(name), roster_groups(name)
      `)
      .order('first_name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = (data ?? []) as any[];

    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r) => scope.rosterGroupIds!.includes(r.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r) => scope.departmentIds!.includes(r.department_id));
    }
    if (deptId) rows = rows.filter((r) => r.department_id === deptId);
    if (rgId) rows = rows.filter((r) => r.roster_group_id === rgId);

    const result = rows.map((r) => ({
      employee_code: r.employee_id ?? '',
      full_name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
      gender: r.gender ?? '',
      department: r.departments?.name ?? '',
      designation: r.designations?.name ?? '',
      roster_group: r.roster_groups?.name ?? '',
      joining_date: r.joining_date ?? '',
      resigned_date: r.resigned_date ?? '',
      relieved_date: r.relieved_date ?? '',
      nearby_station: r.nearby_station ?? '',
      status: r.resigned_date || r.relieved_date ? 'Inactive' : 'Active',
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
