import { createAdminClient } from '@/lib/supabase/server';

export type LogCategory = 
  | 'EMPLOYEE_MANAGEMENT' 
  | 'ROSTER_PLANNING' 
  | 'DISPATCH' 
  | 'USER_MANAGEMENT'
  | 'SYSTEM';

export interface AuditLogParams {
  action: string;
  category: LogCategory;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  actor_id?: string; // If not provided, it can be fetched or left null for system actions
}

export async function logAuditAction(params: AuditLogParams) {
  try {
    const supabase = createAdminClient();
    
    await supabase.from('audit_logs').insert({
      actor_id: params.actor_id || null,
      action: params.action,
      category: params.category,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      details: params.details || null,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
