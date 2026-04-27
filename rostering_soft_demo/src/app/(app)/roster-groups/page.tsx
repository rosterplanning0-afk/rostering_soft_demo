'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RosterGroup, Department, Designation } from '@/types';
import { useAuth } from '@/context/AuthContext';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import FormField, { Input, Select, Button } from '@/components/FormField';

const emptyForm = { name: '', department_id: '', designation_id: '', end_date: '' };

export default function RosterGroupsPage() {
  const [rosterGroups, setRosterGroups] = useState<RosterGroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RosterGroup | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delegations, setDelegations] = useState<{ roster_group_id: string; access_level: 'view' | 'edit' }[]>([]);
  const { role, profile, canManageDepartments } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [rgRes, deptRes, desigRes, delRes] = await Promise.all([
      supabase.from('roster_groups').select('*, departments(*), designations(*)').order('name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('designations').select('*').order('name'),
      role === 'roster_planner' ? supabase.from('planner_delegations').select('roster_group_id, access_level').eq('planner_id', profile?.id) : Promise.resolve({ data: [] })
    ]);
    setRosterGroups((rgRes.data ?? []) as RosterGroup[]);
    setDepartments((deptRes.data ?? []) as Department[]);
    setDesignations((desigRes.data ?? []) as Designation[]);
    setDelegations((delRes.data || []) as any[]);
    setLoading(false);
  }, []);

  const filteredRosterGroups = useMemo(() => {
    if (role === 'system_admin') return rosterGroups;
    if (role !== 'roster_planner') return [];
    const allowedIds = delegations.map(d => d.roster_group_id);
    return rosterGroups.filter(rg => allowedIds.includes(rg.id));
  }, [rosterGroups, delegations, role]);

  const canEdit = useMemo(() => {
    if (role === 'system_admin') return true;
    if (role !== 'roster_planner') return false;
    return delegations.some(d => d.access_level === 'edit');
  }, [role, delegations]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (rg: RosterGroup) => {
    setEditing(rg);
    setForm({
      name: rg.name,
      department_id: rg.department_id,
      designation_id: rg.designation_id,
      end_date: rg.end_date ?? '',
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
      end_date: form.end_date || null,
    };

    try {
      const response = editing
        ? await fetch(`/api/roster-groups/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/roster-groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save roster group');

      setModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rg: RosterGroup) => {
    if (!confirm(`Are you sure you want to delete the "${rg.name}" roster group?`)) return;
    try {
      const response = await fetch(`/api/roster-groups/${rg.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete roster group');
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const columns = [
    { key: 'name', header: 'Roster Group Name' },
    {
      key: 'department',
      header: 'Department',
      render: (rg: RosterGroup) => (
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-border dark:border-white/10 text-primary text-xs font-bold">
          {rg.departments?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (rg: RosterGroup) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{rg.designations?.name ?? '—'}</span>
      ),
    },
    {
      key: 'end_date',
      header: 'End Date',
      render: (rg: RosterGroup) => (
        <span className="text-slate-500 font-medium">
          {rg.end_date
            ? new Date(rg.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (rg: RosterGroup) => (
        <span className="text-slate-500 font-medium">
          {new Date(rg.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Roster Groups</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium tracking-wide">Organize teams by department and designation for roster planning.</p>
        </div>
        {canManageDepartments && (
          <Button onClick={openCreate} className="h-12 px-8 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Roster Group
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredRosterGroups}
        loading={loading}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Roster Group' : 'New Roster Group'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="text-slate-500 dark:text-slate-400">
              Discard
            </Button>
            <Button type="submit" form="form-roster-groups" disabled={saving} className="min-w-[120px]">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="form-roster-groups" onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs font-bold animate-in fade-in zoom-in-95 mb-4">
              {error}
            </div>
          )}

          <FormField label="Roster Group Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Mumbai Local Drivers"
              className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Department">
              <Select
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
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
          </div>

          <FormField label="End Date (optional)">
            <Input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
            />
          </FormField>

        </form>
      </Modal>
    </div>
  );
}
