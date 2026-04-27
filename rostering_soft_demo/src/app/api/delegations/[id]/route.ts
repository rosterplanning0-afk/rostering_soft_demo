import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerRole } from '@/lib/api-auth';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = await getCallerRole();
    if (role !== 'system_admin') {
      return NextResponse.json({ error: 'Only admins can remove delegations' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('planner_delegations')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
