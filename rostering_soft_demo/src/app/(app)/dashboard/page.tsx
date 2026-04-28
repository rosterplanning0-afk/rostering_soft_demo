'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import EmployeeDashboard from './EmployeeDashboard';
import PlannerDashboard from './PlannerDashboard';
import ManagerDashboard from './ManagerDashboard';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) setProfile(profileData as Profile);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-primary/20"></div>
          <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-400 font-medium animate-pulse">Synchronizing with central railway...</p>
      </div>
    );
  }

  if (profile?.role === 'employee') {
    return <EmployeeDashboard userId={profile.id} />;
  }
  
  if (profile?.role === 'manager') {
    return <ManagerDashboard userId={profile.id} userName={profile.full_name || 'Manager'} role={profile.role} />;
  }

  return <PlannerDashboard userId={profile?.id || ''} userName={profile?.full_name || 'Planner'} role={profile?.role || 'roster_planner'} />;
}
