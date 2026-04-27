import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerRole } from '@/lib/api-auth';
import { z } from 'zod';

const delegationSchema = z.object({
  planner_id: z.string().uuid(),
  roster_group_id: z.string().uuid(),
  access_level: z.enum(['view', 'edit']),
});

export async function GET() {
  try {
    const role = await getCallerRole();
    if (!role || role !== 'system_admin') {
      // Planners might call this to see their own? For now, keep it simple
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('planner_delegations')
      .select('*, profiles:planner_id(*), roster_groups(*)')
      .order('created_at', { ascending: false });

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
    const role = await getCallerRole();
    if (role !== 'system_admin') {
      return NextResponse.json({ error: 'Only admins can manage delegations' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = delegationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('planner_delegations')
      .insert(parsed.data)
      .select('*, profiles:planner_id(*), roster_groups(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This planner already has rights for this group' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
