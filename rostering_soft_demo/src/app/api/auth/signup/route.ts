import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.enum(['system_admin', 'roster_planner', 'manager', 'employee']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password, full_name, role } = parsed.data;
    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Profile creation is handled by the database trigger, but we can do an explicit upsert for safety
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name,
      role,
    });

    return NextResponse.json({ user: data.user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
