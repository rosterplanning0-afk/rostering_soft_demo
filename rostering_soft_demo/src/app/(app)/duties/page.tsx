'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Duty, Department, RosterGroup, Designation, DutyType } from '@/types';
import { useAuth } from '@/context/AuthContext';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import FormField, { Input, Select, Button } from '@/components/FormField';
import CascadingFilter from '@/components/CascadingFilter';
import locationsData from '@/data/locations.json';

const { all_locations } = locationsData.location_info;


const emptyForm = {
  department_id: '',
  roster_group_id: '',
  designation_id: '',
  duty_type_id: '',
  duty_name: '',
  duty_code: '',
  start_time: '',
  end_time: '',
  start_location: '',
  end_location: '',
  expiry_date: '',
};

export default function DutiesPage() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rosterGroups, setRosterGroups] = useState<RosterGroup[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Duty | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterRgId, setFilterRgId] = useState('');
  const [delegations, setDelegations] = useState<{ roster_group_id: string; access_level: 'view' | 'edit' }[]>([]);
  const { role, profile, canManageDepartments } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [dutiesRes, deptRes, rgRes, desigRes, dtRes, delRes] = await Promise.all([
      supabase.from('duties').select('*, departments(*), roster_groups(*), designations(*), duty_types(*)').order('duty_name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('roster_groups').select('*, designations(*)').order('name'),
      supabase.from('designations').select('*').order('name'),
      supabase.from('duty_types').select('*').order('name'),
      role === 'roster_planner' ? supabase.from('planner_delegations').select('roster_group_id, access_level').eq('planner_id', profile?.id) : Promise.resolve({ data: [] })
    ]);
    setDuties((dutiesRes.data ?? []) as Duty[]);
    setDepartments((deptRes.data ?? []) as Department[]);
    setRosterGroups((rgRes.data ?? []) as RosterGroup[]);
    setDesignations((desigRes.data ?? []) as Designation[]);
    setDutyTypes((dtRes.data ?? []) as DutyType[]);
    setDelegations((delRes.data || []) as any[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter duties by cascading filter selections
  const filteredDuties = useMemo(() => {
    let result = duties;
    // Roster Planner restriction
    if (role === 'roster_planner') {
      const allowedIds = delegations.map(d => d.roster_group_id);
      result = result.filter(d => d.roster_group_id === null || allowedIds.includes(d.roster_group_id));
    }
    if (filterDeptId) result = result.filter((d) => d.department_id === filterDeptId);
    if (filterRgId) result = result.filter((d) => d.roster_group_id === filterRgId);
    return result;
  }, [duties, filterDeptId, filterRgId, delegations, role]);

  const canEdit = useMemo(() => {
    if (role === 'system_admin') return true;
    if (role !== 'roster_planner') return false;
    return delegations.some(d => d.access_level === 'edit');
  }, [role, delegations]);

  // Filter roster groups by selected department in the modal form
  const formFilteredRosterGroups = useMemo(() => {
    let result = rosterGroups;
    if (role === 'roster_planner') {
      const allowedIds = delegations.map(d => d.roster_group_id);
      result = result.filter(rg => allowedIds.includes(rg.id));
    }
    if (form.department_id) result = result.filter((rg) => rg.department_id === form.department_id);
    return result;
  }, [form.department_id, rosterGroups, delegations, role]);



  // Compute duty hours for display
  const computedDutyHours = useMemo(() => {
    if (!form.start_time || !form.end_time) return '';
    const [sh, sm] = form.start_time.split(':').map(Number);
    const [eh, em] = form.end_time.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const diff = endMin > startMin ? endMin - startMin : 1440 - startMin + endMin;
    return (diff / 60).toFixed(2);
  }, [form.start_time, form.end_time]);

  const isTimingRequired = useMemo(() => {
    if (!form.duty_type_id) return true;
    const dt = dutyTypes.find(t => t.id === form.duty_type_id);
    if (!dt) return true;
    const name = dt.name.toLowerCase();
    const shortcode = dt.shortcode.toLowerCase();
    // Only Spare and Normal duties require timing and location
    return name.includes('spare') || name.includes('normal') || 
           shortcode.includes('spr') || shortcode.includes('norm');
  }, [form.duty_type_id, dutyTypes]);

  // Designation auto-fill logic for the form
  const formDesignationName = useMemo(() => {
    if (!form.department_id && !form.roster_group_id) return 'All Designation';
    if (!form.roster_group_id) return '';
    const rg = rosterGroups.find((r) => r.id === form.roster_group_id);
    return rg?.designations?.name ?? '';
  }, [form.department_id, form.roster_group_id, rosterGroups]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (duty: Duty) => {
    setEditing(duty);
    setForm({
      department_id: duty.department_id,
      roster_group_id: duty.roster_group_id,
      designation_id: duty.designation_id,
      duty_type_id: duty.duty_type_id ?? '',
      duty_name: duty.duty_name,
      duty_code: duty.duty_code,
      start_time: duty.start_time,
      end_time: duty.end_time,
      start_location: duty.start_location ?? '',
      end_location: duty.end_location ?? '',
      expiry_date: duty.expiry_date ? duty.expiry_date.split('T')[0] : '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleRosterGroupChange = (rgId: string) => {
    const rg = rosterGroups.find((r) => r.id === rgId);
    setForm({
      ...form,
      roster_group_id: rgId,
      designation_id: rg?.designation_id ?? '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      department_id: form.department_id || null,
      roster_group_id: form.roster_group_id || null,
      designation_id: (!form.department_id && !form.roster_group_id) ? null : (form.designation_id || null),
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      start_location: form.start_location || null,
      end_location: form.end_location || null,
      expiry_date: form.expiry_date || null,
    };

    try {
      const response = editing
        ? await fetch(`/api/duties/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/duties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await response.json();
      if (!response.ok) {
        let errorMsg = 'Failed to save duty';
        if (typeof data.error === 'string') {
          errorMsg = data.error;
        } else if (data.error && typeof data.error === 'object') {
          // Handle Zod flatten() format or generic objects
          const details = data.error.fieldErrors 
            ? Object.entries(data.error.fieldErrors).map(([k, v]) => `${k}: ${v}`).join(', ')
            : JSON.stringify(data.error);
          errorMsg = `Validation Error: ${details}`;
        }
        throw new Error(errorMsg);
      }

      setModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (duty: Duty) => {
    if (!confirm(`Are you sure you want to delete duty "${duty.duty_name}"?`)) return;
    try {
      const response = await fetch(`/api/duties/${duty.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete duty');
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const columns = [
    {
      key: 'duty_code',
      header: 'Duty Code',
      render: (d: Duty) => (
        <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-primary font-bold">
          {d.duty_code}
        </span>
      ),
    },
    { key: 'duty_name', header: 'Duty Name' },
    {
      key: 'duty_type',
      header: 'Type',
      render: (d: Duty) => (
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 uppercase border border-slate-200">
          {d.duty_types?.shortcode || '—'}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (d: Duty) => (
        <span className="text-slate-300 font-medium">
          {d.departments?.name ?? 'All Department'}
        </span>
      ),
    },
    {
      key: 'roster_group',
      header: 'Roster Group',
      render: (d: Duty) => (
        <span className="text-slate-400 font-medium">
          {d.roster_groups?.name ?? 'All Roster Group'}
        </span>
      ),
    },
    {
      key: 'timing',
      header: 'Timing',
      render: (d: Duty) => {
        if (!d.start_time || !d.end_time) return <span className="text-slate-500 italic text-xs">No timing set</span>;
        return (
          <span className="text-slate-400 font-medium">
            {d.start_time.slice(0, 5)} <span className="mx-1 opacity-30">—</span> {d.end_time.slice(0, 5)}
          </span>
        );
      },
    },
    {
      key: 'duty_hours',
      header: 'Hours',
      render: (d: Duty) => (
        <span className="font-bold text-slate-900">{Number(d.duty_hours).toFixed(1)}h</span>
      ),
    },
    {
      key: 'locations',
      header: 'Route',
      render: (d: Duty) => {
        if (!d.start_location && !d.end_location) return <span className="text-slate-500 italic text-xs">Flexible Route</span>;
        const start = all_locations.find(l => l.location_code === d.start_location);
        const end = all_locations.find(l => l.location_code === d.end_location);
        return (
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-tight">
              {start ? start.location_name : d.start_location || '—'}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-primary font-black text-[9px]">{d.start_location || '—'}</span>
              <span className="text-slate-300">→</span>
              <span className="text-primary font-black text-[9px]">{d.end_location || '—'}</span>
            </div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-tight">
              {end ? end.location_name : d.end_location || '—'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'expiry_date',
      header: 'Expiry',
      render: (d: Duty) => (
        <span className={`text-xs font-medium ${d.expiry_date ? 'text-orange-400' : 'text-slate-500'}`}>
          {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : 'No expiry'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Duty Management</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium tracking-wide">Configure duties with department and roster group assignments.</p>
        </div>
        {canManageDepartments && (
          <Button onClick={openCreate} className="h-12 px-8 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Duty
          </Button>
        )}
      </div>

      {/* Cascading Filter Bar */}
      <div className="bg-white dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl p-4 transition-colors duration-300">
        <CascadingFilter
          showDesignation
          onFilterChange={(filters) => {
            setFilterDeptId(filters.department_id);
            setFilterRgId(filters.roster_group_id);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredDuties}
        loading={loading}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Duty' : 'New Duty'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
              Discard
            </Button>
            <Button type="submit" form="form-duties" disabled={saving} className="min-w-[120px]">
              {saving ? 'Saving...' : editing ? 'Update Duty' : 'Create Duty'}
            </Button>
          </div>
        }
      >
        <form id="form-duties" onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs font-bold animate-in fade-in zoom-in-95 mb-4">
              {error}
            </div>
          )}

          {/* Cascading Selects */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Department">
              <Select
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value, roster_group_id: '', designation_id: '' })}
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              >
                <option value="" className="bg-white text-slate-900">All Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white text-slate-900">
                    [{d.shortcode}] {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Roster Group">
              <Select
                value={form.roster_group_id}
                onChange={(e) => handleRosterGroupChange(e.target.value)}
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              >
                <option value="" className="bg-white text-slate-900">All Roster Group</option>
                {formFilteredRosterGroups.map((rg) => (
                  <option key={rg.id} value={rg.id} className="bg-white text-slate-900">
                    {rg.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Designation">
              <Input
                value={formDesignationName}
                readOnly
                disabled
                placeholder="Auto-filled"
                className="bg-slate-50 dark:bg-white/5 border-border dark:border-white/10 text-slate-400 dark:text-slate-500"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Duty Name">
              <Input
                value={form.duty_name}
                onChange={(e) => setForm({ ...form, duty_name: e.target.value })}
                required
                placeholder="e.g. Express Mail Duty"
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
            <FormField label="Duty Code">
              <Input
                value={form.duty_code}
                onChange={(e) => setForm({ ...form, duty_code: e.target.value.toUpperCase() })}
                required
                placeholder="e.g. EXP-M01"
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
            <FormField label="Duty Type">
              <Select
                value={form.duty_type_id}
                onChange={(e) => setForm({ ...form, duty_type_id: e.target.value })}
                className="bg-slate-50 border-border text-slate-900"
              >
                <option value="">Select type...</option>
                {dutyTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name} ({dt.shortcode})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Start Time">
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required={isTimingRequired}
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
            <FormField label="End Time">
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required={isTimingRequired}
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
            <FormField label="Duty Hours">
              <Input
                value={computedDutyHours ? `${computedDutyHours}h` : ''}
                readOnly
                disabled
                placeholder="Auto-calculated"
                className="bg-slate-50 dark:bg-white/5 border-border dark:border-white/10 text-slate-400 dark:text-slate-500"
              />
            </FormField>
          </div>

          {/* Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Start Location">
              <Select
                value={form.start_location}
                onChange={(e) => setForm({ ...form, start_location: e.target.value })}
                required={isTimingRequired}
                className="bg-slate-50 border-border text-slate-900"
              >
                <option value="">Select start...</option>
                {all_locations.map((loc) => (
                  <option key={loc.location_code} value={loc.location_code}>
                    {loc.location_name} ({loc.location_code})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="End Location">
              <Select
                value={form.end_location}
                onChange={(e) => setForm({ ...form, end_location: e.target.value })}
                required={isTimingRequired}
                className="bg-slate-50 border-border text-slate-900"
              >
                <option value="">Select end...</option>
                {all_locations.map((loc) => (
                  <option key={loc.location_code} value={loc.location_code}>
                    {loc.location_name} ({loc.location_code})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Expiry Date (Optional)">
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
          </div>

        </form>
      </Modal>
    </div>
  );
}
