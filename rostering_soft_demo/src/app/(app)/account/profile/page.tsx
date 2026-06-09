'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Employee } from '@/types';
import { UserCircle, Mail, Key, Shield, Building2, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/FormField';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function ProfilePage() {
  const { profile } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!profile?.id) return;
      
      const supabase = createClient();
      
      // Get user email from auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
      }

      // Fetch employee details if linked
      const { data: empData, error } = await supabase
        .from('employees')
        .select('*, departments(name), designations(name)')
        .eq('profile_id', profile.id)
        .single();
        
      if (!error && empData) {
        setEmployee(empData as Employee);
      }
      
      setLoading(false);
    }
    
    fetchData();
  }, [profile?.id]);

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account settings and credentials</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
          <Key className="w-4 h-4" />
          Change Password
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 text-center border-b border-slate-100 bg-slate-50/50">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCircle className="w-10 h-10" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{profile.full_name}</h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium mt-2 capitalize">
                <Shield className="w-3 h-3" />
                {profile.role.replace('_', ' ')}
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="flex items-center gap-2 mt-1 text-slate-900 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {email || 'Loading...'}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Created</label>
                <div className="mt-1 text-slate-900 text-sm">
                  {new Date(profile.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Info Card */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Employment Details</h3>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                </div>
              ) : employee ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee ID</label>
                    <div className="mt-1 text-slate-900 font-medium">{employee.employee_id}</div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</label>
                    <div className="flex items-center gap-2 mt-1 text-slate-900">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {employee.departments?.name || 'Unknown'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Designation</label>
                    <div className="mt-1 text-slate-900">{employee.designations?.name || 'Unknown'}</div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Joining Date</label>
                    <div className="flex items-center gap-2 mt-1 text-slate-900">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(employee.joining_date).toLocaleDateString()}
                    </div>
                  </div>

                  {employee.assigned_station && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Station</label>
                      <div className="flex items-center gap-2 mt-1 text-slate-900">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {employee.assigned_station}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <UserCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p>No employment record linked to this profile.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />
    </div>
  );
}
