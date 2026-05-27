import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;
  const role = searchParams.get('role');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let allowedIds: string[] = [];
    if (role === 'roster_planner') {
      const { data: delData } = await supabase.from('planner_delegations')
        .select('roster_group_id')
        .eq('planner_id', user.id);
      if (delData) {
        allowedIds = delData.map(d => d.roster_group_id);
      }
    }

    let empQuery = supabase.from('employees').select('id', { count: 'exact', head: true });
    let dutyQuery = supabase.from('duties').select('id', { count: 'exact', head: true }).is('expiry_date', null);
    
    // Only join employees if we need to filter by roster_group_id
    const assignSelect = role === 'roster_planner' ? 'id, employees!inner(roster_group_id)' : 'id';
    let assignQuery = supabase.from('duty_assignments').select(assignSelect, { count: 'exact', head: true }).eq('status', 'draft');
    
    const reqSelect = role === 'roster_planner' ? 'id, employees!inner(roster_group_id)' : 'id';
    let reqQuery = supabase.from('employee_requests').select(reqSelect, { count: 'exact', head: true }).eq('status', 'pending');
    
    let recentReqQuery = supabase.from('employee_requests')
      .select('id, request_type, request_date, status, created_at, employees!inner(first_name, last_name, employee_id, roster_group_id)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(4);

    if (role === 'roster_planner') {
      if (allowedIds.length > 0) {
        empQuery = empQuery.in('roster_group_id', allowedIds);
        dutyQuery = dutyQuery.or(`roster_group_id.in.(${allowedIds.join(',')}),roster_group_id.is.null`);
        assignQuery = assignQuery.in('employees.roster_group_id', allowedIds);
        reqQuery = reqQuery.in('employees.roster_group_id', allowedIds);
        recentReqQuery = recentReqQuery.in('employees.roster_group_id', allowedIds);
      } else {
        empQuery = empQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        dutyQuery = dutyQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        assignQuery = assignQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        reqQuery = reqQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        recentReqQuery = recentReqQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    const [
      { count: empCount },
      { count: dutyCount },
      { count: draftCount },
      { count: reqCount },
      { data: recentReqs }
    ] = await Promise.all([
      empQuery,
      dutyQuery,
      assignQuery,
      reqQuery,
      recentReqQuery
    ]);

    return NextResponse.json({
      stats: {
        totalEmployees: empCount || 0,
        activeDuties: dutyCount || 0,
        draftAssignments: draftCount || 0,
        pendingRequests: reqCount || 0
      },
      recentRequests: recentReqs || []
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
