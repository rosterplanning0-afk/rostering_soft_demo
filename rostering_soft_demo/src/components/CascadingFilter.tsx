'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Department, RosterGroup } from '@/types';
import { Select } from '@/components/FormField';
import { useAuth } from '@/context/AuthContext';

interface CascadingFilterProps {
  onFilterChange: (filters: {
    department_id: string;
    roster_group_id: string;
    designation_id: string;
    designation_name: string;
  }) => void;
  showDesignation?: boolean;
}

export default function CascadingFilter({ onFilterChange, showDesignation = false }: CascadingFilterProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rosterGroups, setRosterGroups] = useState<RosterGroup[]>([]);
  const [filteredRosterGroups, setFilteredRosterGroups] = useState<RosterGroup[]>([]);

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedRgId, setSelectedRgId] = useState('');
  const [designationName, setDesignationName] = useState('');

  const { role, profile } = useAuth();

  const fetchBaseData = useCallback(async () => {
    const supabase = createClient();
    const [deptRes, rgRes, delRes] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('roster_groups').select('*, designations(*)').order('name'),
      role === 'roster_planner' ? supabase.from('planner_delegations').select('roster_group_id').eq('planner_id', profile?.id) : Promise.resolve({ data: [] })
    ]);

    let allRgs = (rgRes.data ?? []) as RosterGroup[];
    let allDepts = (deptRes.data ?? []) as Department[];

    if (role === 'roster_planner' && delRes.data) {
      const allowedRgIds = delRes.data.map(d => d.roster_group_id);

      allRgs = allRgs.filter(rg => allowedRgIds.includes(rg.id));
      const allowedDeptIds = new Set(allRgs.map(rg => rg.department_id));
      allDepts = allDepts.filter(d => allowedDeptIds.has(d.id));
    }

    setDepartments(allDepts);
    setRosterGroups(allRgs);
  }, [role, profile]);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  // Filter roster groups when department changes
  useEffect(() => {
    if (selectedDeptId) {
      const filtered = rosterGroups.filter((rg) => rg.department_id === selectedDeptId);
      setFilteredRosterGroups(filtered);
    } else {
      setFilteredRosterGroups(rosterGroups);
    }
    setSelectedRgId('');
    setDesignationName('');
  }, [selectedDeptId, rosterGroups]);

  // Auto-fill designation when roster group changes
  useEffect(() => {
    if (selectedRgId) {
      const rg = rosterGroups.find((r) => r.id === selectedRgId);
      const desigName = rg?.designations?.name ?? '';
      const desigId = rg?.designation_id ?? '';
      setDesignationName(desigName);
      onFilterChange({
        department_id: selectedDeptId,
        roster_group_id: selectedRgId,
        designation_id: desigId,
        designation_name: desigName,
      });
    } else {
      setDesignationName('');
      onFilterChange({
        department_id: selectedDeptId,
        roster_group_id: '',
        designation_id: '',
        designation_name: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRgId]);

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="min-w-[200px]">
        <Select
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          className="bg-slate-100 dark:bg-slate-50 border-border dark:border-white/10 text-slate-900 text-sm h-10"
        >
          <option value="" className="bg-white text-slate-900">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id} className="bg-white text-slate-900">
              [{d.shortcode}] {d.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-[200px]">
        <Select
          value={selectedRgId}
          onChange={(e) => setSelectedRgId(e.target.value)}
          className="bg-slate-100 dark:bg-slate-50 border-border dark:border-white/10 text-slate-900 text-sm h-10"
        >
          <option value="" className="bg-white text-slate-900">All Roster Groups</option>
          {filteredRosterGroups.map((rg) => (
            <option key={rg.id} value={rg.id} className="bg-white text-slate-900">
              {rg.name}
            </option>
          ))}
        </Select>
      </div>

      {showDesignation && designationName && (
        <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-border dark:border-white/10 text-sm text-slate-600 dark:text-slate-300 font-medium">
          Designation: <span className="text-primary font-bold">{designationName}</span>
        </div>
      )}
    </div>
  );
}
