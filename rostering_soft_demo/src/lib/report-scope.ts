import { createAdminClient } from '@/lib/supabase/server';
import { UserRole } from '@/types';

export interface ReportScope {
  rosterGroupIds: string[] | null; // null = no restriction (system_admin)
  departmentIds: string[] | null;  // null = no restriction (system_admin)
}

export async function getReportScope(role: UserRole, userId: string): Promise<ReportScope> {
  if (role === 'system_admin') {
    return { rosterGroupIds: null, departmentIds: null };
  }

  const supabase = createAdminClient();

  if (role === 'roster_planner') {
    const { data } = await supabase
      .from('planner_delegations')
      .select('roster_group_id')
      .eq('planner_id', userId);
    const rgIds = (data ?? []).map((d: { roster_group_id: string }) => d.roster_group_id);
    return { rosterGroupIds: rgIds, departmentIds: null };
  }

  if (role === 'manager') {
    const { data: emp } = await supabase
      .from('employees')
      .select('department_id, roster_group_id')
      .eq('profile_id', userId)
      .single();
    return {
      departmentIds: emp?.department_id ? [emp.department_id] : [],
      rosterGroupIds: emp?.roster_group_id ? [emp.roster_group_id] : [],
    };
  }

  return { rosterGroupIds: [], departmentIds: [] };
}
