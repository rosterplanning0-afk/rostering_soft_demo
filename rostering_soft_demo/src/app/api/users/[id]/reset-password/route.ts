import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallerRole, canManageUsers } from '@/lib/api-auth';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const callerRole = await getCallerRole();
    if (!callerRole || !canManageUsers(callerRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Reset password to default
    const defaultPassword = 'DBrrts@123';
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      password: defaultPassword
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Force user to change password on next login
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ force_password_change: true })
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: `Failed to set force password change flag: ${profileError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password reset to default' }, { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
