'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Designation, Department } from '@/types';
import { useAuth } from '@/context/AuthContext';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import FormField, { Input, Button } from '@/components/FormField';

const emptyForm = { name: '', shortcode: '', department_id: '' };

export default function DesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { canManageDepartments } = useAuth();

  const fetchDesignations = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('designations')
      .select('*, departments(*)')
      .order('name', { ascending: true });
    setDesignations((data ?? []) as Designation[]);
    setLoading(false);
  }, []);

  const fetchDepartments = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });
    setDepartments((data ?? []) as Department[]);
  }, []);

  useEffect(() => {
    fetchDesignations();
    fetchDepartments();
  }, [fetchDesignations, fetchDepartments]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (desig: Designation) => {
    setEditing(desig);
    setForm({ name: desig.name, shortcode: desig.shortcode, department_id: desig.department_id || '' });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = editing
        ? await fetch(`/api/designations/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch('/api/designations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save designation');

      setModalOpen(false);
      fetchDesignations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (desig: Designation) => {
    if (!confirm(`Are you sure you want to delete the "${desig.name}" designation?`)) return;
    try {
      const response = await fetch(`/api/designations/${desig.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete designation');
      fetchDesignations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const columns = [
    {
      key: 'department',
      header: 'Department',
      render: (d: Designation) => (
        <span className="text-slate-700 dark:text-white/80 font-medium">{d.departments?.name || 'N/A'}</span>
      )
    },
    {
      key: 'shortcode',
      header: 'Shortcode',
      render: (d: Designation) => (
        <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-border dark:border-white/10 text-primary font-bold">
          {d.shortcode}
        </span>
      ),
    },
    { key: 'name', header: 'Designation Name' },
    {
      key: 'created_at',
      header: 'Created',
      render: (d: Designation) => (
        <span className="text-slate-500 font-medium">
          {new Date(d.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Designations</h1>
          <p className="mt-2 text-slate-500 font-medium tracking-wide">Manage job designations and role classifications.</p>
        </div>
        {canManageDepartments && (
          <Button onClick={openCreate} className="h-12 px-8 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Designation
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={designations}
        loading={loading}
        onEdit={canManageDepartments ? openEdit : undefined}
        onDelete={canManageDepartments ? handleDelete : undefined}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Designation' : 'New Designation'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="text-slate-500 dark:text-slate-400">
              Discard
            </Button>
            <Button type="submit" form="form-designations" disabled={saving} className="min-w-[120px]">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="form-designations" onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs font-bold animate-in fade-in zoom-in-95 mb-4">
              {error}
            </div>
          )}

          <FormField label="Department">
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              required
              className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-100 border border-border dark:border-white/10 text-slate-900 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all duration-200 appearance-none"
            >
              <option value="" disabled className="bg-white text-slate-900">Select a Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id} className="bg-white text-slate-900">
                  {dept.name} ({dept.shortcode})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Designation Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Loco Pilot"
              className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
            />
          </FormField>

          <FormField label="Shortcode">
            <Input
              value={form.shortcode}
              onChange={(e) => setForm({ ...form, shortcode: e.target.value.toUpperCase() })}
              required
              placeholder="e.g. LP"
              className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
            />
          </FormField>

        </form>
      </Modal>
    </div>
  );
}
