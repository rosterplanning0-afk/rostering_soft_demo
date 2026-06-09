import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const changePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Get the current session user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Update the password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Update the profile to clear the force_password_change flag
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ force_password_change: false })
      .eq('id', user.id);

    if (profileError) {
      console.error('Failed to clear force_password_change flag:', profileError);
      // We don't fail the request since password was changed successfully,
      // but log it for debugging
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
