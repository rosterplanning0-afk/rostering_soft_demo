import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo, canManageDepartments } from '@/lib/api-auth';
import { logAuditAction } from '@/lib/audit-logger';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  department_id: z.string().uuid().optional(),
  designation_id: z.string().uuid().optional(),
  end_date: z.string().nullable().optional(),
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
      .from('roster_groups')
      .update(parsed.data)
      .eq('id', params.id)
      .select('*, departments(*), designations(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      action: 'UPDATE_ROSTER_GROUP',
      category: 'ROSTER_PLANNING',
      entity_type: 'roster_group',
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
    if (!role || !canManageDepartments(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Fetch before delete
    const { data: rosterGroup } = await supabase
      .from('roster_groups')
      .select('name')
      .eq('id', params.id)
      .single();

    const { error } = await supabase
      .from('roster_groups')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (rosterGroup) {
      await logAuditAction({
        action: 'DELETE_ROSTER_GROUP',
        category: 'ROSTER_PLANNING',
        entity_type: 'roster_group',
        entity_id: params.id,
        actor_id: userId || undefined,
        details: { name: rosterGroup.name }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete roster group error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
