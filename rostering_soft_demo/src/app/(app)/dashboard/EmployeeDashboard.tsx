'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  User,
  List,
  Search,
  ChevronDown,
  Clock,
  MapPin,
} from 'lucide-react';
import { Employee, DutyAssignment, Duty } from '@/types';
import locationsData from '@/data/locations.json';

// ── Helpers ────────────────────────────────────────────────────────────────

const { all_locations } = locationsData.location_info;

const locationMap = new Map<string, string>(
  all_locations.map((l) => [l.location_code, l.location_name])
);

function locName(code: string | null | undefined): string {
  if (!code) return '—';
  return locationMap.get(code) ?? code;
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return '—';
  return t.slice(0, 5);
}

function fmtHours(h: number | null | undefined): string {
  if (h == null) return '—';
  const hh = Math.floor(h).toString().padStart(2, '0');
  const mm = Math.round((h % 1) * 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function isWO(duty: Duty | undefined): boolean {
  return duty?.duty_code?.toUpperCase().startsWith('WO') ?? false;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface EmployeeDashboardProps {
  userId: string;
}

type ViewMode = 'calendar' | 'list';

interface TooltipState {
  dateStr: string;
  x: number;
  y: number;
  above: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EmployeeDashboard({ userId }: EmployeeDashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignments, setAssignments] = useState<DutyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [search, setSearch] = useState('');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [lastUpdateDate, setLastUpdateDate] = useState<Date | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: empData } = await supabase
        .from('employees')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle();

      if (empData) {
        setEmployee(empData as Employee);

        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });

        const { data: assignmentData } = await supabase
          .from('duty_assignments')
          .select('*, duties(*)')
          .eq('employee_id', empData.id)
          .eq('status', 'confirmed')
          .gte('assignment_date', format(start, 'yyyy-MM-dd'))
          .lte('assignment_date', format(end, 'yyyy-MM-dd'));

        if (assignmentData) {
          setAssignments(assignmentData as DutyAssignment[]);
        }

        // Fetch last update time across all assignments for this employee
        const { data: latestChange } = await supabase
          .from('duty_assignments')
          .select('created_at')
          .eq('employee_id', empData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestChange?.created_at) {
          setLastUpdateDate(new Date(latestChange.created_at));
        }
      }

      setLoading(false);
    }

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentDate]);

  const prevMonth = () => { setCurrentDate(subMonths(currentDate, 1)); setTooltip(null); };
  const nextMonth = () => { setCurrentDate(addMonths(currentDate, 1)); setTooltip(null); };

  const daysInView = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const monthDays = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  }, [currentDate]);

  const assignmentsMap = useMemo(() => {
    const map = new Map<string, DutyAssignment>();
    assignments.forEach(a => { map.set(a.assignment_date, a); });
    return map;
  }, [assignments]);

  // List rows: all days in current month
  const listRows = useMemo(() => {
    return monthDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const assignment = assignmentsMap.get(dateStr) ?? null;
      return { date, dateStr, assignment, duty: assignment?.duties ?? null };
    });
  }, [monthDays, assignmentsMap]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listRows;
    return listRows.filter(r =>
      format(r.date, 'dd-MM-yyyy').includes(q) ||
      (r.duty?.duty_code ?? '').toLowerCase().includes(q) ||
      (r.duty?.duty_name ?? '').toLowerCase().includes(q)
    );
  }, [listRows, search]);

  const handleCellEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, dateStr: string) => {
    const assignment = assignmentsMap.get(dateStr);
    if (!assignment?.duties) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const above = rect.bottom + 220 > window.innerHeight;
    setTooltip({
      dateStr,
      x: Math.min(rect.left + rect.width / 2, window.innerWidth - 220),
      y: above ? rect.top - 8 : rect.bottom + 8,
      above,
    });
  }, [assignmentsMap]);

  const handleCellLeave = useCallback(() => setTooltip(null), []);

  // ── Loading / no-employee states ──────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-slate-400 font-medium animate-pulse">Loading your schedule...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Profile Not Linked</h2>
        <p className="text-slate-500">
          Your account is not linked to any active employee record. Please contact your system administrator.
        </p>
      </div>
    );
  }

  const activeAssignment = tooltip ? assignmentsMap.get(tooltip.dateStr) : null;
  const activeDuty = activeAssignment?.duties ?? null;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col h-[calc(100vh-140px)] min-h-[600px] overflow-hidden">

        {/* ── Header Toolbar ── */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50 flex-shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Month navigator */}
            <div className="flex items-center bg-white rounded-lg border border-border shadow-sm overflow-hidden">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-50 transition-colors border-r border-border">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button className="px-4 py-2 font-bold text-slate-800 min-w-[148px] text-center flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors">
                {format(currentDate, 'MMMM yyyy')}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-50 transition-colors border-l border-border">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Last update badge */}
            {lastUpdateDate && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-xs font-semibold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Roster updated on {format(lastUpdateDate, 'dd MMM yyyy, HH:mm')}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-white border border-border rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setViewMode('calendar')}
                title="Calendar view"
                className={`p-2 transition-colors ${viewMode === 'calendar' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className={`p-2 transition-colors border-l border-border ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/*  CALENDAR VIEW                                                */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {viewMode === 'calendar' && (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 bg-white border-b border-border flex-shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2 text-center text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
              {daysInView.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const assignment = assignmentsMap.get(dateStr);
                const duty = assignment?.duties;
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isWODay = isWO(duty);

                return (
                  <div
                    key={dateStr}
                    onMouseEnter={(e) => handleCellEnter(e, dateStr)}
                    onMouseLeave={handleCellLeave}
                    className={`
                      relative border-b border-r border-border p-2 flex flex-col transition-colors cursor-default
                      ${!isCurrentMonth ? 'opacity-40' : ''}
                      ${isWODay && isCurrentMonth ? 'bg-repeating-lines' : 'bg-white hover:bg-slate-50/60'}
                    `}
                  >
                    {/* Date number */}
                    <div className="flex items-start justify-between mb-1">
                      <span className={`
                        w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0
                        ${isToday(date) ? 'bg-primary text-white shadow-md' : 'text-slate-600'}
                      `}>
                        {format(date, 'd')}
                      </span>
                    </div>

                    {/* Duty Info */}
                    {duty && isCurrentMonth && (
                      <div className="mt-auto flex flex-col w-full">
                        {/* Duty pill */}
                        <div className={`
                          rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-bold leading-tight truncate text-center
                          ${isWODay
                            ? 'bg-slate-200 text-slate-500 border border-slate-300'
                            : 'bg-primary/10 text-primary border border-primary/20'}
                        `}>
                          {duty.duty_code}
                        </div>

                        {/* Timing and Locations under pill */}
                        {!isWODay && (
                          <div className="flex flex-col gap-[2px] mt-1 px-0.5">
                            <div className="flex items-center justify-between text-[9px] leading-none">
                              <span className="text-slate-500 font-medium">{fmtTime(duty.start_time)}</span>
                              <span className="text-primary font-bold ml-1 truncate">{duty.start_location}</span>
                            </div>
                            <div className="flex items-center justify-between text-[9px] leading-none">
                              <span className="text-slate-500 font-medium">{fmtTime(duty.end_time)}</span>
                              <span className="text-primary font-bold ml-1 truncate">{duty.end_location}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* Calendar legend */}
            <div className="p-3 border-t border-border bg-white flex flex-wrap items-center justify-center gap-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary/10 border border-primary/20" />
                <span className="text-slate-700">Duty</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-300" />
                <span>Weekly Off (WO)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>Today</span>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/*  LIST VIEW                                                    */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {viewMode === 'list' && (
          <>
            {/* Search bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white flex-shrink-0">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by date, duty code or name…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                />
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Filter">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h18M7 8h10M10 12h4" />
                  </svg>
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Settings">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b-2 border-border">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Duty Code</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Duty Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Sign In</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Sign In Location</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Sign Out</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Sign Out Location</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map(({ date, dateStr, assignment, duty }) => {
                    const wo = isWO(duty ?? undefined);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const noAssignment = !assignment;

                    return (
                      <tr
                        key={dateStr}
                        className={`
                          transition-colors group
                          ${wo ? 'bg-repeating-lines' : ''}
                          ${!wo && !noAssignment ? 'bg-white hover:bg-slate-50/60' : ''}
                          ${noAssignment && isWeekend ? 'bg-white opacity-40' : ''}
                          ${noAssignment && !isWeekend ? 'bg-white opacity-40' : ''}

                        `}
                      >
                        {/* Date */}
                        <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                          <span className={isToday(date) ? 'text-primary font-bold' : ''}>
                            {format(date, 'dd-MM-yyyy')}
                          </span>
                          {isToday(date) && (
                            <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">Today</span>
                          )}
                        </td>

                        {/* Duty Code */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {duty ? (
                            <span className={`
                              inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border
                              ${wo
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-primary/10 text-primary border-primary/20'}
                            `}>
                              {duty.duty_code}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Duty Name */}
                        <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                          {duty?.duty_name ?? <span className="text-slate-300">—</span>}
                        </td>

                        {/* Sign In Time */}
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {duty && !wo ? fmtTime(duty.start_time) : <span className="text-slate-300">—</span>}
                        </td>

                        {/* Sign In Location */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {duty && !wo && duty.start_location ? (
                            <div className="flex flex-col">
                              <span className="text-slate-700 font-medium text-xs">{locName(duty.start_location)}</span>
                              <span className="text-slate-400 text-[10px] font-bold">{duty.start_location}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Sign Out Time */}
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {duty && !wo ? fmtTime(duty.end_time) : <span className="text-slate-300">—</span>}
                        </td>

                        {/* Sign Out Location */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {duty && !wo && duty.end_location ? (
                            <div className="flex flex-col">
                              <span className="text-slate-700 font-medium text-xs">{locName(duty.end_location)}</span>
                              <span className="text-slate-400 text-[10px] font-bold">{duty.end_location}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {duty && !wo ? fmtHours(duty.duty_hours) : <span className="text-slate-300">—</span>}
                        </td>

                        {/* Comments */}
                        <td className="px-4 py-3 text-slate-500 text-sm max-w-[200px]">
                          {assignment?.comments ? (
                            <span className="truncate block" title={assignment.comments}>
                              {assignment.comments}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-slate-400 text-sm font-medium">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* List summary footer */}
            <div className="px-4 py-3 border-t border-border bg-white flex flex-wrap items-center gap-5 text-[11px] font-semibold text-slate-500 flex-shrink-0">
              <span className="text-emerald-600">{listRows.filter(r => r.duty && !isWO(r.duty ?? undefined)).length} Duties</span>
              <span className="w-px h-3 bg-slate-200" />
              <span>{listRows.filter(r => r.duty && isWO(r.duty ?? undefined)).length} Weekly Off</span>
              <span className="w-px h-3 bg-slate-200" />
              <span>{listRows.filter(r => !r.assignment).length} Unassigned</span>
            </div>
          </>
        )}
      </div>

      {/* ── Hover Tooltip (rendered outside the card to avoid clipping) ── */}
      {tooltip && activeDuty && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.above ? tooltip.y : tooltip.y,
            transform: tooltip.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          <div className="bg-white border border-border rounded-2xl shadow-2xl p-4 w-64 text-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className={`
                px-2.5 py-1 rounded-md text-xs font-bold border
                ${isWO(activeDuty)
                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                  : 'bg-primary/10 text-primary border-primary/20'}
              `}>
                {activeDuty.duty_code}
              </span>
            </div>

            <p className="font-bold text-slate-800 mb-3 leading-tight">{activeDuty.duty_name}</p>

            {!isWO(activeDuty) && (
              <div className="space-y-2">
                {/* Time row */}
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="font-mono text-xs font-semibold">
                    {fmtTime(activeDuty.start_time)} – {fmtTime(activeDuty.end_time)}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto">{fmtHours(activeDuty.duty_hours)}h</span>
                </div>

                {/* Locations */}
                {(activeDuty.start_location || activeDuty.end_location) && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      {activeDuty.start_location && (
                        <div>
                          <span className="font-bold text-primary text-[10px]">{activeDuty.start_location}</span>
                          <span className="text-slate-500"> {locName(activeDuty.start_location)}</span>
                        </div>
                      )}
                      {activeDuty.end_location && (
                        <div>
                          <span className="font-bold text-primary text-[10px]">{activeDuty.end_location}</span>
                          <span className="text-slate-500"> {locName(activeDuty.end_location)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Comments */}
                {activeAssignment?.comments && (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 italic">
                    {activeAssignment.comments}
                  </div>
                )}
              </div>
            )}

            {isWO(activeDuty) && (
              <p className="text-xs text-slate-400 italic">Weekly Off — no duty assigned</p>
            )}

            {/* Date footer */}
            <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {format(new Date(tooltip.dateStr), 'EEEE, dd MMM yyyy')}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
