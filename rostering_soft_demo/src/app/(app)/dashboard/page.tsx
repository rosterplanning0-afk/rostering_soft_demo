'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import Link from 'next/link';
import EmployeeDashboard from './EmployeeDashboard';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nextRoster, setNextRoster] = useState<any>(null);
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

      const today = new Date().toISOString().split('T')[0];
      
      // Get the employee record linked to this profile
      const { data: empData } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      const { data: assignmentData } = await supabase
        .from('duty_assignments')
        .select('*, duties(*)')
        .eq('employee_id', empData?.id || '')
        .gte('assignment_date', today)
        .order('assignment_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (assignmentData) {
        // Adapt the assignment data to the component's expectations
        const adaptedRoster = {
          ...assignmentData,
          roster_date: assignmentData.assignment_date,
          shifts: assignmentData.duties ? {
            name: assignmentData.duties.duty_name,
            start_time: assignmentData.duties.start_time,
            end_time: assignmentData.duties.end_time
          } : null
        };
        setNextRoster(adaptedRoster as any);
      }
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-2 text-slate-600 font-medium">
            Welcome back, <span className="text-primary font-bold">{profile?.full_name || 'Railway Professional'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm font-semibold">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Next Shift Card */}
        <div className="lg:col-span-2 group">
          <div className="relative h-full bg-gradient-to-br from-primary/10 to-blue-600/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/10">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
               <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </div>
            
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Upcoming Shift</h2>
            
            {nextRoster?.shifts ? (
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-primary animate-pulse"></span>
                    <p className="text-3xl font-black text-slate-900">
                      {nextRoster.shifts.name}
                    </p>
                  </div>
                  <p className="text-lg text-slate-500 font-medium italic">
                    {new Date(nextRoster.roster_date).toLocaleDateString('en-US', { dateStyle: 'full' })}
                  </p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Timing</p>
                    <div className="px-6 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                       <span className="text-xl font-bold text-slate-900 tracking-tight">
                         {nextRoster.shifts.start_time.slice(0,5)} — {nextRoster.shifts.end_time.slice(0,5)}
                       </span>
                    </div>
                  </div>
                  
                  <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                    nextRoster.status === 'confirmed'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    • {nextRoster.status}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-slate-500 font-semibold text-lg italic tracking-wide">No upcoming duties scheduled</p>
                <Link href="/rosters" className="mt-4 text-primary font-bold hover:underline">Request Assignment →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Insights / Role */}
        <div className="space-y-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all hover:bg-white/[0.07]">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Official Designation</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-white/10">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 capitalize">
                  {profile?.role?.replace('_', ' ')}
                </p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Authorized Personnel</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all hover:bg-white/[0.07]">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Demo Navigation</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/dispatch"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-primary/10 hover:border-primary/20 transition-all group"
              >
                <svg className="w-5 h-5 text-slate-500 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-bold text-slate-600">Dispatch</span>
              </Link>
              <Link
                href="/duties"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all group"
              >
                <svg className="w-5 h-5 text-slate-500 group-hover:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-bold text-slate-600">Duties</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
