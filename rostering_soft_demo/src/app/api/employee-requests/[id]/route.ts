import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerRole } from '@/lib/api-auth';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = await getCallerRole();
    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    
    // First check status
    const { data: existing, error: fetchError } = await supabase
      .from('employee_requests')
      .select('status')
      .eq('id', params.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending requests can be deleted' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('employee_requests')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
