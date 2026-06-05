import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
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
  assigned_station: z.string().nullable().optional(),
  roster_group_id: z.string().uuid().nullable().optional(),
  profile_id: z.string().uuid().nullable().optional(),
});

const bulkEmployeeSchema = z.array(employeeSchema);

export async function POST(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !canManageEmployees(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bulkEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('employees')
      .insert(parsed.data)
      .select('id, employee_id, first_name, last_name');

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'One or more Employee IDs already exist in the database.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log a single audit action for the bulk creation
    await logAuditAction({
      action: 'BULK_CREATE_EMPLOYEES',
      category: 'EMPLOYEE_MANAGEMENT',
      entity_type: 'employee',
      entity_id: 'bulk',
      actor_id: userId || undefined,
      details: { 
        count: data.length,
        employee_ids: data.map(d => d.employee_id)
      }
    });

    return NextResponse.json({ success: true, count: data.length, data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
