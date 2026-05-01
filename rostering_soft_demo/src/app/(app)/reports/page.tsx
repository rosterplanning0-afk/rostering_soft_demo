'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import {
  Calendar, Clock, CheckSquare, FileText, Users,
  Moon, Shield, Download, Loader2, BarChart3, AlertTriangle,
} from 'lucide-react';
import { Button, Input, Select } from '@/components/FormField';
import { Department, RosterGroup } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type ReportId =
  | 'roster-schedule'
  | 'work-hours'
  | 'duty-coverage'
  | 'leave-requests'
  | 'employee-master'
  | 'night-shifts'
  | 'compliance';

interface ReportType {
  id: ReportId;
  label: string;
  description: string;
  icon: React.ElementType;
  needsDates: boolean;
  plannerAdminOnly?: boolean;
}

// ─── Report definitions ──────────────────────────────────────────────────────

const REPORT_TYPES: ReportType[] = [
  {
    id: 'roster-schedule',
    label: 'Roster Schedule',
    description: 'All duty assignments by employee for a date range',
    icon: Calendar,
    needsDates: true,
  },
  {
    id: 'work-hours',
    label: 'Employee Work Hours',
    description: 'Total hours and shift count per employee',
    icon: Clock,
    needsDates: true,
  },
  {
    id: 'duty-coverage',
    label: 'Duty Coverage',
    description: 'How many employees are assigned per duty per date',
    icon: CheckSquare,
    needsDates: true,
  },
  {
    id: 'leave-requests',
    label: 'Leave & Requests',
    description: 'Leave and shift-change requests with approval status',
    icon: FileText,
    needsDates: true,
  },
  {
    id: 'employee-master',
    label: 'Employee Master List',
    description: 'Full employee directory with departments and designations',
    icon: Users,
    needsDates: false,
  },
  {
    id: 'night-shifts',
    label: 'Night Shift Distribution',
    description: 'Night shift counts per employee vs allowed limits',
    icon: Moon,
    needsDates: true,
  },
  {
    id: 'compliance',
    label: 'Compliance Report',
    description: 'Rule violations: rest hours, consecutive days, weekly hours',
    icon: Shield,
    needsDates: true,
    plannerAdminOnly: true,
  },
];

// ─── Column definitions ───────────────────────────────────────────────────────

const REPORT_COLUMNS: Record<ReportId, { key: string; header: string }[]> = {
  'roster-schedule': [
    { key: 'assignment_date', header: 'Date' },
    { key: 'employee_code', header: 'Emp Code' },
    { key: 'employee_name', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'designation', header: 'Designation' },
    { key: 'roster_group', header: 'Roster Group' },
    { key: 'duty_code', header: 'Duty Code' },
    { key: 'duty_name', header: 'Duty Name' },
    { key: 'start_time', header: 'Start' },
    { key: 'end_time', header: 'End' },
    { key: 'duty_hours', header: 'Hours' },
    { key: 'status', header: 'Status' },
  ],
  'work-hours': [
    { key: 'employee_code', header: 'Emp Code' },
    { key: 'employee_name', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'designation', header: 'Designation' },
    { key: 'roster_group', header: 'Roster Group' },
    { key: 'total_shifts', header: 'Total Shifts' },
    { key: 'confirmed_shifts', header: 'Confirmed' },
    { key: 'total_hours', header: 'Total Hours' },
  ],
  'duty-coverage': [
    { key: 'assignment_date', header: 'Date' },
    { key: 'duty_code', header: 'Duty Code' },
    { key: 'duty_name', header: 'Duty Name' },
    { key: 'department', header: 'Department' },
    { key: 'roster_group', header: 'Roster Group' },
    { key: 'start_time', header: 'Start' },
    { key: 'end_time', header: 'End' },
    { key: 'assigned_count', header: 'Assigned' },
    { key: 'confirmed_count', header: 'Confirmed' },
  ],
  'leave-requests': [
    { key: 'employee_code', header: 'Emp Code' },
    { key: 'employee_name', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'request_type', header: 'Type' },
    { key: 'request_date', header: 'From' },
    { key: 'request_date_to', header: 'To' },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status' },
    { key: 'planner_comment', header: 'Comment' },
  ],
  'employee-master': [
    { key: 'employee_code', header: 'Emp Code' },
    { key: 'full_name', header: 'Full Name' },
    { key: 'gender', header: 'Gender' },
    { key: 'department', header: 'Department' },
    { key: 'designation', header: 'Designation' },
    { key: 'roster_group', header: 'Roster Group' },
    { key: 'joining_date', header: 'Joining Date' },
    { key: 'nearby_station', header: 'Station' },
    { key: 'status', header: 'Status' },
  ],
  'night-shifts': [
    { key: 'employee_code', header: 'Emp Code' },
    { key: 'employee_name', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'designation', header: 'Designation' },
    { key: 'roster_group', header: 'Roster Group' },
    { key: 'total_shifts', header: 'Total Shifts' },
    { key: 'night_shift_count', header: 'Night Shifts' },
    { key: 'night_shift_limit', header: 'Limit' },
    { key: 'compliance_status', header: 'Status' },
  ],
  'compliance': [
    { key: 'employee_code', header: 'Emp Code' },
    { key: 'employee_name', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'designation', header: 'Designation' },
    { key: 'violation_type', header: 'Violation Type' },
    { key: 'violation_detail', header: 'Detail' },
    { key: 'severity', header: 'Severity' },
  ],
};

const BADGE_KEYS = new Set(['status', 'compliance_status', 'severity']);

function getBadgeClass(val: string) {
  if (['confirmed', 'approved', 'ok', 'Active'].includes(val))
    return 'bg-green-100 text-green-700';
  if (['exceeded', 'critical', 'rejected', 'Inactive'].includes(val))
    return 'bg-red-100 text-red-700';
  if (['warning', 'pending', 'draft', 'no_rule'].includes(val))
    return 'bg-yellow-100 text-yellow-700';
  return 'bg-slate-100 text-slate-600';
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { role } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportId | null>(null);
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-01'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deptId, setDeptId] = useState('');
  const [rgId, setRgId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rosterGroups, setRosterGroups] = useState<RosterGroup[]>([]);
  const [reportData, setReportData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'system_admin') return;
    const supabase = createClient();
    Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('roster_groups').select('*').order('name'),
    ]).then(([dRes, rgRes]) => {
      setDepartments((dRes.data ?? []) as Department[]);
      setRosterGroups((rgRes.data ?? []) as RosterGroup[]);
    });
  }, [role]);

  const visibleReports = useMemo(
    () =>
      REPORT_TYPES.filter((r) => {
        if (r.plannerAdminOnly && role === 'manager') return false;
        return true;
      }),
    [role]
  );

  const generateReport = useCallback(async () => {
    if (!selectedReport) return;
    setLoading(true);
    setError(null);
    setReportData(null);

    const rt = REPORT_TYPES.find((r) => r.id === selectedReport)!;
    const params = new URLSearchParams();
    if (rt.needsDates) {
      params.set('start_date', dateFrom);
      params.set('end_date', dateTo);
    }
    if (deptId) params.set('department_id', deptId);
    if (rgId) params.set('roster_group_id', rgId);

    try {
      const res = await fetch(`/api/reports/${selectedReport}?${params}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to generate report');
      } else {
        setReportData(json);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateFrom, dateTo, deptId, rgId]);

  const handleDownloadPDF = useCallback(async () => {
    if (!reportData || !selectedReport) return;
    const { exportToPDF } = await import('@/lib/report-export');
    const cols = REPORT_COLUMNS[selectedReport];
    const headers = cols.map((c) => c.header);
    const rows = reportData.map((row) =>
      cols.map((c) => (row[c.key] as string | number) ?? '')
    );
    const rt = REPORT_TYPES.find((r) => r.id === selectedReport)!;
    await exportToPDF(rt.label, headers, rows);
  }, [reportData, selectedReport]);

  const handleDownloadExcel = useCallback(async () => {
    if (!reportData || !selectedReport) return;
    const { exportToExcel } = await import('@/lib/report-export');
    const cols = REPORT_COLUMNS[selectedReport];
    const headers = cols.map((c) => c.header);
    const rows = reportData.map((row) =>
      cols.map((c) => (row[c.key] as string | number) ?? '')
    );
    const rt = REPORT_TYPES.find((r) => r.id === selectedReport)!;
    exportToExcel(rt.label.replace(/\s+/g, '_'), headers, rows);
  }, [reportData, selectedReport]);

  const rt = REPORT_TYPES.find((r) => r.id === selectedReport);
  const columns = selectedReport ? REPORT_COLUMNS[selectedReport] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 font-medium">
            Generate and download operational reports as PDF or Excel
          </p>
        </div>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleReports.map((r) => {
          const Icon = r.icon;
          const isSelected = selectedReport === r.id;
          return (
            <button
              key={r.id}
              onClick={() => {
                setSelectedReport(r.id);
                setReportData(null);
                setError(null);
              }}
              className={`text-left p-5 rounded-3xl border-2 transition-all group ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border bg-white hover:border-primary/30 hover:shadow-md'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h3
                className={`font-bold text-sm mb-1 ${
                  isSelected ? 'text-primary' : 'text-slate-800'
                }`}
              >
                {r.label}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">{r.description}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {selectedReport && (
        <div className="bg-white border border-border rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">
            {rt?.label} — Filters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rt?.needsDates && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </>
            )}
            {role === 'system_admin' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Department
                  </label>
                  <Select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Roster Group
                  </label>
                  <Select value={rgId} onChange={(e) => setRgId(e.target.value)}>
                    <option value="">All Roster Groups</option>
                    {rosterGroups.map((rg) => (
                      <option key={rg.id} value={rg.id}>
                        {rg.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={generateReport} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </span>
              ) : (
                'Generate Report'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {reportData && selectedReport && (
        <div className="space-y-4">
          {/* Download bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-border rounded-2xl px-5 py-3">
            <div>
              <span className="text-sm font-bold text-slate-800">
                {reportData.length.toLocaleString()} records
              </span>
              {reportData.length > 100 && (
                <span className="text-xs text-slate-400 ml-2">
                  (preview showing first 100 — full data in download)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadExcel}>
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Excel
                </span>
              </Button>
              <Button variant="primary" onClick={handleDownloadPDF}>
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  PDF
                </span>
              </Button>
            </div>
          </div>

          {/* Preview table */}
          {reportData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-border rounded-3xl">
              <BarChart3 className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-400 font-semibold">
                No data found for the selected filters
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="bg-slate-50">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-5 py-4 text-left text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] whitespace-nowrap"
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {reportData.slice(0, 100).map((row, i) => (
                      <tr key={i} className="group hover:bg-red-50/20 transition-colors">
                        {columns.map((col) => {
                          const val = String(row[col.key] ?? '');
                          const isBadge = BADGE_KEYS.has(col.key);
                          return (
                            <td key={col.key} className="px-5 py-4 whitespace-nowrap">
                              {isBadge && val ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${getBadgeClass(val)}`}
                                >
                                  {val.replace(/_/g, ' ')}
                                </span>
                              ) : (
                                <span className="text-sm font-medium text-slate-700">{val}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
