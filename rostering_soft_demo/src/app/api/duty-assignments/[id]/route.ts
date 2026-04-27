import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo, canManageRosters } from '@/lib/api-auth';
import { logAuditAction } from '@/lib/audit-logger';
import { z } from 'zod';

const updateSchema = z.object({
  employee_id: z.string().uuid().optional(),
  duty_id: z.string().uuid().optional(),
  assignment_date: z.string().optional(),
  status: z.enum(['draft', 'confirmed']).optional(),
  comments: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !canManageRosters(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('duty_assignments')
      .update(parsed.data)
      .eq('id', params.id)
      .select('*, employees(*), duties(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      action: 'UPDATE_DUTY_ASSIGNMENT',
      category: 'DISPATCH',
      entity_type: 'duty_assignment',
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
    if (!role || !canManageRosters(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Fetch before delete for logging
    const { data: assignment } = await supabase
      .from('duty_assignments')
      .select('employee_id, duty_id, assignment_date')
      .eq('id', params.id)
      .single();

    const { error } = await supabase
      .from('duty_assignments')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (assignment) {
      await logAuditAction({
        action: 'DELETE_DUTY_ASSIGNMENT',
        category: 'DISPATCH',
        entity_type: 'duty_assignment',
        entity_id: params.id,
        actor_id: userId || undefined,
        details: {
          employee_id: assignment.employee_id,
          duty_id: assignment.duty_id,
          assignment_date: assignment.assignment_date
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete duty assignment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
