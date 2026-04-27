'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
  canManageRosters: boolean;
  canManageUsers: boolean;
  canManageDepartments: boolean;
  canManageEmployees: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  loading: true,
  role: null,
  canManageRosters: false,
  canManageUsers: false,
  canManageDepartments: false,
  canManageEmployees: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data as Profile);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const role = profile?.role ?? null;

  const value: AuthContextValue = {
    profile,
    loading,
    role,
    canManageRosters: role === 'system_admin' || role === 'roster_planner' || role === 'manager',
    canManageUsers: role === 'system_admin',
    canManageDepartments: role === 'system_admin' || role === 'roster_planner',
    canManageEmployees: role === 'system_admin' || role === 'roster_planner',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
