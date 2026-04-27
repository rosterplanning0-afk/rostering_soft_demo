import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCallerRole, canManageUsers } from '@/lib/api-auth';
import { z } from 'zod';

const createProfileSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.enum(['system_admin', 'roster_planner', 'manager', 'employee']),
  // Employee specific fields (optional)
  employee_id: z.string().optional(),
  department_id: z.string().uuid().optional(),
  designation_id: z.string().uuid().optional(),
  roster_group_id: z.string().uuid().optional().nullable(),
  joining_date: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
});

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

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
    const callerRole = await getCallerRole();
    if (!callerRole || !canManageUsers(callerRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password, full_name, role, ...empData } = parsed.data;
    const supabase = createAdminClient();

    // 1. Create Auth User
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const userId = authUser.user.id;

    // 2. Create Profile (using upsert in case a trigger already created it)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name,
        role
      });

    if (profileError) {
      // Cleanup auth user if profile fails
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 3. Create Employee if role is employee
    if (role === 'employee') {
      if (!empData.employee_id || !empData.department_id || !empData.designation_id || !empData.joining_date) {
        // Cleanup if missing employee fields
        await supabase.from('profiles').delete().eq('id', userId);
        await supabase.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: 'Employee details are required for employee role' }, { status: 400 });
      }

      // Split full name into first and last name for employees table
      const names = full_name.trim().split(/\s+/);
      const firstName = names[0];
      const lastName = names.length > 1 ? names.slice(1).join(' ') : '—';

      const { error: empError } = await supabase
        .from('employees')
        .insert({
          profile_id: userId,
          employee_id: empData.employee_id,
          first_name: firstName,
          last_name: lastName,
          department_id: empData.department_id,
          designation_id: empData.designation_id,
          roster_group_id: empData.roster_group_id,
          joining_date: empData.joining_date,
          gender: empData.gender
        });

      if (empError) {
        // Cleanup
        await supabase.from('profiles').delete().eq('id', userId);
        await supabase.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: `Failed to create employee record: ${empError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ id: userId, full_name, role }, { status: 201 });
  } catch (err: unknown) {
    console.error('Create User Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
