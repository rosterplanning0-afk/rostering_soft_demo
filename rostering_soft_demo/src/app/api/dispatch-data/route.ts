import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile to check role for delegations
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;

  try {
    // Use admin client for some static tables if RLS is strict, or just use regular supabase if RLS allows
    // Assuming RLS allows read for authenticated users for most of these.
    const [
      empRes,
      dutyRes,
      deptRes,
      rgRes,
      assignRes,
      dtRes,
      reqRes,
      delRes,
      rulesRes
    ] = await Promise.all([
      supabase.from('employees').select('*, departments(*), designations(*), roster_groups(*)').order('first_name'),
      supabase.from('duties').select('*, departments(*), roster_groups(*), designations(*), duty_types(*)').order('duty_name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('roster_groups').select('*').order('name'),
      supabase.from('duty_assignments')
        .select('*, employees(*), duties(*, duty_types(*))')
        .gte('assignment_date', startDate) // Note: original code did subDays(startDate, 14), we can just do that in UI or here.
        .lte('assignment_date', endDate),
      supabase.from('duty_types').select('*').order('name'),
      supabase.from('employee_requests')
        .select('*, target_duty:duties(*)')
        .gte('request_date', startDate)
        .lte('request_date', endDate)
        .then(res => res.error ? { data: [] } : res),
      role === 'roster_planner' 
        ? supabase.from('planner_delegations').select('roster_group_id, access_level').eq('planner_id', profile?.id) 
        : Promise.resolve({ data: [] }),
      fetch(new URL('/api/rules', request.url)).then(r => r.json()).catch(() => ({}))
    ]);

    return NextResponse.json({
      employees: empRes.data || [],
      duties: dutyRes.data || [],
      departments: deptRes.data || [],
      rosterGroups: rgRes.data || [],
      assignments: assignRes.data || [],
      dutyTypes: dtRes.data || [],
      requests: reqRes.data || [],
      delegations: delRes.data || [],
      rules: rulesRes
    });
  } catch (error) {
    console.error('Error fetching dispatch data:', error);
    return NextResponse.json({ error: 'Failed to fetch dispatch data' }, { status: 500 });
  }
}
