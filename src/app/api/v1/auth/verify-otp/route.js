import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { identifier, otp } = await request.json();

    if (!identifier || !otp) {
      return NextResponse.json(
        { success: false, error: 'Identifier (email/phone) and OTP are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find a valid OTP
    const { data: otps, error: fetchError } = await supabase
      .from('mobile_otps')
      .select('*')
      .eq('identifier', identifier)
      .eq('otp', otp)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Database error fetching OTP:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify OTP' },
        { status: 500 }
      );
    }

    if (!otps || otps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    const matchedOtp = otps[0];

    // Mark as verified
    const { error: updateError } = await supabase
      .from('mobile_otps')
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', matchedOtp.id);

    if (updateError) {
      console.error('Database error updating OTP:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify OTP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
