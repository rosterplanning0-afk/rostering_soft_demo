'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import FormField, { Input, Select, Button } from '@/components/FormField';
import { Employee, Department, Designation, RosterGroup } from '@/types';
import { UserPlus, Shield, User, Mail, Key, UserCircle } from 'lucide-react';
import BulkStaffUpload from '@/components/BulkStaffUpload';

const emptyForm = { 
  full_name: '', 
  role: 'employee' as UserRole,
  email: '',
  password: '',
  employee_id: '',
  department_id: '',
  designation_id: '',
  roster_group_id: '' as string | null,
  joining_date: new Date().toISOString().split('T')[0],
  gender: 'male' as 'male' | 'female' | 'other',
  creation_mode: 'both' as 'both' | 'login_only'
};

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [rosterGroups, setRosterGroups] = useState<RosterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [resetting, setResetting] = useState(false);
  const { canManageUsers, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !canManageUsers) {
      router.replace('/dashboard');
    }
  }, [authLoading, canManageUsers, router]);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [profRes, empRes, deptRes, desigRes, rgRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
      supabase.from('employees').select('employee_id, profile_id'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('designations').select('*').order('name'),
      supabase.from('roster_groups').select('*').order('name'),
    ]);
    
    setProfiles((profRes.data ?? []) as Profile[]);
    setEmployees((empRes.data ?? []) as Employee[]);
    setDepartments((deptRes.data ?? []) as Department[]);
    setDesignations((desigRes.data ?? []) as Designation[]);
    setRosterGroups((rgRes.data ?? []) as RosterGroup[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (profile: Profile) => {
    setEditing(profile);
    setForm({ 
      ...emptyForm,
      full_name: profile.full_name ?? '', 
      role: profile.role 
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
        const url = editing ? `/api/profiles/${editing.id}` : '/api/profiles';
        const method = editing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Failed to ${editing ? 'update' : 'create'} user`);

        setModalOpen(false);
        fetchProfiles();
    } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async (profile: Profile) => {
    if (!confirm(`Are you sure you want to revoke network access for "${profile.full_name}"?`)) return;
    try {
        const response = await fetch(`/api/profiles/${profile.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete user');
        fetchProfiles();
    } catch (err) {
        alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/users/${resetTarget.id}/reset-password`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      alert(`Password has been reset to default successfully for ${resetTarget.full_name}. They will be required to change it on their next login.`);
      setResetTarget(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred while resetting password');
    } finally {
      setResetting(false);
    }
  };

  const columns = [
    { 
        key: 'full_name', 
        header: 'Staff Identity',
        render: (p: Profile) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-primary capitalize">
                    {p.full_name?.charAt(0) || '?'}
                </div>
                <span className="font-bold text-slate-900">{p.full_name ?? 'Unnamed User'}</span>
            </div>
        )
    },
    {
      key: 'role',
      header: 'Clearance Level',
      render: (p: Profile) => {
          const colors: Record<string, string> = {
              system_admin: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
              roster_planner: 'bg-primary/10 text-primary border-primary/20',
              manager: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
              employee: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          };
          return (
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${colors[p.role] || colors.employee}`}>
              {p.role.replace('_', ' ')}
            </span>
          );
      },
    },
    {
      key: 'created_at',
      header: 'Enrolled On',
      render: (p: Profile) => (
          <span className="text-slate-500 font-medium">
              {new Date(p.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Staff Directory</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-wide">Manage authorized personnel and role-based access control.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button onClick={() => setBulkModalOpen(true)} className="h-12 w-full sm:w-auto px-6 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold">
            <UserPlus className="w-5 h-5" />
            Bulk Enrol Staff
          </Button>
          <Button onClick={openCreate} className="h-12 w-full sm:w-auto px-8 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/20 transition-all">
            <UserPlus className="w-5 h-5" />
            Enrol New Staff
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={profiles}
        loading={loading}
        onEdit={openEdit}
        onDelete={handleDelete}
        onCustomAction={{
          icon: <Key className="w-4 h-4" />,
          title: "Reset Password",
          onClick: (profile) => setResetTarget(profile),
          className: "p-2 rounded-lg hover:bg-white hover:text-amber-600 hover:shadow-sm hover:border-border border border-transparent transition-all",
        }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modify Personnel Credentials' : 'Enrol New Staff Member'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
              Discard
            </Button>
            <Button type="submit" form="form-users" disabled={saving} className="min-w-[160px] bg-primary hover:bg-primary-dark text-white shadow-md rounded-xl">
              {saving ? 'Processing...' : editing ? 'Update Credentials' : 'Enrol Member'}
            </Button>
          </div>
        }
      >
        <form id="form-users" onSubmit={handleSave} className="space-y-6 p-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs font-bold animate-in fade-in zoom-in-95 mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="Full Name" icon={<User className="w-4 h-4" />}>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                placeholder="John Doe"
                className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white transition-all"
              />
            </FormField>

            <FormField label="Access Role" icon={<Shield className="w-4 h-4" />}>
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="bg-slate-50 border-slate-200 text-slate-900"
              >
                <option value="employee">Employee</option>
                <option value="roster_planner">Roster Planner</option>
                <option value="manager">Manager</option>
                <option value="system_admin">System Admin</option>
              </Select>
            </FormField>
          </div>

          {!editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <FormField label="Email Address" icon={<Mail className="w-4 h-4" />}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="john@example.com"
                  className="bg-white border-slate-200 text-slate-900"
                />
              </FormField>

              <FormField label="Network Password" icon={<Key className="w-4 h-4" />}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  className="bg-white border-slate-200 text-slate-900"
                />
              </FormField>
            </div>
          )}

          {form.role === 'employee' && !editing && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Creation Mode</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="creation_mode" 
                      value="both" 
                      checked={form.creation_mode === 'both'} 
                      onChange={() => setForm({ ...form, creation_mode: 'both' })}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm text-slate-700">Create Login & Employee Data</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="creation_mode" 
                      value="login_only" 
                      checked={form.creation_mode === 'login_only'} 
                      onChange={() => setForm({ ...form, creation_mode: 'login_only' })}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm text-slate-700">Create Login Only (Link to Existing)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {form.role === 'employee' && !editing && (
            <div className="space-y-5 p-5 bg-primary/5 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <UserCircle className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-slate-900">Employment Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField label="Employee ID">
                  <Input
                    value={form.employee_id}
                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                    required
                    placeholder="EMP001"
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </FormField>

                {form.creation_mode === 'both' && (
                  <FormField label="Joining Date">
                    <Input
                      type="date"
                      value={form.joining_date}
                      onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                      required
                      className="bg-white border-slate-200 text-slate-900"
                    />
                  </FormField>
                )}
              </div>

              {form.creation_mode === 'both' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField label="Department">
                      <Select
                        value={form.department_id}
                        onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                        required
                        className="bg-white border-slate-200 text-slate-900"
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </Select>
                    </FormField>

                    <FormField label="Designation">
                      <Select
                        value={form.designation_id}
                        onChange={(e) => setForm({ ...form, designation_id: e.target.value })}
                        required
                        className="bg-white border-slate-200 text-slate-900"
                      >
                        <option value="">Select Designation</option>
                        {designations
                          .filter(d => !form.department_id || d.department_id === form.department_id)
                          .map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                        }
                      </Select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField label="Roster Group">
                      <Select
                        value={form.roster_group_id || ''}
                        onChange={(e) => setForm({ ...form, roster_group_id: e.target.value || null })}
                        className="bg-white border-slate-200 text-slate-900"
                      >
                        <option value="">No Roster Group</option>
                        {rosterGroups
                          .filter(rg => !form.department_id || rg.department_id === form.department_id)
                          .map(rg => <option key={rg.id} value={rg.id}>{rg.name}</option>)
                        }
                      </Select>
                    </FormField>

                    <FormField label="Gender">
                      <Select
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' | 'other' })}
                        className="bg-white border-slate-200 text-slate-900"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </Select>
                    </FormField>
                  </div>
                </>
              )}
            </div>
          )}
        </form>
      </Modal>

      <BulkStaffUpload
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={fetchProfiles}
        employees={employees}
        departments={departments}
        designations={designations}
        rosterGroups={rosterGroups}
      />

      <Modal
        open={!!resetTarget}
        onClose={() => !resetting && setResetTarget(null)}
        title="Reset User Password"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setResetTarget(null)} disabled={resetting}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting} className="bg-amber-600 hover:bg-amber-700 text-white">
              {resetting ? 'Resetting...' : 'Confirm Reset'}
            </Button>
          </div>
        }
      >
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto">
            <Key className="w-6 h-6" />
          </div>
          <p className="text-center text-sm text-slate-600">
            Are you sure you want to reset the password for <strong>{resetTarget?.full_name}</strong>?
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Password will be reset to the default: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">DBrrts@123</code></li>
              <li>The user will be forced to change it on their next login.</li>
              <li>All active sessions for this user will <strong>not</strong> be automatically terminated, but they will need the new password for future logins.</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}
