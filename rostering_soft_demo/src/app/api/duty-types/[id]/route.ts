import { createAdminClient } from '@/lib/supabase/server';
import { getCallerRole } from '@/lib/api-auth';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const role = await getCallerRole();
  if (!role || role === 'employee') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('duty_types')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const role = await getCallerRole();
  if (role !== 'system_admin') {
    return NextResponse.json({ error: 'Only administrators can delete duty types' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('duty_types')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
