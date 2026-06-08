import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerRole, canManageUsers } from '@/lib/api-auth';
import { z } from 'zod';

const createProfileSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.enum(['system_admin', 'roster_planner', 'manager', 'employee']),
  employee_id: z.string().optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  designation_id: z.string().uuid().optional().nullable(),
  roster_group_id: z.string().uuid().optional().nullable(),
  joining_date: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  creation_mode: z.enum(['both', 'login_only']).optional().default('both'),
});

export async function POST(request: Request) {
  try {
    const callerRole = await getCallerRole();
    if (!callerRole || !canManageUsers(callerRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const payload = await request.json();

    if (!Array.isArray(payload) || payload.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (payload.length > 30) {
      return NextResponse.json({ error: 'Maximum limit exceeded! Please upload a maximum of 30 staff members at once.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    let successCount = 0;
    const errors: { email: string; error: string }[] = [];

    for (const body of payload) {
      try {
        // Prune empty strings for optional UUID and date fields
        ['department_id', 'designation_id', 'roster_group_id', 'employee_id', 'joining_date'].forEach(key => {
          if (body[key] === '') {
            delete body[key];
          }
        });

        const parsed = createProfileSchema.safeParse(body);
        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          const errorString = Object.entries(fieldErrors)
            .map(([field, errs]) => `${field}: ${errs.join(', ')}`)
            .join('; ');
          errors.push({ email: body.email || 'Unknown', error: errorString || 'Validation failed' });
          continue;
        }

        const { email, password, full_name, role, creation_mode, ...empData } = parsed.data;

        // 1. Create Auth User
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name }
        });

        if (authError) {
          errors.push({ email, error: authError.message });
          continue;
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
          await supabase.auth.admin.deleteUser(userId);
          errors.push({ email, error: `Profile error: ${profileError.message}` });
          continue;
        }

        // 3. Create or Link Employee if role is employee
        if (role === 'employee') {
          if (creation_mode === 'login_only') {
            if (!empData.employee_id) {
              await supabase.from('profiles').delete().eq('id', userId);
              await supabase.auth.admin.deleteUser(userId);
              errors.push({ email, error: 'Employee ID is required to link an existing employee' });
              continue;
            }

            const { error: updateError } = await supabase
              .from('employees')
              .update({ profile_id: userId })
              .eq('employee_id', empData.employee_id)
              .select()
              .single();

            if (updateError) {
              await supabase.from('profiles').delete().eq('id', userId);
              await supabase.auth.admin.deleteUser(userId);
              errors.push({ email, error: `Employee link error: ${updateError.message}` });
              continue;
            }
          } else {
            if (!empData.employee_id || !empData.department_id || !empData.designation_id || !empData.joining_date) {
              await supabase.from('profiles').delete().eq('id', userId);
              await supabase.auth.admin.deleteUser(userId);
              errors.push({ email, error: 'Employee details are required for employee role' });
              continue;
            }

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
              await supabase.from('profiles').delete().eq('id', userId);
              await supabase.auth.admin.deleteUser(userId);
              errors.push({ email, error: `Employee record error: ${empError.message}` });
              continue;
            }
          }
        }

        successCount++;
      } catch (err: unknown) {
        errors.push({ email: body.email || 'Unknown', error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    if (errors.length > 0 && successCount === 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    if (errors.length > 0) {
      // Partial success
      return NextResponse.json({ count: successCount, errors }, { status: 207 });
    }

    return NextResponse.json({ count: successCount }, { status: 201 });
  } catch (err: unknown) {
    console.error('Bulk Create User Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
