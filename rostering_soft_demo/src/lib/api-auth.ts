import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@/types';

export async function getCallerInfo(): Promise<{ role: UserRole | null, userId: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { role: null, userId: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return { role: (profile?.role as UserRole) ?? null, userId: user.id };
}

export async function getCallerRole(): Promise<UserRole | null> {
  const info = await getCallerInfo();
  return info.role;
}

export function canManageRosters(role: UserRole): boolean {
  return ['system_admin', 'roster_planner', 'manager'].includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'system_admin';
}

export function canManageDepartments(role: UserRole): boolean {
  return role === 'system_admin' || role === 'roster_planner';
}

export function canManageEmployees(role: UserRole): boolean {
  return role === 'system_admin' || role === 'roster_planner';
}
