import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCallerRole } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const role = await getCallerRole();
    if (role !== 'system_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    let query = supabase
      .from('audit_logs')
      .select('*, profiles(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (category && category !== 'ALL') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
