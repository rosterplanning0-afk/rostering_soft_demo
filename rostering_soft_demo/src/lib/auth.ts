import { createClient } from './supabase/client';
import { Profile, UserRole } from '@/types';

export async function signUp(email: string, password: string, fullName: string, role: UserRole) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return data as Profile;
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'system_admin';
}

export function canManageShifts(role: UserRole): boolean {
  return ['system_admin', 'roster_planner'].includes(role);
}

export function canManageRosters(role: UserRole): boolean {
  return ['system_admin', 'roster_planner', 'manager'].includes(role);
}
