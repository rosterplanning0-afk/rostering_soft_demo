import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo, canManageDepartments } from '@/lib/api-auth';
import { logAuditAction } from '@/lib/audit-logger';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  shortcode: z.string().min(1).optional(),
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
      .from('departments')
      .update(parsed.data)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Department shortcode already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      action: 'UPDATE_DEPARTMENT',
      category: 'ROSTER_PLANNING',
      entity_type: 'department',
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
    const { data: department } = await supabase
      .from('departments')
      .select('name, shortcode')
      .eq('id', params.id)
      .single();

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (department) {
      await logAuditAction({
        action: 'DELETE_DEPARTMENT',
        category: 'ROSTER_PLANNING',
        entity_type: 'department',
        entity_id: params.id,
        actor_id: userId || undefined,
        details: { name: department.name, shortcode: department.shortcode }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete department error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
