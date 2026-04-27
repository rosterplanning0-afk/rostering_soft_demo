import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCallerInfo, canManageDepartments } from '@/lib/api-auth';
import { logAuditAction } from '@/lib/audit-logger';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

const rosterGroupSchema = z.object({
  name: z.string().min(1),
  department_id: z.string().uuid(),
  designation_id: z.string().uuid(),
  end_date: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');

    let query = supabase
      .from('roster_groups')
      .select('*, departments(*), designations(*)')
      .order('name', { ascending: true });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { role, userId } = await getCallerInfo();
    if (!role || !canManageDepartments(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = rosterGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('roster_groups')
      .insert(parsed.data)
      .select('*, departments(*), designations(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Automatically create a template in rules.json
    try {
      const rulesPath = path.join(process.cwd(), 'src', 'app', 'data', 'rules.json');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rules: Record<string, any> = {};
      try {
        const fileData = await fs.readFile(rulesPath, 'utf-8');
        rules = JSON.parse(fileData);
      } catch {
        // File might not exist or be empty, use empty object
      }

      const template = {
        name: data.name,
        department: data.departments?.name,
        designation: data.designations?.name,
        rules: {
          max_consecutive_working_days: 6,
          min_rest_hours_between_shifts: 12,
          max_working_hours_per_week: 48,
          night_shift_limit: 2,
          weekend_off_frequency: "at least 2 per month"
        }
      };

      rules[data.id] = template;
      await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2));
    } catch (err) {
      console.error('Failed to update rules.json:', err);
      // We don't fail the request if rules.json update fails, but we log it
    }

    await logAuditAction({
      action: 'CREATE_ROSTER_GROUP',
      category: 'ROSTER_PLANNING',
      entity_type: 'roster_group',
      entity_id: data.id,
      actor_id: userId || undefined,
      details: { 
        name: data.name,
        department_id: data.department_id,
        designation_id: data.designation_id
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
