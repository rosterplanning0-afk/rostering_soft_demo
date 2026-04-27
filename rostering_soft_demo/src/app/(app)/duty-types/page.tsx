'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DutyType } from '@/types';
import { useAuth } from '@/context/AuthContext';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import FormField, { Input, Button } from '@/components/FormField';
import { Settings2 } from 'lucide-react';

const emptyForm = { name: '', shortcode: '', description: '' };

export default function DutyTypesPage() {
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DutyType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { role, canManageDepartments } = useAuth();

  const fetchDutyTypes = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('duty_types')
      .select('*')
      .order('name', { ascending: true });
    setDutyTypes((data ?? []) as DutyType[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDutyTypes();
  }, [fetchDutyTypes]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (dt: DutyType) => {
    setEditing(dt);
    setForm({ 
      name: dt.name, 
      shortcode: dt.shortcode, 
      description: dt.description || '' 
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = editing
        ? await fetch(`/api/duty-types/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch('/api/duty-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save duty type');

      setModalOpen(false);
      fetchDutyTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dt: DutyType) => {
    if (!confirm(`Are you sure you want to delete the "${dt.name}" duty type?`)) return;
    try {
      const response = await fetch(`/api/duty-types/${dt.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete duty type');
      fetchDutyTypes();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const columns = [
    {
      key: 'shortcode',
      header: 'Shortcode',
      render: (dt: DutyType) => (
        <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-border dark:border-white/10 text-primary font-bold">
          {dt.shortcode}
        </span>
      ),
    },
    { key: 'name', header: 'Type Name' },
    { 
      key: 'description', 
      header: 'Description',
      render: (dt: DutyType) => (
        <span className="text-slate-400 text-xs truncate max-w-xs block">
          {dt.description || '—'}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (dt: DutyType) => (
        <span className="text-slate-500 font-medium">
          {new Date(dt.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-primary" />
            Duty Types
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium tracking-wide">
            Categorize duties (e.g. Passenger, Freight, Maintenance) for better shift analysis.
          </p>
        </div>
        {canManageDepartments && (
          <Button onClick={openCreate} className="h-12 px-8 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Duty Type
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={dutyTypes}
        loading={loading}
        onEdit={canManageDepartments ? openEdit : undefined}
        onDelete={role === 'system_admin' ? handleDelete : undefined}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Duty Type' : 'New Duty Type'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="text-slate-500 dark:text-slate-400">
              Discard
            </Button>
            <Button type="submit" form="form-duty-types" disabled={saving} className="min-w-[120px]">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="form-duty-types" onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs font-bold animate-in fade-in zoom-in-95 mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Type Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. Passenger Train"
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>

            <FormField label="Shortcode">
              <Input
                value={form.shortcode}
                onChange={(e) => setForm({ ...form, shortcode: e.target.value.toUpperCase() })}
                required
                placeholder="e.g. PAX"
                className="bg-slate-50 dark:bg-slate-100 border-border dark:border-white/10 text-slate-900"
              />
            </FormField>
          </div>

          <FormField label="Description (Optional)">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full h-24 p-3 bg-slate-50 border border-border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Provide context for this duty type..."
            />
          </FormField>

        </form>
      </Modal>
    </div>
  );
}
