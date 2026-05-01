# Reports Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single `/reports` page where system_admin, roster_planner, and manager can generate and download 7 report types as PDF or Excel, with role-based data scoping.

**Architecture:** Single `/reports` page with report-type cards, contextual date/dept/roster-group filters, live preview table (first 100 rows), and PDF/Excel download buttons. Each of the 7 report types has a dedicated Next.js API route under `/api/reports/[type]/` that enforces role-based scoping: admin = all data, planner = delegated roster groups only (via `planner_delegations`), manager = own department + roster group (via their `employees` record). Export runs client-side using `jspdf-autotable` (PDF) and `xlsx` (Excel, already installed).

**Tech Stack:** Next.js 14 App Router, TypeScript, TailwindCSS, Supabase (admin client), jspdf@2.x + jspdf-autotable (new), xlsx (existing), date-fns (existing), lucide-react (existing)

---

## File Map

| Action | Path |
|--------|------|
| Install | `jspdf`, `jspdf-autotable` packages |
| Create | `rostering_soft_demo/src/lib/report-scope.ts` |
| Create | `rostering_soft_demo/src/lib/report-export.ts` |
| Create | `rostering_soft_demo/src/app/api/reports/roster-schedule/route.ts` |
| Create | `rostering_soft_demo/src/app/api/reports/work-hours/route.ts` |
| Create | `rostering_soft_demo/src/app/api/reports/duty-coverage/route.ts` |
| Create | `rostering_soft_demo/src/app/api/reports/leave-requests/route.ts` |
| Create | `rostering_soft_demo/src/app/api/reports/employee-master/route.ts` |
| Create | `rostering_soft_demo/src/app/api/reports/night-shifts/route.ts` |
| Create | `rostering_soft_demo/src/app/api/reports/compliance/route.ts` |
| Create | `rostering_soft_demo/src/app/(app)/reports/page.tsx` |
| Modify | `rostering_soft_demo/src/components/Sidebar.tsx` |

---

## Task 1: Install PDF dependencies

**Files:**
- Root: `rostering_soft_demo/package.json`

- [ ] **Step 1: Install packages**

```bash
cd rostering_soft_demo
npm install jspdf jspdf-autotable
```

Expected: `jspdf` and `jspdf-autotable` appear in `package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/package.json rostering_soft_demo/package-lock.json
git commit -m "feat: install jspdf + jspdf-autotable for report PDF export"
```

---

## Task 2: Create report scope helper

**Files:**
- Create: `rostering_soft_demo/src/lib/report-scope.ts`

- [ ] **Step 1: Create the file**

```typescript
// rostering_soft_demo/src/lib/report-scope.ts
import { createAdminClient } from '@/lib/supabase/server';
import { UserRole } from '@/types';

export interface ReportScope {
  rosterGroupIds: string[] | null; // null = no restriction (system_admin)
  departmentIds: string[] | null;  // null = no restriction (system_admin)
}

export async function getReportScope(role: UserRole, userId: string): Promise<ReportScope> {
  if (role === 'system_admin') {
    return { rosterGroupIds: null, departmentIds: null };
  }

  const supabase = createAdminClient();

  if (role === 'roster_planner') {
    const { data } = await supabase
      .from('planner_delegations')
      .select('roster_group_id')
      .eq('planner_id', userId);
    const rgIds = (data ?? []).map((d: { roster_group_id: string }) => d.roster_group_id);
    return { rosterGroupIds: rgIds, departmentIds: null };
  }

  if (role === 'manager') {
    const { data: emp } = await supabase
      .from('employees')
      .select('department_id, roster_group_id')
      .eq('profile_id', userId)
      .single();
    return {
      departmentIds: emp?.department_id ? [emp.department_id] : [],
      rosterGroupIds: emp?.roster_group_id ? [emp.roster_group_id] : [],
    };
  }

  return { rosterGroupIds: [], departmentIds: [] };
}
```

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/src/lib/report-scope.ts
git commit -m "feat: add report scope helper for role-based data filtering"
```

---

## Task 3: Create report export utility

**Files:**
- Create: `rostering_soft_demo/src/lib/report-export.ts`

- [ ] **Step 1: Create the file**

```typescript
// rostering_soft_demo/src/lib/report-export.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function exportToPDF(
  title: string,
  headers: string[],
  rows: (string | number | null)[][]
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 27);
  doc.text(`Total records: ${rows.length}`, 14, 33);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((c) => (c == null ? '' : String(c)))),
    startY: 38,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });
  doc.save(`${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportToExcel(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][]
): void {
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ...rows.map((r) => r.map((c) => (c == null ? '' : c))),
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  // Auto-width columns
  const colWidths = headers.map((h, i) => ({
    wch: Math.max(
      h.length,
      ...rows.map((r) => String(r[i] ?? '').length)
    ),
  }));
  ws['!cols'] = colWidths;
  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
```

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/src/lib/report-export.ts
git commit -m "feat: add PDF and Excel export utilities for reports"
```

---

## Task 4: Roster Schedule API

**Files:**
- Create: `rostering_soft_demo/src/app/api/reports/roster-schedule/route.ts`

Returns all duty assignments for a date range, scoped by role.

- [ ] **Step 1: Create the route**

```typescript
// rostering_soft_demo/src/app/api/reports/roster-schedule/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';

export async function GET(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !userId || role === 'employee') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const deptId = searchParams.get('department_id');
    const rgId = searchParams.get('roster_group_id');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 });
    }

    const scope = await getReportScope(role, userId);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('duty_assignments')
      .select(`
        id, assignment_date, status,
        employees(id, employee_id, first_name, last_name, department_id, designation_id, roster_group_id,
          departments(name), designations(name), roster_groups(name)),
        duties(id, duty_code, duty_name, start_time, end_time, duty_hours, department_id, roster_group_id, designation_id,
          departments(name), roster_groups(name))
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate)
      .order('assignment_date', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = data ?? [];

    // Apply role scope filtering
    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r: any) => scope.rosterGroupIds!.includes(r.duties?.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r: any) => scope.departmentIds!.includes(r.duties?.department_id));
    }
    // Apply optional query param filters (for admin)
    if (deptId) rows = rows.filter((r: any) => r.duties?.department_id === deptId);
    if (rgId) rows = rows.filter((r: any) => r.duties?.roster_group_id === rgId);

    const result = rows.map((r: any) => ({
      assignment_id: r.id,
      assignment_date: r.assignment_date,
      status: r.status,
      employee_code: r.employees?.employee_id ?? '',
      employee_name: `${r.employees?.first_name ?? ''} ${r.employees?.last_name ?? ''}`.trim(),
      department: r.employees?.departments?.name ?? r.duties?.departments?.name ?? '',
      designation: r.employees?.designations?.name ?? '',
      roster_group: r.employees?.roster_groups?.name ?? r.duties?.roster_groups?.name ?? '',
      duty_code: r.duties?.duty_code ?? '',
      duty_name: r.duties?.duty_name ?? '',
      start_time: r.duties?.start_time ?? '',
      end_time: r.duties?.end_time ?? '',
      duty_hours: r.duties?.duty_hours ?? 0,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/src/app/api/reports/roster-schedule/route.ts
git commit -m "feat: add roster schedule report API"
```

---

## Task 5: Work Hours API

**Files:**
- Create: `rostering_soft_demo/src/app/api/reports/work-hours/route.ts`

Returns total duty hours and shift count per employee for the date range.

- [ ] **Step 1: Create the route**

```typescript
// rostering_soft_demo/src/app/api/reports/work-hours/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';

export async function GET(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !userId || role === 'employee') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const deptId = searchParams.get('department_id');
    const rgId = searchParams.get('roster_group_id');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 });
    }

    const scope = await getReportScope(role, userId);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('duty_assignments')
      .select(`
        assignment_date, status,
        employees(id, employee_id, first_name, last_name, department_id,
          departments(name), designations(name), roster_groups(name)),
        duties(duty_hours, department_id, roster_group_id)
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = data ?? [];

    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r: any) => scope.rosterGroupIds!.includes(r.duties?.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r: any) => scope.departmentIds!.includes(r.duties?.department_id));
    }
    if (deptId) rows = rows.filter((r: any) => r.duties?.department_id === deptId);
    if (rgId) rows = rows.filter((r: any) => r.duties?.roster_group_id === rgId);

    // Aggregate by employee
    const empMap = new Map<string, {
      employee_code: string; employee_name: string; department: string;
      designation: string; roster_group: string;
      total_hours: number; total_shifts: number; confirmed_shifts: number;
    }>();

    for (const r of rows as any[]) {
      const empId = r.employees?.id ?? '';
      if (!empMap.has(empId)) {
        empMap.set(empId, {
          employee_code: r.employees?.employee_id ?? '',
          employee_name: `${r.employees?.first_name ?? ''} ${r.employees?.last_name ?? ''}`.trim(),
          department: r.employees?.departments?.name ?? '',
          designation: r.employees?.designations?.name ?? '',
          roster_group: r.employees?.roster_groups?.name ?? '',
          total_hours: 0,
          total_shifts: 0,
          confirmed_shifts: 0,
        });
      }
      const entry = empMap.get(empId)!;
      entry.total_hours += Number(r.duties?.duty_hours ?? 0);
      entry.total_shifts += 1;
      if (r.status === 'confirmed') entry.confirmed_shifts += 1;
    }

    const result = Array.from(empMap.values()).sort((a, b) =>
      a.employee_name.localeCompare(b.employee_name)
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/src/app/api/reports/work-hours/route.ts
git commit -m "feat: add work hours report API"
```

---

## Task 6: Duty Coverage API

**Files:**
- Create: `rostering_soft_demo/src/app/api/reports/duty-coverage/route.ts`

Returns per-duty assignment count per date (how many employees assigned to each duty each day).

- [ ] **Step 1: Create the route**

```typescript
// rostering_soft_demo/src/app/api/reports/duty-coverage/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';

export async function GET(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !userId || role === 'employee') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const deptId = searchParams.get('department_id');
    const rgId = searchParams.get('roster_group_id');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 });
    }

    const scope = await getReportScope(role, userId);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('duty_assignments')
      .select(`
        assignment_date, status,
        duties(id, duty_code, duty_name, start_time, end_time, department_id, roster_group_id,
          departments(name), roster_groups(name))
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = data ?? [];

    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r: any) => scope.rosterGroupIds!.includes(r.duties?.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r: any) => scope.departmentIds!.includes(r.duties?.department_id));
    }
    if (deptId) rows = rows.filter((r: any) => r.duties?.department_id === deptId);
    if (rgId) rows = rows.filter((r: any) => r.duties?.roster_group_id === rgId);

    // Group by duty_id + assignment_date
    const coverageMap = new Map<string, {
      duty_code: string; duty_name: string; department: string; roster_group: string;
      start_time: string; end_time: string; assignment_date: string;
      assigned_count: number; confirmed_count: number;
    }>();

    for (const r of rows as any[]) {
      const key = `${r.duties?.id}_${r.assignment_date}`;
      if (!coverageMap.has(key)) {
        coverageMap.set(key, {
          duty_code: r.duties?.duty_code ?? '',
          duty_name: r.duties?.duty_name ?? '',
          department: r.duties?.departments?.name ?? '',
          roster_group: r.duties?.roster_groups?.name ?? '',
          start_time: r.duties?.start_time ?? '',
          end_time: r.duties?.end_time ?? '',
          assignment_date: r.assignment_date,
          assigned_count: 0,
          confirmed_count: 0,
        });
      }
      const entry = coverageMap.get(key)!;
      entry.assigned_count += 1;
      if (r.status === 'confirmed') entry.confirmed_count += 1;
    }

    const result = Array.from(coverageMap.values()).sort((a, b) =>
      a.assignment_date.localeCompare(b.assignment_date) || a.duty_code.localeCompare(b.duty_code)
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/src/app/api/reports/duty-coverage/route.ts
git commit -m "feat: add duty coverage report API"
```

---

## Task 7: Leave Requests API

**Files:**
- Create: `rostering_soft_demo/src/app/api/reports/leave-requests/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// rostering_soft_demo/src/app/api/reports/leave-requests/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';

export async function GET(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !userId || role === 'employee') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const deptId = searchParams.get('department_id');
    const rgId = searchParams.get('roster_group_id');

    const scope = await getReportScope(role, userId);
    const supabase = createAdminClient();

    let query = supabase
      .from('employee_requests')
      .select(`
        id, request_type, request_date, request_date_to, reason,
        status, planner_comment, created_at,
        employees(id, employee_id, first_name, last_name, department_id, roster_group_id,
          departments(name), designations(name), roster_groups(name))
      `)
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('request_date', startDate);
    if (endDate) query = query.lte('request_date', endDate);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = data ?? [];

    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r: any) => scope.rosterGroupIds!.includes(r.employees?.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r: any) => scope.departmentIds!.includes(r.employees?.department_id));
    }
    if (deptId) rows = rows.filter((r: any) => r.employees?.department_id === deptId);
    if (rgId) rows = rows.filter((r: any) => r.employees?.roster_group_id === rgId);

    const result = rows.map((r: any) => ({
      employee_code: r.employees?.employee_id ?? '',
      employee_name: `${r.employees?.first_name ?? ''} ${r.employees?.last_name ?? ''}`.trim(),
      department: r.employees?.departments?.name ?? '',
      designation: r.employees?.designations?.name ?? '',
      roster_group: r.employees?.roster_groups?.name ?? '',
      request_type: r.request_type,
      request_date: r.request_date,
      request_date_to: r.request_date_to ?? '',
      reason: r.reason,
      status: r.status,
      planner_comment: r.planner_comment ?? '',
      submitted_at: r.created_at,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/src/app/api/reports/leave-requests/route.ts
git commit -m "feat: add leave requests report API"
```

---

## Task 8: Employee Master API

**Files:**
- Create: `rostering_soft_demo/src/app/api/reports/employee-master/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// rostering_soft_demo/src/app/api/reports/employee-master/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';

export async function GET(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !userId || role === 'employee') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const deptId = searchParams.get('department_id');
    const rgId = searchParams.get('roster_group_id');

    const scope = await getReportScope(role, userId);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('employees')
      .select(`
        id, employee_id, first_name, last_name, gender, joining_date,
        resigned_date, relieved_date, nearby_station, department_id, roster_group_id,
        departments(name), designations(name), roster_groups(name)
      `)
      .order('first_name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = data ?? [];

    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r: any) => scope.rosterGroupIds!.includes(r.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r: any) => scope.departmentIds!.includes(r.department_id));
    }
    if (deptId) rows = rows.filter((r: any) => r.department_id === deptId);
    if (rgId) rows = rows.filter((r: any) => r.roster_group_id === rgId);

    const result = rows.map((r: any) => ({
      employee_code: r.employee_id ?? '',
      full_name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
      gender: r.gender ?? '',
      department: (r.departments as any)?.name ?? '',
      designation: (r.designations as any)?.name ?? '',
      roster_group: (r.roster_groups as any)?.name ?? '',
      joining_date: r.joining_date ?? '',
      resigned_date: r.resigned_date ?? '',
      relieved_date: r.relieved_date ?? '',
      nearby_station: r.nearby_station ?? '',
      status: r.resigned_date || r.relieved_date ? 'Inactive' : 'Active',
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/src/app/api/reports/employee-master/route.ts
git commit -m "feat: add employee master list report API"
```

---

## Task 9: Night Shifts API

**Files:**
- Create: `rostering_soft_demo/src/app/api/reports/night-shifts/route.ts`

Night shift = duty `start_time` is between `'22:00'` and `'05:59'` (i.e., `>= '22:00'` OR `<= '05:59'`). Groups by employee and counts night shifts in the date range, cross-referenced against their rules (from `rules.json`, keyed by designation_id).

- [ ] **Step 1: Create the route**

```typescript
// rostering_soft_demo/src/app/api/reports/night-shifts/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';
import rulesData from '@/app/data/rules.json';

function isNightShift(startTime: string): boolean {
  if (!startTime) return false;
  const [h] = startTime.split(':').map(Number);
  return h >= 22 || h <= 5;
}

export async function GET(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !userId || role === 'employee') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const deptId = searchParams.get('department_id');
    const rgId = searchParams.get('roster_group_id');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 });
    }

    const scope = await getReportScope(role, userId);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('duty_assignments')
      .select(`
        employees(id, employee_id, first_name, last_name, designation_id, department_id, roster_group_id,
          departments(name), designations(name, id), roster_groups(name)),
        duties(start_time, department_id, roster_group_id)
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = data ?? [];

    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r: any) => scope.rosterGroupIds!.includes(r.duties?.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r: any) => scope.departmentIds!.includes(r.duties?.department_id));
    }
    if (deptId) rows = rows.filter((r: any) => r.duties?.department_id === deptId);
    if (rgId) rows = rows.filter((r: any) => r.duties?.roster_group_id === rgId);

    // Count night shifts per employee
    const empMap = new Map<string, {
      employee_code: string; employee_name: string; department: string;
      designation: string; designation_id: string; roster_group: string;
      night_shift_count: number; total_shifts: number;
    }>();

    for (const r of rows as any[]) {
      const empId = r.employees?.id ?? '';
      if (!empMap.has(empId)) {
        empMap.set(empId, {
          employee_code: r.employees?.employee_id ?? '',
          employee_name: `${r.employees?.first_name ?? ''} ${r.employees?.last_name ?? ''}`.trim(),
          department: r.employees?.departments?.name ?? '',
          designation: r.employees?.designations?.name ?? '',
          designation_id: r.employees?.designation_id ?? '',
          roster_group: r.employees?.roster_groups?.name ?? '',
          night_shift_count: 0,
          total_shifts: 0,
        });
      }
      const entry = empMap.get(empId)!;
      entry.total_shifts += 1;
      if (isNightShift(r.duties?.start_time ?? '')) {
        entry.night_shift_count += 1;
      }
    }

    const rules = rulesData as Record<string, { rules?: { night_shift_limit?: number } }>;

    const result = Array.from(empMap.values()).map((e) => {
      const ruleEntry = rules[e.designation_id];
      const limit = ruleEntry?.rules?.night_shift_limit ?? null;
      const compliance =
        limit === null ? 'no_rule' : e.night_shift_count > limit ? 'exceeded' : 'ok';
      return {
        employee_code: e.employee_code,
        employee_name: e.employee_name,
        department: e.department,
        designation: e.designation,
        roster_group: e.roster_group,
        total_shifts: e.total_shifts,
        night_shift_count: e.night_shift_count,
        night_shift_limit: limit ?? 'N/A',
        compliance_status: compliance,
      };
    }).sort((a, b) => a.employee_name.localeCompare(b.employee_name));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/src/app/api/reports/night-shifts/route.ts
git commit -m "feat: add night shift distribution report API"
```

---

## Task 10: Compliance API

**Files:**
- Create: `rostering_soft_demo/src/app/api/reports/compliance/route.ts`

Checks 3 rule types per employee: (1) max consecutive working days, (2) min rest hours between shifts, (3) max working hours per week. Uses `rules.json` keyed by designation_id.

- [ ] **Step 1: Create the route**

```typescript
// rostering_soft_demo/src/app/api/reports/compliance/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo } from '@/lib/api-auth';
import { getReportScope } from '@/lib/report-scope';
import { differenceInHours, getISOWeek, getYear, parseISO, addDays, format } from 'date-fns';
import rulesData from '@/app/data/rules.json';

interface Violation {
  employee_code: string;
  employee_name: string;
  department: string;
  designation: string;
  roster_group: string;
  violation_type: string;
  violation_detail: string;
  severity: 'warning' | 'critical';
}

export async function GET(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !userId || !['system_admin', 'roster_planner'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const deptId = searchParams.get('department_id');
    const rgId = searchParams.get('roster_group_id');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 });
    }

    const scope = await getReportScope(role, userId);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('duty_assignments')
      .select(`
        assignment_date,
        employees(id, employee_id, first_name, last_name, designation_id, department_id, roster_group_id,
          departments(name), designations(name), roster_groups(name)),
        duties(start_time, end_time, duty_hours, department_id, roster_group_id)
      `)
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate)
      .order('assignment_date', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = data ?? [];

    if (scope.rosterGroupIds !== null) {
      rows = rows.filter((r: any) => scope.rosterGroupIds!.includes(r.duties?.roster_group_id));
    }
    if (scope.departmentIds !== null) {
      rows = rows.filter((r: any) => scope.departmentIds!.includes(r.duties?.department_id));
    }
    if (deptId) rows = rows.filter((r: any) => r.duties?.department_id === deptId);
    if (rgId) rows = rows.filter((r: any) => r.duties?.roster_group_id === rgId);

    // Group assignments by employee
    const empAssignments = new Map<string, { meta: any; assignments: any[] }>();
    for (const r of rows as any[]) {
      const empId = r.employees?.id ?? '';
      if (!empAssignments.has(empId)) {
        empAssignments.set(empId, { meta: r.employees, assignments: [] });
      }
      empAssignments.get(empId)!.assignments.push(r);
    }

    const rules = rulesData as Record<string, { rules?: {
      max_consecutive_working_days?: number;
      min_rest_hours_between_shifts?: number;
      max_working_hours_per_week?: number;
    }}>;

    const violations: Violation[] = [];

    for (const [, { meta, assignments }] of empAssignments) {
      const designationId = meta?.designation_id ?? '';
      const empRule = rules[designationId]?.rules;
      if (!empRule) continue;

      const empInfo = {
        employee_code: meta?.employee_id ?? '',
        employee_name: `${meta?.first_name ?? ''} ${meta?.last_name ?? ''}`.trim(),
        department: meta?.departments?.name ?? '',
        designation: meta?.designations?.name ?? '',
        roster_group: meta?.roster_groups?.name ?? '',
      };

      // Sort by date
      const sorted = [...assignments].sort((a, b) =>
        a.assignment_date.localeCompare(b.assignment_date)
      );

      // Check max consecutive working days
      if (empRule.max_consecutive_working_days) {
        const limit = empRule.max_consecutive_working_days;
        let consecutive = 1;
        let maxConsecutive = 1;
        let streakStart = sorted[0]?.assignment_date;

        for (let i = 1; i < sorted.length; i++) {
          const prev = parseISO(sorted[i - 1].assignment_date);
          const curr = parseISO(sorted[i].assignment_date);
          const expectedNext = format(addDays(prev, 1), 'yyyy-MM-dd');
          if (sorted[i].assignment_date === expectedNext) {
            consecutive += 1;
            if (consecutive > maxConsecutive) maxConsecutive = consecutive;
          } else {
            if (consecutive > limit) {
              violations.push({
                ...empInfo,
                violation_type: 'Max Consecutive Days',
                violation_detail: `${consecutive} consecutive days starting ${streakStart} (limit: ${limit})`,
                severity: 'critical',
              });
            }
            consecutive = 1;
            streakStart = sorted[i].assignment_date;
          }
        }
        if (consecutive > limit) {
          violations.push({
            ...empInfo,
            violation_type: 'Max Consecutive Days',
            violation_detail: `${consecutive} consecutive days starting ${streakStart} (limit: ${limit})`,
            severity: 'critical',
          });
        }
      }

      // Check min rest hours between shifts
      if (empRule.min_rest_hours_between_shifts) {
        const minRest = empRule.min_rest_hours_between_shifts;
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const curr = sorted[i];
          const prevEnd = parseISO(`${prev.assignment_date}T${prev.duties?.end_time ?? '00:00'}`);
          let currStart = parseISO(`${curr.assignment_date}T${curr.duties?.start_time ?? '00:00'}`);
          const restHours = differenceInHours(currStart, prevEnd);
          if (restHours < minRest && restHours >= 0) {
            violations.push({
              ...empInfo,
              violation_type: 'Insufficient Rest',
              violation_detail: `Only ${restHours}h rest between ${prev.assignment_date} and ${curr.assignment_date} (min: ${minRest}h)`,
              severity: restHours < minRest / 2 ? 'critical' : 'warning',
            });
          }
        }
      }

      // Check max working hours per week
      if (empRule.max_working_hours_per_week) {
        const maxHours = empRule.max_working_hours_per_week;
        const weeklyHours = new Map<string, number>();
        for (const a of sorted) {
          const date = parseISO(a.assignment_date);
          const weekKey = `${getYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
          weeklyHours.set(weekKey, (weeklyHours.get(weekKey) ?? 0) + Number(a.duties?.duty_hours ?? 0));
        }
        for (const [week, hours] of weeklyHours) {
          if (hours > maxHours) {
            violations.push({
              ...empInfo,
              violation_type: 'Weekly Hours Exceeded',
              violation_detail: `${hours}h in week ${week} (limit: ${maxHours}h)`,
              severity: 'warning',
            });
          }
        }
      }
    }

    return NextResponse.json(violations);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/src/app/api/reports/compliance/route.ts
git commit -m "feat: add compliance rule violations report API"
```

---

## Task 11: Reports Page UI

**Files:**
- Create: `rostering_soft_demo/src/app/(app)/reports/page.tsx`

Single page with: report type cards, filter panel (date range + optional dept/rg for admin), generate button, preview table, PDF + Excel download.

- [ ] **Step 1: Create the page**

```typescript
// rostering_soft_demo/src/app/(app)/reports/page.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import { format } from 'date-fns';
import {
  Calendar, Clock, CheckSquare, FileText, Users,
  Moon, Shield, Download, Loader2, BarChart3, AlertTriangle
} from 'lucide-react';
import { Button, Input, Select } from '@/components/FormField';
import { Department, RosterGroup } from '@/types';

// ─── Report type definitions ───────────────────────────────────────────────

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
  adminOnly?: boolean;
}

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
    adminOnly: true,
  },
];

// ─── Column definitions per report ─────────────────────────────────────────

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

// ─── Main component ─────────────────────────────────────────────────────────

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

  // Load dept/rg for admin filter dropdowns
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

  const visibleReports = useMemo(() =>
    REPORT_TYPES.filter((r) => {
      if (r.adminOnly && role !== 'system_admin' && role !== 'roster_planner') return false;
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
    const rows = reportData.map((row) => cols.map((c) => (row[c.key] as string | number) ?? ''));
    const rt = REPORT_TYPES.find((r) => r.id === selectedReport)!;
    exportToPDF(rt.label, headers, rows);
  }, [reportData, selectedReport]);

  const handleDownloadExcel = useCallback(async () => {
    if (!reportData || !selectedReport) return;
    const { exportToExcel } = await import('@/lib/report-export');
    const cols = REPORT_COLUMNS[selectedReport];
    const headers = cols.map((c) => c.header);
    const rows = reportData.map((row) => cols.map((c) => (row[c.key] as string | number) ?? ''));
    const rt = REPORT_TYPES.find((r) => r.id === selectedReport)!;
    exportToExcel(rt.label.replace(/\s+/g, '_'), headers, rows);
  }, [reportData, selectedReport]);

  const columns = selectedReport ? REPORT_COLUMNS[selectedReport] : [];
  const rt = REPORT_TYPES.find((r) => r.id === selectedReport);

  const getBadgeClass = (val: string) => {
    if (val === 'confirmed' || val === 'approved' || val === 'ok' || val === 'Active')
      return 'bg-green-100 text-green-700';
    if (val === 'exceeded' || val === 'critical' || val === 'rejected' || val === 'Inactive')
      return 'bg-red-100 text-red-700';
    if (val === 'warning' || val === 'pending' || val === 'draft')
      return 'bg-yellow-100 text-yellow-700';
    return 'bg-slate-100 text-slate-600';
  };

  const BADGE_KEYS = new Set(['status', 'compliance_status', 'severity']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 font-medium">Generate and download operational reports</p>
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
              onClick={() => { setSelectedReport(r.id); setReportData(null); setError(null); }}
              className={`text-left p-5 rounded-3xl border-2 transition-all group ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border bg-white hover:border-primary/30 hover:shadow-md'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className={`font-bold text-sm mb-1 ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
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
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">To Date</label>
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
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</label>
                  <Select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Roster Group</label>
                  <Select value={rgId} onChange={(e) => setRgId(e.target.value)}>
                    <option value="">All Roster Groups</option>
                    {rosterGroups.map((rg) => (
                      <option key={rg.id} value={rg.id}>{rg.name}</option>
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
              <span className="text-sm font-bold text-slate-800">{reportData.length.toLocaleString()} records</span>
              {reportData.length > 100 && (
                <span className="text-xs text-slate-400 ml-2">(preview showing first 100)</span>
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
              <p className="text-slate-400 font-semibold">No data found for the selected filters</p>
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
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${getBadgeClass(val)}`}>
                                  {val}
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
```

- [ ] **Step 2: Commit**

```bash
git add rostering_soft_demo/src/app/(app)/reports/page.tsx
git commit -m "feat: add reports page with 7 report types, filters, and preview table"
```

---

## Task 12: Add Reports to Sidebar

**Files:**
- Modify: `rostering_soft_demo/src/components/Sidebar.tsx`

Add a "Reports" link visible to `system_admin`, `roster_planner`, and `manager` roles, in the Scheduling section.

- [ ] **Step 1: Add `BarChart3` to the lucide-react import**

In `Sidebar.tsx`, change the import block:

```typescript
// existing imports — add BarChart3
import {
  LayoutDashboard,
  Building2,
  Users2,
  UserPlus2,
  ClipboardList,
  Send,
  UserCircle2,
  FolderTree,
  Settings2,
  X,
  CalendarClock,
  Shield,
  FileText,
  BarChart3,
} from 'lucide-react';
```

- [ ] **Step 2: Add the Reports nav link**

In the `navSections` array, add to the `Scheduling` section's links array (after `Roster Dispatch`):

```typescript
{
  href: '/reports',
  label: 'Reports',
  icon: <BarChart3 className="w-5 h-5" />,
  roles: ['system_admin', 'roster_planner', 'manager'] as UserRole[],
},
```

- [ ] **Step 3: Commit**

```bash
git add rostering_soft_demo/src/components/Sidebar.tsx
git commit -m "feat: add Reports link to sidebar navigation"
```

---

## Self-Review Checklist

- [x] All 7 report types have API routes and column definitions
- [x] Role scoping: admin=all, planner=delegated RGs, manager=own dept/RG, employee=403
- [x] Compliance report restricted to admin + planner only (manager lacks context for rule enforcement)
- [x] `exportToPDF` and `exportToExcel` use dynamic import to avoid SSR issues with browser APIs
- [x] Preview table capped at 100 rows; full data still exported
- [x] Badge rendering for status/severity/compliance_status columns
- [x] No unused imports or placeholder code
- [x] `jspdf` + `jspdf-autotable` installed in Task 1 before used in Task 3
- [x] `report-scope.ts` created in Task 2 before used in Tasks 4-10
- [x] `report-export.ts` created in Task 3 before used in Task 11
