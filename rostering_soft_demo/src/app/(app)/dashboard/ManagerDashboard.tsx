'use client';

import { useEffect, useState, useMemo, useCallback, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { format, addDays, subDays, eachDayOfInterval } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Employee, Duty, DutyAssignment, Department, RosterGroup, DutyType, EmployeeRequest, Designation } from '@/types';
import BulkRosterUploadModal from '@/components/BulkRosterUploadModal';
import { useAuth } from '@/context/AuthContext';
import {
  Loader2,
  Calendar as CalendarIcon,
  Users,
  Search,
  GripVertical,
  Info,
  MessageSquare,
  CheckSquare,
  Check,
  X,
  Plus,
  Clock,
  MapPin,

  Shield,
} from 'lucide-react';
import { Button, Select, Input } from '@/components/FormField';
import locationsData from '@/data/locations.json';
import Modal from '@/components/Modal';
import { useDraggable, useDroppable } from '@dnd-kit/core';

type DispatchViewMode = 'planned' | 'dispatch';

export default function ManagerDashboard({ userId, role }: { userId: string, userName: string, role: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [assignments, setAssignments] = useState<DutyAssignment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rosterGroups, setRosterGroups] = useState<RosterGroup[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [rules, setRules] = useState<Record<string, { rules?: Record<string, number> }>>({});
  const [loading, setLoading] = useState(true);

  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentModalAssignment, setCommentModalAssignment] = useState<DutyAssignment | null>(null);
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [viewMode] = useState<DispatchViewMode>('dispatch');
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [menuCell, setMenuCell] = useState<{ employeeId: string; dateStr: string; x: number; y: number; hasAssignment: boolean } | null>(null);
  const [leavesModalCell, setLeavesModalCell] = useState<{ employeeId: string; dateStr: string } | null>(null);
  const [spareModalCell, setSpareModalCell] = useState<{ employeeId: string; dateStr: string } | null>(null);
  const [createSpareModalCell, setCreateSpareModalCell] = useState<{ employeeId: string; dateStr: string } | null>(null);
  const [requestModalData, setRequestModalData] = useState<EmployeeRequest[] | null>(null);
  const [activeRequestTab, setActiveRequestTab] = useState(0);
  const [requestComment, setRequestComment] = useState('');
  const [delegations, setDelegations] = useState<{ roster_group_id: string; access_level: 'view' | 'edit' }[]>([]);
  const { canManageRosters, loading: authLoading } = useAuth();
  const router = useRouter();

  const timelineRef = useRef<HTMLDivElement>(null);
  const handleTimelineScroll = () => {
    // poolRef removed
  };

  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(format(today, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(today, 6), 'yyyy-MM-dd'));
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterDesigId, setFilterDesigId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // bypass redirect for manager dashboard
  }, [authLoading, canManageRosters, router]);

  const supabase = createClient();

  const days = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];
    return eachDayOfInterval({ start, end });
  }, [startDate, endDate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const [empRes, dutyRes, deptRes, rgRes, assignRes, rulesRes, dtRes, delRes, desigRes] = await Promise.all([
      supabase.from('employees').select('*, departments(*), designations(*), roster_groups(*)').order('first_name'),
      supabase.from('duties').select('*, departments(*), roster_groups(*), designations(*), duty_types(*)').order('duty_name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('roster_groups').select('*').order('name'),
      supabase.from('duty_assignments')
        .select('*, employees(*), duties(*, duty_types(*))')
        .gte('assignment_date', format(subDays(new Date(startDate + 'T00:00:00'), 14), 'yyyy-MM-dd'))
        .lte('assignment_date', endDate),
      fetch('/api/rules').then(r => r.json()).catch(() => ({})),
      supabase.from('duty_types').select('*').order('name'),
      supabase.from('planner_delegations').select('roster_group_id, access_level').eq('planner_id', userId),
      supabase.from('designations').select('*').order('name')
    ]);
    setEmployees((empRes.data || []) as Employee[]);
    setDuties((dutyRes.data || []) as Duty[]);
    setDepartments((deptRes.data || []) as Department[]);
    setRosterGroups((rgRes.data || []) as RosterGroup[]);
    setDesignations((desigRes?.data || []) as Designation[]);
    setAssignments((assignRes.data || []) as DutyAssignment[]);
    setRules(rulesRes);
    setDutyTypes((dtRes.data || []) as DutyType[]);

    setDelegations((delRes?.data || []) as Array<{ roster_group_id: string; access_level: 'view' | 'edit' }>);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredRosterGroups = useMemo(() => {
    let result = rosterGroups;
    if (role === 'roster_planner' || role === 'manager') {
      const allowedIds = delegations.map(d => d.roster_group_id);
      result = result.filter(rg => allowedIds.includes(rg.id));
    }
    if (filterDeptId) result = result.filter(rg => rg.department_id === filterDeptId);
    return result;
  }, [filterDeptId, rosterGroups, delegations, role]);

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (role === 'roster_planner' || role === 'manager') {
      const allowedIds = delegations.map(d => d.roster_group_id);
      result = result.filter(e => e.roster_group_id && allowedIds.includes(e.roster_group_id));
    }
    if (filterDeptId) result = result.filter(e => e.department_id === filterDeptId);
    if (filterDesigId) result = result.filter(e => e.designation_id === filterDesigId);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        e.employee_id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [employees, filterDeptId, filterDesigId, searchQuery, delegations, role]);

  const groupedEmployees = useMemo(() => {
    const groups = new Map<string, { group: RosterGroup | null; employees: Employee[] }>();
    
    rosterGroups.forEach(rg => {
      groups.set(rg.id, { group: rg, employees: [] });
    });
    groups.set('unassigned', { group: null, employees: [] });
    
    filteredEmployees.forEach(emp => {
      const groupId = emp.roster_group_id || 'unassigned';
      if (groups.has(groupId)) {
        groups.get(groupId)!.employees.push(emp);
      } else {
        groups.set(groupId, { 
          group: emp.roster_groups || { id: groupId, name: 'Unknown Group' } as RosterGroup, 
          employees: [emp] 
        });
      }
    });
    
    return Array.from(groups.values())
      .filter(g => g.employees.length > 0)
      .sort((a, b) => {
        if (!a.group) return 1;
        if (!b.group) return -1;
        return a.group.name.localeCompare(b.group.name);
      });
  }, [filteredEmployees, rosterGroups]);

  const filteredDuties = useMemo(() => {
    const now = new Date();
    let result = duties.filter(d => !d.expiry_date || new Date(d.expiry_date) > now);
    if (role === 'roster_planner') {
      const allowedIds = delegations.map(d => d.roster_group_id);
      result = result.filter(d => allowedIds.includes(d.roster_group_id) || d.roster_group_id === null);
    }
    if (filterDeptId) result = result.filter(d => d.department_id === filterDeptId);
    if (filterDesigId) result = result.filter(d => d.designation_id === filterDesigId);
    return result;
  }, [duties, filterDeptId, filterDesigId, delegations, role]);

  const canEdit = false;

  const filteredAssignments = useMemo(() => {
    const empIds = new Set(filteredEmployees.map(e => e.id));
    return assignments.filter(a => empIds.has(a.employee_id));
  }, [assignments, filteredEmployees]);

  // Planned: show all (draft + confirmed). Dispatch: confirmed only.
  const displayedAssignments = useMemo(() => {
    if (viewMode === 'dispatch') return filteredAssignments.filter(a => a.status === 'confirmed');
    return filteredAssignments;
  }, [filteredAssignments, viewMode]);

  // Gap between consecutive duties for same employee (key: `empId:dateStr`)
  const { gapMap, violationMap } = useMemo(() => {
    const gaps = new Map<string, { label: string; minutes: number }>();
    const violations = new Map<string, string[]>();

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const calcStart = subDays(start, 14);
    const calcDays = eachDayOfInterval({ start: calcStart, end });

    const visibleDates = new Set(days.map(d => format(d, 'yyyy-MM-dd')));

    filteredEmployees.forEach(emp => {
      let consecutiveDays = 0;
      let weeklyHours = 0;
      let nightShifts = 0;
      let prevDay: Date | null = null;
      let prevAssignment: DutyAssignment | null = null;

      const empRules = emp.roster_group_id ? rules[emp.roster_group_id]?.rules : null;

      calcDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const asgn = displayedAssignments.find(
          a => a.employee_id === emp.id && a.assignment_date === dateStr
        );

        const isVisible = visibleDates.has(dateStr);
        const currentViolations: string[] = [];

        const duty = asgn?.duties;
        const isWork = duty &&
          !duty.duty_code.toUpperCase().startsWith('WO') &&
          !duty.duty_types?.name.toLowerCase().includes('leave');

        if (isWork) {
          consecutiveDays++;
          weeklyHours += (duty.duty_hours || 0);

          const startHour = parseInt(duty.start_time.split(':')[0]);
          if (startHour >= 22 || startHour < 5) {
            nightShifts++;
          }

          if (isVisible) {
            if (empRules?.max_consecutive_working_days && consecutiveDays > empRules.max_consecutive_working_days) {
              currentViolations.push(`Exceeds max consecutive days (${empRules.max_consecutive_working_days})`);
            }
            if (empRules?.max_working_hours_per_week && weeklyHours > empRules.max_working_hours_per_week) {
              currentViolations.push(`Exceeds max weekly hours (${empRules.max_working_hours_per_week}h)`);
            }
            if (empRules?.night_shift_limit && nightShifts > empRules.night_shift_limit) {
              currentViolations.push(`Exceeds night shift limit (${empRules.night_shift_limit})`);
            }
          }

          if (prevAssignment?.duties && prevDay) {
            const daysDiff = Math.round((day.getTime() - prevDay.getTime()) / 86_400_000);
            const [ph, pm] = prevAssignment.duties.end_time.split(':').map(Number);
            const [ch, cm] = duty.start_time.split(':').map(Number);
            const gapMin = daysDiff * 1440 - (ph * 60 + pm) + (ch * 60 + cm);

            if (gapMin > 0) {
              const h = Math.floor(gapMin / 60);
              const m = gapMin % 60;

              if (isVisible) {
                gaps.set(`${emp.id}:${dateStr}`, {
                  label: m > 0 ? `${h}h ${m}m` : `${h}h`,
                  minutes: gapMin
                });

                if (empRules?.min_rest_hours_between_shifts && (gapMin / 60) < empRules.min_rest_hours_between_shifts) {
                  currentViolations.push(`Insufficient rest: ${h}h ${m}m (Min: ${empRules.min_rest_hours_between_shifts}h)`);
                }
              }
            }
          }

          if (isVisible && currentViolations.length > 0) {
            violations.set(`${emp.id}:${dateStr}`, currentViolations);
          }

          prevDay = day;
          prevAssignment = asgn;
        } else {
          consecutiveDays = 0;
          weeklyHours = 0;
          nightShifts = 0;
        }
      });
    });
    return { gapMap: gaps, violationMap: violations };
  }, [filteredEmployees, displayedAssignments, days, rules, startDate, endDate]);

  const spareDuties = useMemo(() => {
    const spareType = dutyTypes.find(dt =>
      dt.name.toLowerCase().includes('spare') ||
      dt.shortcode.toLowerCase().includes('spare') ||
      dt.shortcode.toUpperCase() === 'SPR'
    );
    if (!spareType) return [];
    return duties.filter(d => d.duty_type_id === spareType.id);
  }, [duties, dutyTypes]);


  const confirmedCount = useMemo(() => filteredAssignments.filter(a => a.status === 'confirmed').length, [filteredAssignments]);

  const leaveDuties = useMemo(() => {
    const leaveType = dutyTypes.find(dt =>
      dt.name.toLowerCase().includes('leave') ||
      dt.shortcode.toLowerCase().includes('leave')
    );
    if (!leaveType) return [];
    return duties.filter(d => d.duty_type_id === leaveType.id);
  }, [duties, dutyTypes]);

  const totalUnassignedSlots = useMemo(() => {
    let count = 0;
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const unassigned = filteredEmployees.filter(emp => 
        !filteredAssignments.some(a => a.employee_id === emp.id && a.assignment_date === dateStr)
      ).length;
      count += unassigned;
    });
    return count;
  }, [days, filteredEmployees, filteredAssignments]);

  const leaveCount = useMemo(() => {
    const leaveIds = new Set(leaveDuties.map(d => d.id));
    return displayedAssignments.filter(a => 
      (a.duty_id && leaveIds.has(a.duty_id)) || 
      (a.duties?.id && leaveIds.has(a.duties.id))
    ).length;
  }, [displayedAssignments, leaveDuties]);

  const woCount = useMemo(() => {
    return displayedAssignments.filter(a => 
      a.duties?.duty_code?.toUpperCase() === 'WO' || 
      a.duties?.duty_code?.toUpperCase().startsWith('WO')
    ).length;
  }, [displayedAssignments]);

  const shiftBreakdown = useMemo(() => {
    let m = 0, e = 0, n = 0, g = 0;
    displayedAssignments.forEach(a => {
      const code = a.duties?.duty_code?.toUpperCase() || '';
      if (code.startsWith('M')) m++;
      else if (code.startsWith('E')) e++;
      else if (code.startsWith('N')) n++;
      else if (code.startsWith('G')) g++;
    });
    return { m, e, n, g };
  }, [displayedAssignments]);

  const handleCellClick = (e: React.MouseEvent, employeeId: string, dateStr: string) => {
    if (viewMode !== 'planned' || !canEdit) return;
    const hasAssignment = assignments.some(a => a.employee_id === employeeId && a.assignment_date === dateStr);
    setMenuCell({
      employeeId,
      dateStr,
      x: e.clientX,
      y: e.clientY,
      hasAssignment
    });
  };

  const handleQuickAssign = async (employeeId: string, dateStr: string, dutyId: string) => {
    if (!canEdit) return;
    
    if (role !== 'system_admin' && dateStr < format(new Date(), 'yyyy-MM-dd')) {
      alert("Only system administrators are allowed to create or modify assignments for past dates.");
      return;
    }

    const res = await fetch('/api/duty-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId, duty_id: dutyId, assignment_date: dateStr, status: 'draft' }),
    });

    if (res.ok) {
      const data = await res.json();
      setAssignments(prev => {
        const filtered = prev.filter(a => !(a.employee_id === employeeId && a.assignment_date === dateStr));
        return [...filtered, data as DutyAssignment];
      });
    } else {
      const err = await res.json();
      alert(`Assignment failed: ${err.error}`);
    }
  };

  const handleWOAssign = () => {
    if (!menuCell || !canEdit) return;
    const { employeeId, dateStr } = menuCell;
    setMenuCell(null);
    const woDuty = duties.find(d =>
      d.duty_code.toUpperCase() === 'WO' ||
      d.duty_code.toUpperCase().startsWith('WO')
    );
    if (woDuty) {
      handleQuickAssign(employeeId, dateStr, woDuty.id);
    } else {
      alert('Weekly Off (WO) duty not found in the system.');
    }
  };

  const handleCancelAssign = async () => {
    if (!menuCell || !canEdit) return;
    const { employeeId, dateStr } = menuCell;
    setMenuCell(null);

    const assignment = assignments.find(a => a.employee_id === employeeId && a.assignment_date === dateStr);
    if (!assignment) return;

    const res = await fetch(`/api/duty-assignments/${assignment.id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
    } else {
      const err = await res.json();
      alert(`Cancellation failed: ${err.error}`);
    }
  };

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    if (!canEdit) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || viewMode !== 'planned' || !canEdit) return;

    const [employeeId, dateStr] = (over.id as string).split(':');
    
    if (role !== 'system_admin' && dateStr < format(new Date(), 'yyyy-MM-dd')) {
      alert("Only system administrators are allowed to create or modify assignments for past dates.");
      return;
    }

    const sourceData = active.data.current;
    if (!sourceData) return;

    if (sourceData.type === 'pool-duty') {
      const duty = sourceData.duty as Duty;
      const res = await fetch('/api/duty-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, duty_id: duty.id, assignment_date: dateStr, status: 'draft' }),
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(prev => {
          const filtered = prev.filter(a => !(a.employee_id === employeeId && a.assignment_date === dateStr));
          return [...filtered, data as DutyAssignment];
        });
      } else {
        const err = await res.json();
        alert(`Assignment failed: ${err.error}`);
      }
    } else if (sourceData.type === 'existing-assignment') {
      const assignment = sourceData.assignment as DutyAssignment;
      if (assignment.employee_id === employeeId && assignment.assignment_date === dateStr) return;
      const res = await fetch(`/api/duty-assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, assignment_date: dateStr }),
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(prev => {
          const filtered = prev.filter(a => a.id !== assignment.id && !(a.employee_id === employeeId && a.assignment_date === dateStr));
          return [...filtered, data as DutyAssignment];
        });
      } else {
        const err = await res.json();
        alert(`Movement failed: ${err.error}`);
      }
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleConfirmAssignment = async (assignmentId: string) => {
    if (!canEdit) return;
    const res = await fetch(`/api/duty-assignments/${assignmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    if (res.ok) {
      const data = await res.json();
      setAssignments(prev => prev.map(a => a.id === assignmentId ? data : a));
    }
  };



  const processRequest = async (status: 'approved' | 'rejected') => {
    if (!requestModalData || !canEdit) return;
    const currentReq = requestModalData[activeRequestTab];
    if (!currentReq) return;
    
    try {
      const res = await fetch(`/api/employee-requests/${currentReq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, planner_comment: requestComment })
      });
      if (res.ok) {
        if (requestModalData.length === 1) {
          setRequestModalData(null);
          setRequestComment('');
        } else {
          const updated = [...requestModalData];
          const data = await res.json();
          updated[activeRequestTab] = data;
          setRequestModalData(updated);
        }
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };



  const handleSaveComment = async () => {
    if (!commentModalAssignment || !canEdit) return;
    setSavingComment(true);
    const res = await fetch(`/api/duty-assignments/${commentModalAssignment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: commentText }),
    });
    if (res.ok) {
      const data = await res.json();
      setAssignments(prev => prev.map(a => a.id === commentModalAssignment.id ? data : a));
      setCommentModalAssignment(null);
    } else {
      alert('Failed to save comment');
    }
    setSavingComment(false);
  };

  const activeDuty = useMemo(() => {
    if (!activeId) return null;
    if (activeId.startsWith('pool_')) return duties.find(d => d.id === activeId.split('_')[1]);
    return duties.find(d => d.id === activeId);
  }, [activeId, duties]);

  const activeAssignment = useMemo(() => {
    if (!activeId) return null;
    return assignments.find(a => a.id === activeId);
  }, [activeId, assignments]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Synchronizing with central railway...</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-[calc(100vh-120px)] min-h-[600px] gap-3 w-full min-w-0">

        {/* ── Header Card ────────────────────────────────────────────────── */}
        <div className="bg-white border border-border py-3 px-5 rounded-2xl shadow-sm flex flex-col gap-3">
          {/* Row 1: Primary Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Date range */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-border px-2 py-1 rounded-lg">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent text-xs text-slate-900 focus:outline-none w-[110px]"
                />
                <span className="text-slate-300 text-[10px] font-bold uppercase">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent text-xs text-slate-900 focus:outline-none w-[110px]"
                />
              </div>
            </div>

            {/* Quick Metrics for Manager */}
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-400/20 px-3 py-1.5 rounded-xl shadow-sm">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-600 font-medium">Confirmed:</span>
                <span className="font-black text-emerald-700 text-sm">{confirmedCount}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-400/20 px-3 py-1.5 rounded-xl shadow-sm">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-slate-600 font-medium">Staff:</span>
                <span className="font-black text-indigo-700 text-sm">{filteredEmployees.length}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-400/20 px-3 py-1.5 rounded-xl shadow-sm">
                <X className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-slate-600 font-medium">Unassigned:</span>
                <span className="font-black text-rose-700 text-sm">{totalUnassignedSlots}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-400/20 px-3 py-1.5 rounded-xl shadow-sm">
                <CalendarIcon className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-slate-600 font-medium">Leave:</span>
                <span className="font-black text-amber-700 text-sm">{leaveCount}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-400/20 px-3 py-1.5 rounded-xl shadow-sm">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-600 font-medium">WO:</span>
                <span className="font-black text-blue-700 text-sm">{woCount}</span>
              </div>
              {/* Shift Breakdown */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Shifts:</span>
                <span className="flex items-center gap-1 bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[10px]">M: {shiftBreakdown.m}</span>
                <span className="flex items-center gap-1 bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[10px]">E: {shiftBreakdown.e}</span>
                <span className="flex items-center gap-1 bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[10px]">N: {shiftBreakdown.n}</span>
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[10px]">G: {shiftBreakdown.g}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Search & Filters */}
          <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-slate-50">
            <div className="relative group flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 bg-slate-50 border border-border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all w-full"
              />
            </div>
            <div className="min-w-[180px]">
              <Select
                value={filterDeptId}
                onChange={e => setFilterDeptId(e.target.value)}
                className="bg-slate-50 border-border text-slate-900 text-xs h-8 rounded-lg"
              >
                <option value="" className="bg-white">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="bg-white">[{d.shortcode}] {d.name}</option>
                ))}
              </Select>
            </div>
            <div className="min-w-[180px]">
              <Select
                value={filterDesigId}
                onChange={e => setFilterDesigId(e.target.value)}
                className="bg-slate-50 border-border text-slate-900 text-xs h-8 rounded-lg"
              >
                <option value="" className="bg-white">All Designations</option>
                {designations.map(d => (
                  <option key={d.id} value={d.id} className="bg-white">{d.name}</option>
                ))}
              </Select>
          </div>
        </div>

        {/* ── Delegation Notice for Planners ─────────────────────────────────────────────── */}
        {role === 'roster_planner' && (
          <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700">
              {canEdit ? "You have edit access to your assigned groups." : "Viewing assigned groups in read-only mode."}
            </span>
          </div>
        )}

        {/* ── Split Container ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">

          {/* Timeline panel */}
          <div className={`bg-white border border-border rounded-[32px] overflow-hidden flex flex-col shadow-sm transition-all min-w-0 ${viewMode === 'planned' ? 'flex-1' : 'flex-1'
            }`}>
            <div
              ref={timelineRef}
              onScroll={handleTimelineScroll}
              className="overflow-auto flex-1 custom-scrollbar"
            >
              <table className="w-max border-separate border-spacing-0">
                <thead className="sticky top-0 z-[40]">
                  <tr>
                    <th className="p-3 text-left w-52 min-w-[208px] max-w-[208px] border-b border-r border-border sticky left-0 top-0 bg-slate-50 z-[50]">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Employee</span>
                      </div>
                    </th>
                    {days.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const emptyCount = filteredEmployees.filter(emp => !filteredAssignments.some(a => a.employee_id === emp.id && a.assignment_date === dateStr)).length;

                      return (
                        <th key={dateStr} className={`p-2 text-center w-[150px] min-w-[150px] max-w-[150px] border-b border-r border-border ${viewMode === 'planned' ? 'bg-amber-50/60' : 'bg-emerald-50/60'
                          }`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[11px] font-bold text-slate-900 tracking-tight">{format(day, 'dd MMM (EEE)')}</span>
                            
                              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold mt-1">
                                <span className="text-rose-500" title={`${emptyCount} unassigned`}>{emptyCount}</span>
                              </div>
                              

                            </div>
                          </th>
                      );
                    })}
                    <th className="p-3 text-center w-40 min-w-[160px] max-w-[160px] border-b border-l border-border sticky right-0 top-0 bg-slate-50 z-[50]">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Summary</span>
                        <div className="flex gap-4 w-full justify-center">
                          <span className="text-[9px] font-bold text-slate-500" title="Morning">M</span>
                          <span className="text-[9px] font-bold text-slate-500" title="Evening">E</span>
                          <span className="text-[9px] font-bold text-slate-500" title="Night">N</span>
                          <span className="text-[9px] font-bold text-slate-500" title="General">G</span>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groupedEmployees.map(({ group, employees }) => (
                    <Fragment key={group?.id || 'unassigned'}>
                      {/* Roster Group Header Row */}
                      <tr className="bg-slate-100/80 font-bold text-[11px] text-slate-800">
                        <td className="p-2 border-r border-b border-border sticky left-0 bg-slate-100 z-[30] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center gap-2 px-1 py-0.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            <span className="font-bold text-xs text-slate-700 tracking-tight">
                              {group ? group.name : 'Unassigned Group'}
                            </span>
                          </div>
                        </td>
                        <td colSpan={days.length + 1} className="p-2 border-b border-border bg-slate-100 text-left pl-4 text-xs font-semibold text-slate-500">
                          {employees.length} Employee{employees.length > 1 ? 's' : ''}
                        </td>
                      </tr>
                      
                      {employees.map(employee => (
                        <tr key={employee.id} className="group transition-colors">
                          <td className="p-3 border-r border-b border-border sticky left-0 bg-white z-[30] w-52 min-w-[208px] max-w-[208px] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] group-hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                                {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 leading-tight truncate" title={`${employee.first_name} ${employee.last_name}`}>{employee.first_name} {employee.last_name}</p>
                                <p className="text-[9px] uppercase font-black tracking-tighter text-slate-500 mt-0.5 truncate">
                                  {employee.employee_id} · {employee.designations?.shortcode ?? ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          {days.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const assignment = displayedAssignments.find(
                              a => a.employee_id === employee.id && a.assignment_date === dateStr
                            );
                            return (
                              <TimelineCell
                                key={`${employee.id}:${dateStr}`}
                                id={`${employee.id}:${dateStr}`}
                                assignment={assignment}
                                isReadOnly={viewMode === 'dispatch' || !canEdit}
                                gapFromPrev={gapMap.get(`${employee.id}:${dateStr}`)}
                                violations={violationMap.get(`${employee.id}:${dateStr}`)}
                                onConfirm={handleConfirmAssignment}
                                onEditComment={a => {
                                  setCommentText(a.comments || '');
                                  setCommentModalAssignment(a);
                                }}
                                onClick={(e) => handleCellClick(e, employee.id, dateStr)}
                              />
                            );
                          })}
                          {(() => {
                            let m = 0, e = 0, n = 0, g = 0;
                            days.forEach(day => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              const assignment = displayedAssignments.find(
                                a => a.employee_id === employee.id && a.assignment_date === dateStr
                              );
                              const code = assignment?.duties?.duty_code?.toUpperCase() || '';
                              if (code.startsWith('M')) m++;
                              else if (code.startsWith('E')) e++;
                              else if (code.startsWith('N')) n++;
                              else if (code.startsWith('G')) g++;
                            });
                            return (
                              <td className="p-3 border-l border-b border-border sticky right-0 bg-white z-[30] w-40 min-w-[160px] max-w-[160px] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] group-hover:bg-slate-50 transition-colors">
                                <div className="flex justify-center items-center gap-4">
                                  <span className={`text-xs font-black w-4 text-center ${m > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{m}</span>
                                  <span className={`text-xs font-black w-4 text-center ${e > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{e}</span>
                                  <span className={`text-xs font-black w-4 text-center ${n > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{n}</span>
                                  <span className={`text-xs font-black w-4 text-center ${g > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{g}</span>
                                </div>
                              </td>
                            );
                          })()}
                    </tr>
                      ))}
                    </Fragment>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={days.length + 2} className="text-center py-12 text-slate-500 font-medium">
                        No employees match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeId ? (
          activeDuty ? (
            <div className="w-[220px]"><DutyCard duty={activeDuty} /></div>
          ) : activeAssignment ? (
            <div className="w-[150px] h-[90px]">
              <AssignmentCard assignment={activeAssignment} isReadOnly={false} onConfirm={() => { }} />
            </div>
          ) : null
        ) : null}
      </DragOverlay>

      {/* Comment modal */}
      <Modal
        open={!!commentModalAssignment}
        onClose={() => setCommentModalAssignment(null)}
        title="Shift Comments"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCommentModalAssignment(null)} type="button">Cancel</Button>
            <Button onClick={handleSaveComment} disabled={savingComment} type="button">
              {savingComment ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <textarea
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          className="w-full h-32 p-3 bg-slate-50 border border-border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Enter comments for this shift..."
        />
      </Modal>

      {/* Quick Action Menu */}
      {menuCell && (
        <QuickActionMenu
          x={menuCell.x}
          y={menuCell.y}
          hasAssignment={menuCell.hasAssignment}
          onClose={() => setMenuCell(null)}
          onWO={handleWOAssign}
          onLeaves={() => {
            setLeavesModalCell({ employeeId: menuCell.employeeId, dateStr: menuCell.dateStr });
            setMenuCell(null);
          }}
          onSpare={() => {
            setSpareModalCell({ employeeId: menuCell.employeeId, dateStr: menuCell.dateStr });
            setMenuCell(null);
          }}
          onCreateSpare={() => {
            setCreateSpareModalCell({ employeeId: menuCell.employeeId, dateStr: menuCell.dateStr });
            setMenuCell(null);
          }}
          onCancel={handleCancelAssign}
        />
      )}

      {/* Employee Request Process Modal */}
      <Modal open={!!requestModalData} onClose={() => setRequestModalData(null)} title="Review Employee Request">
        {requestModalData && (
          <div className="flex flex-col gap-4 p-1">
            {requestModalData.length > 1 && (
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                {requestModalData.map((req, idx) => (
                  <button
                    key={req.id}
                    onClick={() => {
                      setActiveRequestTab(idx);
                      setRequestComment(req.planner_comment || '');
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      activeRequestTab === idx ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {req.request_type === 'leave' ? 'Leave' : 'Shift Change'}
                  </button>
                ))}
              </div>
            )}

            {requestModalData[activeRequestTab] && (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                      <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                        requestModalData[activeRequestTab].request_type === 'leave' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {requestModalData[activeRequestTab].request_type === 'leave' ? 'Leave Request' : 'Shift Change'}
                      </span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        Applied: {format(new Date(requestModalData[activeRequestTab].created_at), 'dd MMM, HH:mm')}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      requestModalData[activeRequestTab].status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      requestModalData[activeRequestTab].status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {requestModalData[activeRequestTab].status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3 border-b border-slate-200 pb-3">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Request Date</p>
                      <p className="text-sm font-bold text-slate-900">{format(new Date(requestModalData[activeRequestTab].request_date + 'T00:00:00'), 'dd MMM yyyy')}</p>
                    </div>
                    {requestModalData[activeRequestTab].target_duty && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{requestModalData[activeRequestTab].request_type === 'leave' ? 'Leave Option' : 'Shift Option'}</p>
                        <p className="text-sm font-bold text-slate-900">
                          {requestModalData[activeRequestTab].target_duty?.duty_code} - {requestModalData[activeRequestTab].target_duty?.duty_name}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 font-medium"><strong>Reason:</strong> {requestModalData[activeRequestTab].reason}</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Planner Comment</label>
                  <textarea
                    value={requestComment}
                    onChange={e => setRequestComment(e.target.value)}
                    className="w-full p-3 bg-white border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="Optional comment for the employee..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-1">
                  <Button onClick={() => processRequest('rejected')} className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-5 rounded-xl font-bold border border-rose-200">
                    Reject
                  </Button>
                  <Button onClick={() => processRequest('approved')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 rounded-xl font-bold shadow-sm">
                    Approve
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Leaves Modal */}
      <DutyListModal
        open={!!leavesModalCell}
        onClose={() => setLeavesModalCell(null)}
        title="Select Leave Duty"
        duties={leaveDuties}
        onSelect={(dutyId) => {
          if (leavesModalCell) {
            handleQuickAssign(leavesModalCell.employeeId, leavesModalCell.dateStr, dutyId);
            setLeavesModalCell(null);
          }
        }}
      />

      {/* Assign Spare Modal */}
      <DutyListModal
        open={!!spareModalCell}
        onClose={() => setSpareModalCell(null)}
        title="Select Spare Duty"
        duties={spareDuties}
        onSelect={(dutyId) => {
          if (spareModalCell) {
            handleQuickAssign(spareModalCell.employeeId, spareModalCell.dateStr, dutyId);
            setSpareModalCell(null);
          }
        }}
      />

      {/* Quick Create Spare Modal */}
      {createSpareModalCell && (
        <QuickCreateSpareModal
          open={!!createSpareModalCell}
          onClose={() => setCreateSpareModalCell(null)}
          employee={employees.find(e => e.id === createSpareModalCell.employeeId)!}

          dutyTypes={dutyTypes}
          onCreated={async (newDutyId) => {
            // First fetch latest duties so we have the new one
            const { data } = await supabase.from('duties').select('*, duty_types(*)');
            if (data) setDuties(data as Duty[]);

            // Then assign it immediately to the person
            handleQuickAssign(createSpareModalCell.employeeId, createSpareModalCell.dateStr, newDutyId);
            setCreateSpareModalCell(null);
          }}
        />
      )}

      <BulkRosterUploadModal
        isOpen={bulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        startDate={startDate}
        endDate={endDate}
        rosterGroups={filteredRosterGroups}
        employees={filteredEmployees}
        duties={filteredDuties}
        onUploadSuccess={loadData}
      />
      </div>
    </DndContext>
  );
}

// ── Helper Components ─────────────────────────────────────────────────────────

function QuickActionMenu({ x, y, hasAssignment, onWO, onLeaves, onSpare, onCreateSpare, onCancel, onClose }: {
  x: number;
  y: number;
  hasAssignment: boolean;
  onWO: () => void;
  onLeaves: () => void;
  onSpare: () => void;
  onCreateSpare: () => void;
  onCancel: () => void;
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div
        className="fixed z-[101] bg-white border border-border rounded-xl shadow-2xl py-2 w-56 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 240 : x), top: y }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onWO(); }}
          className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 group"
        >
          <div className="w-2 h-2 rounded-full bg-amber-500 group-hover:scale-125 transition-transform" />
          Assign Weekly Off (WO)
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onLeaves(); }}
          className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 group"
        >
          <div className="w-2 h-2 rounded-full bg-rose-500 group-hover:scale-125 transition-transform" />
          Assign Leaves...
        </button>

        <div className="my-1 border-t border-slate-100 mx-2" />

        <button
          onClick={(e) => { e.stopPropagation(); onSpare(); }}
          className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 group"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 group-hover:scale-110 transition-transform flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-white" />
          </div>
          Assign Spare...
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onCreateSpare(); }}
          className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 group"
        >
          <Plus className="w-3.5 h-3.5 text-blue-500 group-hover:rotate-90 transition-transform" />
          Create Spare Duty
        </button>

        {hasAssignment && (
          <>
            <div className="my-1 border-t border-slate-100 mx-2" />
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="w-full text-left px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
            >
              <X className="w-3.5 h-3.5" />
              Cancel Assignment
            </button>
          </>
        )}
      </div>
    </>
  );
}

function DutyListModal({ open, onClose, title, duties, onSelect }: { open: boolean; onClose: () => void; title: string; duties: Duty[]; onSelect: (id: string) => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {duties.length === 0 && (
          <div className="text-center py-8 text-slate-400 italic">No duties found of this type.</div>
        )}
        {duties.map(duty => (
          <button
            key={duty.id}
            onClick={() => onSelect(duty.id)}
            className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-slate-50 transition-all text-left group"
          >
            <div>
              <p className="text-sm font-bold text-slate-900">{duty.duty_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-primary px-1.5 py-0.5 rounded bg-primary/5 uppercase tracking-tighter">{duty.duty_code}</span>
                {duty.start_time && (
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {duty.start_time.slice(0, 5)}—{duty.end_time?.slice(0, 5)}
                  </span>
                )}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Check className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function QuickCreateSpareModal({ open, onClose, employee, dutyTypes, onCreated }: {
  open: boolean;
  onClose: () => void;
  employee: Employee;

  dutyTypes: DutyType[];
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState({
    duty_name: 'Spare Duty',
    duty_code: '',
    start_time: '08:00',
    end_time: '16:00',
    start_location: '',
    end_location: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const spareType = dutyTypes.find(dt =>
      dt.name.toLowerCase().includes('spare') ||
      dt.shortcode.toLowerCase().includes('spare') ||
      dt.shortcode.toUpperCase() === 'SPR'
    );

    if (!spareType) {
      setError('Spare duty type not found in system.');
      setSaving(false);
      return;
    }

    const payload = {
      ...form,
      duty_type_id: spareType.id,
      department_id: employee.department_id,
      roster_group_id: employee.roster_group_id,
      designation_id: employee.designation_id, // Assigned to staff's designation
      duty_code: form.duty_code || `SPR-${Math.random().toString(36).substring(7).toUpperCase()}`
    };

    try {
      const res = await fetch('/api/duties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create duty');

      onCreated(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create spare duty');
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Create Spare Duty for ${employee.first_name}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creating...' : 'Create & Assign'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Duty Code</label>
            <Input
              value={form.duty_code}
              onChange={e => setForm({ ...form, duty_code: e.target.value.toUpperCase() })}
              placeholder="e.g. SPR-01"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Duty Name</label>
            <Input
              value={form.duty_name}
              onChange={e => setForm({ ...form, duty_name: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Start Time
            </label>
            <Input
              type="time"
              value={form.start_time}
              onChange={e => setForm({ ...form, start_time: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> End Time
            </label>
            <Input
              type="time"
              value={form.end_time}
              onChange={e => setForm({ ...form, end_time: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> Start Location
            </label>
            <Select
              value={form.start_location}
              onChange={e => setForm({ ...form, start_location: e.target.value })}
              required
            >
              <option value="">Select...</option>
              {locationsData.location_info.all_locations.map(loc => (
                <option key={loc.location_code} value={loc.location_code}>
                  {loc.location_code} - {loc.location_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> End Location
            </label>
            <Select
              value={form.end_location}
              onChange={e => setForm({ ...form, end_location: e.target.value })}
              required
            >
              <option value="">Select...</option>
              {locationsData.location_info.all_locations.map(loc => (
                <option key={loc.location_code} value={loc.location_code}>
                  {loc.location_code} - {loc.location_name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </form>
    </Modal>
  );
}



function DutyCard({ duty }: { duty: Duty }) {
  return (
    <div className="px-3 py-2.5 rounded-xl bg-white border border-border shadow-sm flex items-center justify-between hover:border-primary/50 hover:bg-slate-50 transition-all group w-full">
      <div className="flex items-center gap-2 overflow-hidden">
        <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors flex-shrink-0" />
        <div className="flex flex-col truncate">
          <span className="text-[11px] font-black text-slate-900 truncate">{duty.duty_code}</span>
          <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">
            {duty.start_time?.slice(0, 5)}—{duty.end_time?.slice(0, 5)}
          </span>
        </div>
      </div>
      <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary flex-shrink-0" />
    </div>
  );
}

function DraggableAssignment({
  assignment, isReadOnly, violations, onConfirm, onEditComment,
}: {
  assignment: DutyAssignment;
  isReadOnly: boolean;
  violations?: string[];
  onConfirm?: () => void;
  onEditComment?: (a: DutyAssignment) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: assignment.id,
    data: { type: 'existing-assignment', assignment, onConfirm },
    disabled: isReadOnly,
  });
  if (isDragging) {
    return <div ref={setNodeRef} className="h-full w-full bg-primary/20 rounded-2xl border-2 border-dashed border-primary/40" />;
  }
  return (
    <div
      ref={setNodeRef}
      {...(isReadOnly ? {} : { ...listeners, ...attributes })}
      className={`h-full w-full ${isReadOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <AssignmentCard
        assignment={assignment}
        isReadOnly={isReadOnly}
        violations={violations}
        onConfirm={onConfirm}
        onEditComment={onEditComment}
      />
    </div>
  );
}

function AssignmentCard({
  assignment, isReadOnly, violations, onConfirm, onEditComment,
}: {
  assignment: DutyAssignment;
  isReadOnly: boolean;
  violations?: string[];
  onConfirm?: () => void;
  onEditComment?: (a: DutyAssignment) => void;
}) {
  const isConfirmed = assignment.status === 'confirmed';
  const cardRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties | null>(null);

  const showTooltip = () => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const TOOLTIP_W = 288;
    const TOOLTIP_H = 220; // approximate
    const spaceAbove = rect.top;
    const above = spaceAbove > TOOLTIP_H + 8;
    // Clamp x so tooltip never overflows viewport edges
    const rawLeft = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - TOOLTIP_W - 8));
    setTooltipStyle({
      position: 'fixed',
      zIndex: 9999,
      width: TOOLTIP_W,
      left,
      ...(above
        ? { top: rect.top - 8, transform: 'translateY(-100%)' }
        : { top: rect.bottom + 8 }),
    });
  };

  const hideTooltip = () => setTooltipStyle(null);

  return (
    <>
      <div
        ref={cardRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className={`relative h-full w-full rounded-xl py-1.5 pr-1.5 pl-5 flex flex-col justify-between border shadow-sm transition-all ${!isReadOnly ? 'hover:scale-[1.02]' : ''
          } ${isConfirmed
            ? 'bg-emerald-50 border-emerald-400/40'
            : 'bg-slate-50 border-slate-200'
          }`}
      >
        {/* ── Top row: duty code + action buttons ── */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded tracking-tight ${isConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
            {assignment.duties?.duty_code ?? '—'}
          </span>
          <div className="flex items-center gap-1 relative z-10">
            {!isReadOnly && !isConfirmed && onConfirm && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); hideTooltip(); onConfirm(); }}
                className="p-1 rounded-md hover:bg-emerald-500 hover:text-white text-emerald-600 transition-colors"
                title="Confirm"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
            {isReadOnly && isConfirmed && (
              <div className="p-1 text-emerald-500" title="Confirmed">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            {!isReadOnly && onEditComment && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); hideTooltip(); onEditComment(assignment); }}
                className={`p-1 rounded-md transition-colors ${assignment.comments ? 'text-blue-600 hover:bg-blue-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                title={assignment.comments ? 'Edit comment' : 'Add comment'}
              >
                <MessageSquare className="w-3 h-3" />
              </button>
            )}
            <Info className={`w-3 h-3 transition-colors ${violations && violations.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
          </div>
        </div>

        {/* ── Bottom row: Sign-On left | Sign-Off right ── */}
        <div className="flex items-center justify-between mt-0.5">
          {/* Sign-On: location | time */}
          <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tight">
            {assignment.duties?.start_location ?? '—'} <span className="text-slate-400">|</span> {assignment.duties?.start_time?.slice(0, 5) ?? '—'}
          </span>
          {/* Sign-Off: location | time */}
          <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tight text-right">
            {assignment.duties?.end_location ?? '—'} <span className="text-slate-400">|</span> {assignment.duties?.end_time?.slice(0, 5) ?? '—'}
          </span>
        </div>
      </div>

      {/* Portal tooltip — rendered on document.body to escape overflow:auto clipping */}
      {tooltipStyle && typeof document !== 'undefined' && createPortal(
        <div style={tooltipStyle} className="bg-white border border-border rounded-xl shadow-2xl p-4 pointer-events-none">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-900">{assignment.duties?.duty_code}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isConfirmed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
              {assignment.status}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-700 mb-3">{assignment.duties?.duty_name}</p>
          <div className="space-y-1.5 text-sm">
            <p className="text-slate-800">
              <span className="text-slate-500 font-medium mr-1">Route:</span>
              {assignment.duties?.start_location || 'N/A'} → {assignment.duties?.end_location || 'N/A'}
            </p>
            <p className="text-slate-800">
              <span className="text-slate-500 font-medium mr-1">Time:</span>
              {assignment.duties?.start_time?.slice(0, 5)} – {assignment.duties?.end_time?.slice(0, 5)}
            </p>
            <p className="text-slate-800">
              <span className="text-slate-500 font-medium mr-1">Duration:</span>
              {assignment.duties?.duty_hours
                ? `${Math.floor(assignment.duties.duty_hours).toString().padStart(2, '0')}:${Math.round((assignment.duties.duty_hours % 1) * 60).toString().padStart(2, '0')}`
                : '—'}
            </p>
            <p className="text-slate-800">
              <span className="text-slate-500 font-medium mr-1">Date:</span>
              {format(new Date(assignment.assignment_date + 'T00:00:00'), 'dd MMM yyyy')}
            </p>
          </div>

          {violations && violations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-rose-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1.5 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Rule Violations
              </p>
              <ul className="space-y-1">
                {violations.map((v, i) => (
                  <li key={i} className="text-[11px] font-bold text-rose-500 leading-tight flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 rounded-full bg-rose-300 flex-shrink-0" />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {assignment.comments && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-slate-600 italic leading-snug">&quot;{assignment.comments}&quot;</p>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

function TimelineCell({
  id, assignment, isReadOnly, gapFromPrev, violations, onConfirm, onEditComment, onClick
}: {
  id: string;
  assignment?: DutyAssignment;
  isReadOnly: boolean;
  gapFromPrev?: { label: string; minutes: number };
  violations?: string[];
  onConfirm?: (id: string) => void;
  onEditComment?: (a: DutyAssignment) => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled: isReadOnly });

  return (
    <td
      ref={setNodeRef}
      onClick={onClick}
      className={`relative p-1 border-r border-b border-slate-100 w-[150px] min-w-[150px] max-w-[150px] h-[56px] transition-all bg-white group-hover:bg-slate-50/60 ${isOver && !isReadOnly ? 'bg-primary/5 ring-2 ring-primary inset-0' : ''
        }`}
    >


      {/* Gap indicator — left edge badge between consecutive duties */}
      {gapFromPrev && assignment && (
        <div className="absolute -left-px top-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
          <div className={`w-px h-6 ${gapFromPrev.minutes < 720 ? 'bg-rose-300' :
              gapFromPrev.minutes <= 840 ? 'bg-amber-300' : 'bg-emerald-300'
            }`} />
          <div className={`text-white text-[8px] font-black px-1.5 py-0.5 rounded whitespace-nowrap shadow-md ${gapFromPrev.minutes < 720 ? 'bg-rose-600' :
              gapFromPrev.minutes <= 840 ? 'bg-amber-500' : 'bg-emerald-600'
            }`}>
            {gapFromPrev.label.includes('h') && gapFromPrev.label.includes('m') ? (
              <div className="flex flex-col items-center gap-[2px] leading-none py-0.5">
                <span>{gapFromPrev.label.split(' ')[0]}</span>
                <span>{gapFromPrev.label.split(' ')[1]}</span>
              </div>
            ) : (
              gapFromPrev.label
            )}
          </div>
          <div className={`w-px h-6 ${gapFromPrev.minutes < 720 ? 'bg-rose-300' :
              gapFromPrev.minutes <= 840 ? 'bg-amber-300' : 'bg-emerald-300'
            }`} />
        </div>
      )}

      {assignment ? (
        <DraggableAssignment
          assignment={assignment}
          isReadOnly={isReadOnly}
          violations={violations}
          onConfirm={() => onConfirm?.(assignment.id)}
          onEditComment={onEditComment}
        />
      ) : (
        <div className={`h-full w-full flex items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-pointer ${isReadOnly
            ? 'border-slate-100 bg-slate-50/20'
            : 'border-slate-200 group-hover:border-slate-300'
          }`}>
          {!isReadOnly && (
            <span className="text-xl font-black text-slate-300 group-hover:text-slate-400">
              ...
            </span>
          )}
        </div>
      )}
    </td>
  );
}

