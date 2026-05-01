import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';
import { differenceInHours, getISOWeek, getYear, parseISO, addDays, format } from 'date-fns';
import rulesData from '@/app/data/rules.json';

interface Violation {
  employee_code: string;
  employee_name: string;
  department: string;
  designation: string;
  roster_group: string;
  violation_type: string;
  violation_detail: string;
  severity: 'warning' | 'critical';
}

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
        assignment_date,
        employees(id, employee_id, first_name, last_name, designation_id, department_id, roster_group_id,
          departments(name), designations(name), roster_groups(name)),
        duties(start_time, end_time, duty_hours, department_id, roster_group_id)
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate)
      .order('assignment_date', { ascending: true });

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

    // Group by employee
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const empAssignments = new Map<string, { meta: any; assignments: any[] }>();
    for (const r of rows) {
      const empId = r.employees?.id ?? '';
      if (!empAssignments.has(empId)) {
        empAssignments.set(empId, { meta: r.employees, assignments: [] });
      }
      empAssignments.get(empId)!.assignments.push(r);
    }

    const rules = rulesData as Record<string, { rules?: {
      max_consecutive_working_days?: number;
      min_rest_hours_between_shifts?: number;
      max_working_hours_per_week?: number;
    }}>;

    const violations: Violation[] = [];

    for (const [, { meta, assignments }] of Array.from(empAssignments)) {
      const designationId = meta?.designation_id ?? '';
      const empRule = rules[designationId]?.rules;
      if (!empRule) continue;

      const empInfo = {
        employee_code: meta?.employee_id ?? '',
        employee_name: `${meta?.first_name ?? ''} ${meta?.last_name ?? ''}`.trim(),
        department: meta?.departments?.name ?? '',
        designation: meta?.designations?.name ?? '',
        roster_group: meta?.roster_groups?.name ?? '',
      };

      const sorted = [...assignments].sort((a, b) =>
        a.assignment_date.localeCompare(b.assignment_date)
      );

      // Check max consecutive working days
      if (empRule.max_consecutive_working_days) {
        const limit = empRule.max_consecutive_working_days;
        let consecutive = 1;
        let streakStart = sorted[0]?.assignment_date ?? '';

        for (let i = 1; i < sorted.length; i++) {
          const prev = parseISO(sorted[i - 1].assignment_date);
          const expectedNext = format(addDays(prev, 1), 'yyyy-MM-dd');
          if (sorted[i].assignment_date === expectedNext) {
            consecutive += 1;
          } else {
            if (consecutive > limit) {
              violations.push({
                ...empInfo,
                violation_type: 'Max Consecutive Days',
                violation_detail: `${consecutive} consecutive days from ${streakStart} (limit: ${limit})`,
                severity: 'critical',
              });
            }
            consecutive = 1;
            streakStart = sorted[i].assignment_date;
          }
        }
        if (consecutive > limit) {
          violations.push({
            ...empInfo,
            violation_type: 'Max Consecutive Days',
            violation_detail: `${consecutive} consecutive days from ${streakStart} (limit: ${limit})`,
            severity: 'critical',
          });
        }
      }

      // Check min rest hours between shifts
      if (empRule.min_rest_hours_between_shifts) {
        const minRest = empRule.min_rest_hours_between_shifts;
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const curr = sorted[i];
          const prevEnd = parseISO(`${prev.assignment_date}T${prev.duties?.end_time ?? '00:00'}`);
          const currStart = parseISO(`${curr.assignment_date}T${curr.duties?.start_time ?? '00:00'}`);
          const restHours = differenceInHours(currStart, prevEnd);
          if (restHours >= 0 && restHours < minRest) {
            violations.push({
              ...empInfo,
              violation_type: 'Insufficient Rest',
              violation_detail: `${restHours}h rest between ${prev.assignment_date} and ${curr.assignment_date} (min: ${minRest}h)`,
              severity: restHours < minRest / 2 ? 'critical' : 'warning',
            });
          }
        }
      }

      // Check max working hours per week
      if (empRule.max_working_hours_per_week) {
        const maxHours = empRule.max_working_hours_per_week;
        const weeklyHours = new Map<string, number>();
        for (const a of sorted) {
          const date = parseISO(a.assignment_date);
          const weekKey = `${getYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
          weeklyHours.set(weekKey, (weeklyHours.get(weekKey) ?? 0) + Number(a.duties?.duty_hours ?? 0));
        }
        for (const [week, hours] of Array.from(weeklyHours)) {
          if (hours > maxHours) {
            violations.push({
              ...empInfo,
              violation_type: 'Weekly Hours Exceeded',
              violation_detail: `${hours}h in ${week} (limit: ${maxHours}h)`,
              severity: 'warning',
            });
          }
        }
      }
    }

    return NextResponse.json(violations);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
