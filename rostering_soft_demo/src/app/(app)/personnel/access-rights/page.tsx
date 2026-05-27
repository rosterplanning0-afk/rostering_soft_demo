'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { ShieldCheck, Save, Loader2, Check } from 'lucide-react';
import { UserRole } from '@/types';
import { navSections } from '@/components/Sidebar';

// Roles to manage in this matrix
const configurableRoles: UserRole[] = ['hod', 'manager', 'cxo', 'roster_planner', 'employee'];

type PermissionsState = Record<UserRole, Set<string>>;

export default function AccessRightsPage() {
  const { data: dbPermissions, isLoading, mutate } = useSWR('/api/permissions');
  const [permissions, setPermissions] = useState<PermissionsState>({} as PermissionsState);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (dbPermissions?.permissions) {
      const initialState = {} as PermissionsState;
      configurableRoles.forEach(role => {
        initialState[role] = new Set<string>();
      });

      dbPermissions.permissions.forEach((p: { role: string; visible_items: string[] }) => {
        if (configurableRoles.includes(p.role as UserRole)) {
          initialState[p.role as UserRole] = new Set(p.visible_items);
        }
      });
      setPermissions(initialState);
    }
  }, [dbPermissions]);

  const togglePermission = (role: UserRole, href: string) => {
    setPermissions(prev => {
      const rolePerms = new Set(prev[role] || []);
      if (rolePerms.has(href)) {
        rolePerms.delete(href);
      } else {
        rolePerms.add(href);
      }
      return { ...prev, [role]: rolePerms };
    });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const payload = configurableRoles.map(role => ({
        role,
        visible_items: Array.from(permissions[role] || [])
      }));

      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: payload })
      });

      if (!res.ok) throw new Error('Failed to save');
      
      await mutate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || Object.keys(permissions).length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleLabels: Record<UserRole, string> = {
    system_admin: 'Admin',
    roster_planner: 'Roster Planner',
    manager: 'Manager',
    employee: 'Employee',
    hod: 'HoD',
    cxo: 'CXO'
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-rose-500" />
            Access Rights Management
          </h1>
          <p className="text-slate-500 mt-1">Control which sidebar sections are visible for each role. Changes take effect on next login or page refresh.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 whitespace-nowrap shadow-sm shadow-rose-200"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saveSuccess ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Sidebar Visibility Matrix</h2>
          <p className="text-sm text-slate-500 mt-1">Green = Visible to role | Grey = Hidden | Admin always has full access and cannot be restricted.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b border-border font-bold text-slate-700 bg-white sticky left-0 z-10 w-1/3">Sidebar Item</th>
                {configurableRoles.map(role => (
                  <th key={role} className="p-4 border-b border-border font-bold text-slate-700 text-center min-w-[120px]">
                    {roleLabels[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {navSections.map((section, idx) => (
                <React.Fragment key={section.title}>
                  <tr>
                    <td colSpan={configurableRoles.length + 1} className={`p-3 font-bold text-slate-900 bg-slate-50/80 ${idx > 0 ? 'border-t border-border' : ''}`}>
                      {section.title}
                    </td>
                  </tr>
                  {section.links.map(link => (
                    <tr key={link.href} className="hover:bg-slate-50/50 transition-colors border-t border-slate-100">
                      <td className="p-4 text-sm font-medium text-slate-600 pl-8 sticky left-0 bg-white group-hover:bg-slate-50/50">
                        {link.label}
                      </td>
                      {configurableRoles.map(role => {
                        const isVisible = permissions[role]?.has(link.href) || false;
                        return (
                          <td key={`${role}-${link.href}`} className="p-4 text-center">
                            <button
                              onClick={() => togglePermission(role, link.href)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 ${
                                isVisible ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isVisible ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
