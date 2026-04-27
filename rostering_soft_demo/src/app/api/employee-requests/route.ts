import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCallerRole } from '@/lib/api-auth';
import { z } from 'zod';

const requestSchema = z.object({
  employee_id: z.string().uuid(),
  request_type: z.enum(['leave', 'shift_change']),
  request_date: z.string().min(1),
  request_date_to: z.string().optional().nullable(),
  reason: z.string().min(1),
  target_duty_id: z.string().uuid().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');

    let query = supabase
      .from('employee_requests')
      .select('*, employees(*), target_duty:duties(*)')
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
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
    const role = await getCallerRole();
    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('employee_requests')
      .insert({ ...parsed.data, status: 'pending' })
      .select('*, employees(*), target_duty:duties(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
