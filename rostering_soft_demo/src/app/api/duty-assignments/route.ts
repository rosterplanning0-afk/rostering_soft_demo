import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo, canManageRosters } from '@/lib/api-auth';
import { logAuditAction } from '@/lib/audit-logger';
import { z } from 'zod';

const assignmentSchema = z.object({
  employee_id: z.string().uuid(),
  duty_id: z.string().uuid(),
  assignment_date: z.string().min(1),
  status: z.enum(['draft', 'confirmed']).optional().default('draft'),
  comments: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const departmentId = searchParams.get('department_id');
    const rosterGroupId = searchParams.get('roster_group_id');

    let query = supabase
      .from('duty_assignments')
      .select('*, employees(*, departments(*), designations(*), roster_groups(*)), duties(*, departments(*), roster_groups(*), designations(*))')
      .order('assignment_date', { ascending: true });

    if (startDate) {
      query = query.gte('assignment_date', startDate);
    }
    if (endDate) {
      query = query.lte('assignment_date', endDate);
    }
    if (departmentId) {
      query = query.eq('duties.department_id', departmentId);
    }
    if (rosterGroupId) {
      query = query.eq('duties.roster_group_id', rosterGroupId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !canManageRosters(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = assignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('duty_assignments')
      .upsert(parsed.data, { onConflict: 'employee_id, assignment_date' })
      .select('*, employees(*), duties(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      action: 'ASSIGN_DUTY',
      category: 'DISPATCH',
      entity_type: 'duty_assignment',
      entity_id: data.id,
      actor_id: userId || undefined,
      details: { 
        employee_id: data.employee_id,
        duty_id: data.duty_id,
        assignment_date: data.assignment_date,
        status: data.status
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
