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

  if (role === 'roster_planner' || role === 'manager') {
    const { data: delegations } = await supabase
      .from('planner_delegations')
      .select('roster_group_id')
      .eq('planner_id', userId);
    
    const rgIds = (delegations ?? []).map((d: { roster_group_id: string }) => d.roster_group_id);

    if (role === 'manager') {
      const { data: emp } = await supabase
        .from('employees')
        .select('department_id, roster_group_id')
        .eq('profile_id', userId)
        .single();
      
      if (emp?.department_id) {
        // Managers usually see everything in their department
        return { 
          departmentIds: [emp.department_id], 
          rosterGroupIds: null // null means see all groups in those departments
        };
      }
      
      if (emp?.roster_group_id) rgIds.push(emp.roster_group_id);
    }

    return { rosterGroupIds: rgIds, departmentIds: null };
  }

  return { rosterGroupIds: [], departmentIds: [] };
}
