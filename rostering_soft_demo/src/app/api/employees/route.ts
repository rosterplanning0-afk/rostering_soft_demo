import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo, canManageEmployees } from '@/lib/api-auth';
import { logAuditAction } from '@/lib/audit-logger';
import { z } from 'zod';

const employeeSchema = z.object({
  employee_id: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  address: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  department_id: z.string().uuid(),
  designation_id: z.string().uuid(),
  joining_date: z.string().min(1),
  resigned_date: z.string().nullable().optional(),
  relieved_date: z.string().nullable().optional(),
  nearby_station: z.string().nullable().optional(),
  roster_group_id: z.string().uuid().nullable().optional(),
  profile_id: z.string().uuid().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');
    const rosterGroupId = searchParams.get('roster_group_id');

    let query = supabase
      .from('employees')
      .select('*, departments(*), designations(*), roster_groups(*)')
      .order('first_name', { ascending: true });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }
    if (rosterGroupId) {
      query = query.eq('roster_group_id', rosterGroupId);
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
    if (!role || !canManageEmployees(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('employees')
      .insert(parsed.data)
      .select('*, departments(*), designations(*), roster_groups(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Employee ID already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      action: 'CREATE_EMPLOYEE',
      category: 'EMPLOYEE_MANAGEMENT',
      entity_type: 'employee',
      entity_id: data.id,
      actor_id: userId || undefined,
      details: { 
        employee_id: data.employee_id,
        name: `${data.first_name} ${data.last_name}`
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
