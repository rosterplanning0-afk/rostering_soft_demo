import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select('*')
      .order('role');

    if (error) {
      // If table doesn't exist yet, we will just return empty array
      if (error.code === '42P01') {
        return NextResponse.json({ permissions: [] });
      }
      throw error;
    }

    return NextResponse.json({ permissions: permissions || [] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching role permissions:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only allow system_admin to update
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { permissions } = body; // Expected to be an array of { role, visible_items }

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('role_permissions')
      .upsert(
        permissions.map((p: { role: string; visible_items: string[] }) => ({
          role: p.role,
          visible_items: p.visible_items,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'role' }
      )
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating role permissions:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
