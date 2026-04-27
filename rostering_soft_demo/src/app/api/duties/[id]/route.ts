import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo, canManageDepartments } from '@/lib/api-auth';
import { logAuditAction } from '@/lib/audit-logger';
import { z } from 'zod';

const updateSchema = z.object({
  department_id: z.string().uuid().nullable().optional(),
  roster_group_id: z.string().uuid().nullable().optional(),
  designation_id: z.string().uuid().nullable().optional(),
  duty_type_id: z.string().uuid().nullable().optional(),
  duty_name: z.string().min(1).optional(),
  duty_code: z.string().min(1).optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  start_location: z.string().nullable().optional(),
  end_location: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !canManageDepartments(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('duties')
      .update(parsed.data)
      .eq('id', params.id)
      .select('*, departments(*), roster_groups(*), designations(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Duty code already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      action: 'UPDATE_DUTY',
      category: 'ROSTER_PLANNING',
      entity_type: 'duty',
      entity_id: params.id,
      actor_id: userId || undefined,
      details: { updated_fields: Object.keys(parsed.data) }
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !['system_admin', 'roster_planner'].includes(role)) {
      return NextResponse.json({ error: 'Only Administrators and Roster Planners can delete duties' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Fetch duty details before delete
    const { data: duty } = await supabase
      .from('duties')
      .select('duty_code, duty_name')
      .eq('id', params.id)
      .single();
    const { error } = await supabase
      .from('duties')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (duty) {
      await logAuditAction({
        action: 'DELETE_DUTY',
        category: 'ROSTER_PLANNING',
        entity_type: 'duty',
        entity_id: params.id,
        actor_id: userId || undefined,
        details: { 
          duty_code: duty.duty_code,
          duty_name: duty.duty_name
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
