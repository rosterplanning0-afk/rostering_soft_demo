'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Employee, Department, Designation, RosterGroup } from '@/types';
import { useAuth } from '@/context/AuthContext';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import FormField, { Input, Select, Button } from '@/components/FormField';
import locationsData from '@/data/locations.json';

const emptyForm = {
  employee_id: '',
  first_name: '',
  last_name: '',
  address: '',
  gender: '',
  department_id: '',
  designation_id: '',
  joining_date: '',
  resigned_date: '',
  relieved_date: '',
  nearby_station: '',
  roster_group_id: '',
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [rosterGroups, setRosterGroups] = useState<RosterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delegations, setDelegations] = useState<{ roster_group_id: string; access_level: 'view' | 'edit' }[]>([]);
  const { role, profile, canManageEmployees } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [empRes, deptRes, desigRes, rgRes, delRes] = await Promise.all([
      supabase.from('employees').select('*, departments(*), designations(*), roster_groups(*)').order('first_name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('designations').select('*').order('name'),
      supabase.from('roster_groups').select('*').order('name'),
      role === 'roster_planner' ? supabase.from('planner_delegations').select('roster_group_id, access_level').eq('planner_id', profile?.id) : Promise.resolve({ data: [] })
    ]);
    setEmployees((empRes.data ?? []) as Employee[]);
    setDepartments((deptRes.data ?? []) as Department[]);
    setDesignations((desigRes.data ?? []) as Designation[]);
    setRosterGroups((rgRes.data ?? []) as RosterGroup[]);
    setDelegations((delRes.data || []) as Array<{ roster_group_id: string; access_level: 'view' | 'edit' }>);
    setLoading(false);
  }, [profile?.id, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (role === 'roster_planner') {
      const allowedIds = delegations.map(d => d.roster_group_id);
      result = result.filter(e => e.roster_group_id && allowedIds.includes(e.roster_group_id));
    }
    return result;
  }, [employees, delegations, role]);

  const canEdit = useMemo(() => {
    if (role === 'system_admin') return true;
    if (role !== 'roster_planner') return false;
    return delegations.some(d => d.access_level === 'edit');
  }, [role, delegations]);

  // Filter roster groups by selected department in the form
  const filteredRosterGroups = useMemo(() => {
    let result = rosterGroups;
    if (role === 'roster_planner') {
      const allowedIds = delegations.map(d => d.roster_group_id);
      result = result.filter(rg => allowedIds.includes(rg.id));
    }
    if (form.department_id) result = result.filter((rg) => rg.department_id === form.department_id);
    return result;
  }, [form.department_id, rosterGroups, delegations, role]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      employee_id: emp.employee_id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      address: emp.address ?? '',
      gender: emp.gender ?? '',
      department_id: emp.department_id,
      designation_id: emp.designation_id,
      joining_date: emp.joining_date,
      resigned_date: emp.resigned_date ?? '',
      relieved_date: emp.relieved_date ?? '',
      nearby_station: emp.nearby_station ?? '',
      roster_group_id: emp.roster_group_id ?? '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      address: form.address || null,
      gender: form.gender || null,
      resigned_date: form.resigned_date || null,
      relieved_date: form.relieved_date || null,
      nearby_station: form.nearby_station || null,
      roster_group_id: form.roster_group_id || null,
    };

    try {
      const response = editing
        ? await fetch(`/api/employees/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save employee');

      setModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Are you sure you want to delete employee "${emp.first_name} ${emp.last_name}"?`)) return;
    try {
      const response = await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete employee');
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const columns = [
    {
      key: 'employee_id',
      header: 'Emp ID',
      render: (emp: Employee) => (
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-border dark:border-white/10 text-primary text-xs font-bold">
          {emp.employee_id}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (emp: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-border dark:border-white/10 flex items-center justify-center text-[10px] font-bold text-primary capitalize">
            {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
          </div>
          <span className="font-bold text-slate-900">{emp.first_name} {emp.last_name}</span>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (emp: Employee) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{emp.departments?.name ?? '—'}</span>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (emp: Employee) => (
        <span className="text-slate-500 dark:text-slate-400 font-medium">{emp.designations?.name ?? '—'}</span>
      ),
    },
    {
      key: 'roster_group',
      header: 'Roster Group',
      render: (emp: Employee) => (
        <span className="text-slate-500 font-medium">{emp.roster_groups?.name ?? '—'}</span>
      ),
    },
    {
      key: 'joining_date',
      header: 'Joined',
      render: (emp: Employee) => (
        <span className="text-slate-500 font-medium">
          {new Date(emp.joining_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Employees</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium tracking-wide">Manage employee records and roster assignments.</p>
        </div>
        {canManageEmployees && (
          <Button onClick={openCreate} className="h-12 px-8 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Employee
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredEmployees}
        loading={loading}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Employee' : 'New Employee'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="text-slate-500 dark:text-slate-400">
              Discard
            </Button>
            <Button type="submit" form="form-employees" disabled={saving} className="min-w-[140px] bg-emerald-500 hover:bg-emerald-600">
              {saving ? 'Saving...' : editing ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        }
      >
        <form id="form-employees" onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs font-bold animate-in fade-in zoom-in-95 mb-4">
              {error}
            </div>
          )}

          {/* Row 1: ID and Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Employee ID">
              <Input
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                required
                placeholder="e.g. EMP-001"
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
            <FormField label="First Name">
              <Input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
                placeholder="First name"
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
            <FormField label="Last Name">
              <Input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
                placeholder="Last name"
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
          </div>

          {/* Row 2: Gender and Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Gender">
              <Select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              >
                <option value="" className="bg-white text-slate-900">Select gender...</option>
                <option value="male" className="bg-white text-slate-900">Male</option>
                <option value="female" className="bg-white text-slate-900">Female</option>
                <option value="other" className="bg-white text-slate-900">Other</option>
              </Select>
            </FormField>
            <FormField label="Address">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Address"
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
          </div>

          {/* Row 3: Department, Designation, Roster Group */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Department">
              <Select
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value, roster_group_id: '' })}
                required
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              >
                <option value="" className="bg-white text-slate-900">Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white text-slate-900">
                    [{d.shortcode}] {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Designation">
              <Select
                value={form.designation_id}
                onChange={(e) => setForm({ ...form, designation_id: e.target.value })}
                required
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              >
                <option value="" className="bg-white text-slate-900">Select designation...</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white text-slate-900">
                    [{d.shortcode}] {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Roster Group">
              <Select
                value={form.roster_group_id}
                onChange={(e) => setForm({ ...form, roster_group_id: e.target.value })}
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              >
                <option value="" className="bg-white text-slate-900">Select roster group...</option>
                {filteredRosterGroups.map((rg) => (
                  <option key={rg.id} value={rg.id} className="bg-white text-slate-900">
                    {rg.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Row 4: Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Joining Date">
              <Input
                type="date"
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                required
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
            <FormField label="Resigned Date">
              <Input
                type="date"
                value={form.resigned_date}
                onChange={(e) => setForm({ ...form, resigned_date: e.target.value })}
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
            <FormField label="Relieved Date">
              <Input
                type="date"
                value={form.relieved_date}
                onChange={(e) => setForm({ ...form, relieved_date: e.target.value })}
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
          </div>

          {/* Row 5: Nearby Station */}
          <FormField label="Nearby Station">
            <Select
              value={form.nearby_station}
              onChange={(e) => setForm({ ...form, nearby_station: e.target.value })}
              className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
            >
              <option value="" className="bg-white text-slate-900">Select station...</option>
              {locationsData.location_info.all_locations.map((loc) => (
                <option key={loc.location_code} value={loc.location_name} className="bg-white text-slate-900">
                  {loc.location_name} ({loc.location_code})
                </option>
              ))}
            </Select>
          </FormField>

        </form>
      </Modal>
    </div>
  );
}
