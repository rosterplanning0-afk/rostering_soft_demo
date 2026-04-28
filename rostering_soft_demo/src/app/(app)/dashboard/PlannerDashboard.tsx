'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Users,
  ClipboardList,
  AlertCircle,
  Clock,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  CalendarClock
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  totalEmployees: number;
  activeDuties: number;
  draftAssignments: number;
  pendingRequests: number;
}

interface PendingRequest {
  id: string;
  request_type: 'leave' | 'shift_change';
  request_date: string;
  status: string;
  created_at: string;
  employees: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

export default function PlannerDashboard({ userId, userName, role }: { userId: string, userName: string, role: string }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeDuties: 0,
    draftAssignments: 0,
    pendingRequests: 0
  });
  const [recentRequests, setRecentRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadStats() {
      try {
        let allowedIds: string[] = [];
        if (role === 'roster_planner') {
          const { data: delData } = await supabase.from('planner_delegations')
            .select('roster_group_id')
            .eq('planner_id', userId);
          if (delData) {
            allowedIds = delData.map(d => d.roster_group_id);
          }
        }

        // Base queries
        let empQuery = supabase.from('employees').select('*', { count: 'exact', head: true });
        let dutyQuery = supabase.from('duties').select('*', { count: 'exact', head: true }).is('expiry_date', null);
        let assignQuery = supabase.from('duty_assignments').select('*, employees!inner(roster_group_id)', { count: 'exact', head: true }).eq('status', 'draft');
        let reqQuery = supabase.from('employee_requests').select('*, employees!inner(roster_group_id)', { count: 'exact', head: true }).eq('status', 'pending');
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
            // If no delegations, they see nothing
            empQuery = empQuery.eq('id', '00000000-0000-0000-0000-000000000000');
            dutyQuery = dutyQuery.eq('id', '00000000-0000-0000-0000-000000000000');
            assignQuery = assignQuery.eq('id', '00000000-0000-0000-0000-000000000000');
            reqQuery = reqQuery.eq('id', '00000000-0000-0000-0000-000000000000');
            recentReqQuery = recentReqQuery.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        }

        // Fetch stats in parallel
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

        setStats({
          totalEmployees: empCount || 0,
          activeDuties: dutyCount || 0,
          draftAssignments: draftCount || 0,
          pendingRequests: reqCount || 0
        });

        if (recentReqs) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setRecentRequests(recentReqs as any);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [role, userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-emerald-500/20"></div>
          <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-400 font-medium animate-pulse">Loading Planner Workspace...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Action Required",
      value: stats.pendingRequests,
      subtitle: "Pending employee requests",
      icon: AlertCircle,
      color: "bg-rose-50 text-rose-600 border-rose-100",
      iconColor: "text-rose-500",
      href: "/employee-requests"
    },
    {
      title: "Draft Assignments",
      value: stats.draftAssignments,
      subtitle: "Unpublished roster entries",
      icon: Clock,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      iconColor: "text-amber-500",
      href: "/dispatch"
    },
    {
      title: "Total Staff",
      value: stats.totalEmployees,
      subtitle: "Active employees in system",
      icon: Users,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      iconColor: "text-blue-500",
      href: "/employees"
    },
    {
      title: "Active Duties",
      value: stats.activeDuties,
      subtitle: "Defined shift patterns",
      icon: Briefcase,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      iconColor: "text-indigo-500",
      href: "/duties"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-emerald-100/50 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-md">
              {role.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {userName.split(' ')[0]}
          </h1>
          <p className="mt-2 text-slate-500 font-medium max-w-lg">
            Here&apos;s what&apos;s happening with your rostering operations today. You have {stats.pendingRequests} pending requests requiring your attention.
          </p>
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/dispatch"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow active:scale-95"
          >
            <CalendarClock className="w-4 h-4" />
            Open Roster Dispatch
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link key={idx} href={stat.href} className="block group">
              <div className={`p-6 rounded-3xl border ${stat.color} transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden h-full`}>
                <div className="absolute right-[-10%] top-[-10%] opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Icon className="w-32 h-32" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                  <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-2xl bg-white/60 backdrop-blur-sm ${stat.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black tracking-tight mb-1">{stat.value}</h3>
                    <p className="text-sm font-bold opacity-90">{stat.title}</p>
                    <p className="text-xs font-medium opacity-70 mt-1">{stat.subtitle}</p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Requests Table */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Recent Pending Requests</h2>
            </div>
            <Link href="/employee-requests" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group">
              View All <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="flex-1 p-0 overflow-auto">
            {recentRequests.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Employee</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Type</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Target Date</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {req.employees?.first_name?.charAt(0)}{req.employees?.last_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{req.employees?.first_name} {req.employees?.last_name}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{req.employees?.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                          req.request_type === 'leave' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {req.request_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-700">
                          {format(new Date(req.request_date), 'dd MMM yyyy')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href="/employee-requests"
                          className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Review Request"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-slate-900 font-bold">All Caught Up!</p>
                <p className="text-sm text-slate-500 mt-1">There are no pending employee requests at the moment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-slate-900 rounded-[32px] p-6 text-white relative overflow-hidden flex flex-col">
          {/* Abstract pattern */}
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
            <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M45.7,-76.3C58.9,-69.3,69.1,-55.3,77.5,-41.1C85.9,-26.9,92.5,-12.5,91.3,1.3C90.1,15.1,81.1,28.3,71.2,39.6C61.3,50.9,50.5,60.3,38.1,68.6C25.7,76.9,11.7,84.1,-2.9,89.1C-17.5,94.1,-32.7,96.9,-45.3,90.4C-57.9,83.9,-67.9,68.1,-75.7,52.4C-83.5,36.7,-89.1,21.1,-87.3,6.2C-85.5,-8.7,-76.3,-22.9,-66.3,-34.5C-56.3,-46.1,-45.5,-55.1,-33.4,-62.8C-21.3,-70.5,-7.9,-76.9,6.1,-77.9C20.1,-78.9,32.5,-83.3,45.7,-76.3Z" transform="translate(100 100)" />
            </svg>
          </div>
          
          <div className="relative z-10 flex-1 flex flex-col">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Quick Links</h2>
            
            <div className="space-y-3 flex-1">
              {[
                { name: 'Duty Configurations', desc: 'Manage shift timings & locations', href: '/duties', icon: Briefcase },
                { name: 'Staff Directory', desc: 'Manage employee database', href: '/employees', icon: Users },
                { name: 'Publish Rosters', desc: 'Confirm draft assignments', href: '/dispatch', icon: ClipboardList }
              ].map((link, i) => {
                const Icon = link.icon;
                return (
                  <Link 
                    key={i} 
                    href={link.href}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-white/10 text-white">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{link.name}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">{link.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors group-hover:translate-x-1" />
                  </Link>
                )
              })}
            </div>
            
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-100">System Status: Optimal</p>
                  <p className="text-[10px] text-emerald-200/70 mt-1 leading-tight">
                    Rostering engine is online. All background synchronizations completed successfully.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
