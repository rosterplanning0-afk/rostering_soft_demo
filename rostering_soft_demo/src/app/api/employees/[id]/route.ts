import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo, canManageEmployees } from '@/lib/api-auth';
import { logAuditAction } from '@/lib/audit-logger';
import { z } from 'zod';

const updateSchema = z.object({
  employee_id: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  department_id: z.string().uuid().optional(),
  designation_id: z.string().uuid().optional(),
  joining_date: z.string().optional(),
  resigned_date: z.string().nullable().optional(),
  relieved_date: z.string().nullable().optional(),
  nearby_station: z.string().nullable().optional(),
  assigned_station: z.string().nullable().optional(),
  roster_group_id: z.string().uuid().nullable().optional(),
  profile_id: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !canManageEmployees(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('employees')
      .update(parsed.data)
      .eq('id', params.id)
      .select('*, departments(*), designations(*), roster_groups(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Employee ID already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditAction({
      action: 'UPDATE_EMPLOYEE',
      category: 'EMPLOYEE_MANAGEMENT',
      entity_type: 'employee',
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
    if (!role || !canManageEmployees(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Fetch employee to get profile_id and details for logging
    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('profile_id, first_name, last_name, employee_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Restriction: Roster Planners and Managers cannot delete employees with assignments
    if (role !== 'system_admin') {
      const { count, error: countError } = await supabase
        .from('duty_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', params.id);
      
      if (countError) {
        console.error('Failed to check assignments:', countError);
        return NextResponse.json({ error: 'Database error while checking assignments' }, { status: 500 });
      }

      if (count && count > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete employee with existing duty assignments. Only System Administrators can perform this action, or assignments must be removed first.' 
        }, { status: 400 });
      }
    }

    // Delete employee
    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Delete from auth if linked profile exists
    if (employee.profile_id) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(employee.profile_id);
      if (authDeleteError) {
        console.error('Failed to delete auth user:', authDeleteError);
        // We continue since the employee itself is deleted
      }
    }

    // Log the deletion
    await logAuditAction({
      action: 'DELETE_EMPLOYEE',
      category: 'EMPLOYEE_MANAGEMENT',
      entity_type: 'employee',
      entity_id: params.id,
      actor_id: userId || undefined,
      details: { 
        employee_id: employee.employee_id,
        name: `${employee.first_name} ${employee.last_name}`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
