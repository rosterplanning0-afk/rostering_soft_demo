import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo, canManageDepartments } from '@/lib/api-auth';
import { logAuditAction } from '@/lib/audit-logger';
import { z } from 'zod';

const dutySchema = z.object({
  department_id: z.string().uuid().nullable().optional(),
  roster_group_id: z.string().uuid().nullable().optional(),
  designation_id: z.string().uuid().nullable().optional(),
  duty_type_id: z.string().uuid().nullable().optional(),
  duty_name: z.string().min(1),
  duty_code: z.string().min(1),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  start_location: z.string().nullable().optional(),
  end_location: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');
    const rosterGroupId = searchParams.get('roster_group_id');
    const includeExpired = searchParams.get('include_expired');

    let query = supabase
      .from('duties')
      .select('*, departments(*), roster_groups(*), designations(*)')
      .order('duty_name', { ascending: true });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }
    if (rosterGroupId) {
      query = query.eq('roster_group_id', rosterGroupId);
    }
    if (includeExpired !== 'true') {
      query = query.is('expiry_date', null);
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
    if (!role || !canManageDepartments(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = dutySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('duties')
      .insert(parsed.data)
      .select('*, departments(*), roster_groups(*), designations(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Duty code already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      action: 'CREATE_DUTY',
      category: 'ROSTER_PLANNING',
      entity_type: 'duty',
      entity_id: data.id,
      actor_id: userId || undefined,
      details: { 
        duty_code: data.duty_code,
        duty_name: data.duty_name,
        department_id: data.department_id
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
