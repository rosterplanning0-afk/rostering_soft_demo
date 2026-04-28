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

    // Fetch existing duty
    const { data: existingDuty, error: fetchError } = await supabase
      .from('duties')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingDuty) {
      return NextResponse.json({ error: 'Duty not found' }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Check for past assignments
    const { count: pastCount } = await supabase
      .from('duty_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('duty_id', params.id)
      .lt('assignment_date', todayStr);

    let finalData;

    if (pastCount && pastCount > 0) {
      // Historical mode: Create new duty, expire old one
      
      const newDutyData = {
        ...existingDuty,
        ...parsed.data,
        id: undefined,
        created_at: undefined,
        expiry_date: null
      };

      // Create new duty
      const { data: newDuty, error: insertError } = await supabase
        .from('duties')
        .insert(newDutyData)
        .select('*, departments(*), roster_groups(*), designations(*)')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      // Expire old duty
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      await supabase
        .from('duties')
        .update({ expiry_date: yesterday })
        .eq('id', params.id);

      // Migrate future assignments
      await supabase
        .from('duty_assignments')
        .update({ duty_id: newDuty.id })
        .eq('duty_id', params.id)
        .gte('assignment_date', todayStr);

      // Migrate future employee requests
      await supabase
        .from('employee_requests')
        .update({ target_duty_id: newDuty.id })
        .eq('target_duty_id', params.id)
        .gte('request_date', todayStr);

      finalData = newDuty;
    } else {
      // Normal update mode
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
      finalData = data;
    }

    await logAuditAction({
      action: 'UPDATE_DUTY',
      category: 'ROSTER_PLANNING',
      entity_type: 'duty',
      entity_id: finalData.id,
      actor_id: userId || undefined,
      details: { 
        updated_fields: Object.keys(parsed.data), 
        historical_update: (pastCount ?? 0) > 0,
        original_id: params.id
      }
    });

    return NextResponse.json(finalData);
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
