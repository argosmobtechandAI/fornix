import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendOtpEmail } from '@/lib/mailer';

export async function POST(request) {
  try {
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Identifier (email or phone) is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // RATE LIMITING LOGIC
    // 1. Check for OTPs requested in the last 30 seconds
    const cooldownPeriod = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: recentOtps, error: cooldownError } = await supabase
      .from('mobile_otps')
      .select('id, created_at')
      .eq('identifier', identifier)
      .gte('created_at', cooldownPeriod);

    if (cooldownError) {
      console.error('Rate Limit Check Error:', cooldownError);
    } else if (recentOtps && recentOtps.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Please wait 30 seconds before requesting a new OTP' },
        { status: 429 }
      );
    }

    // 2. Check for daily limit (e.g., max 5 OTPs per 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyOtpCount, error: dailyLimitError } = await supabase
      .from('mobile_otps')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .gte('created_at', oneDayAgo);

    if (dailyLimitError) {
      console.error('Daily Limit Check Error:', dailyLimitError);
    } else if (dailyOtpCount >= 50) {
      return NextResponse.json(
        { success: false, error: 'Daily OTP limit reached. Please try again tomorrow' },
        { status: 429 }
      );
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expire in 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Store in Supabase
    const { error: dbError } = await supabase
      .from('mobile_otps')
      .insert([
        {
          identifier: identifier,
          otp: otp,
          expires_at: expiresAt.toISOString(),
          verified: false,
        },
      ]);

    if (dbError) {
      console.error('Database Error when inserting OTP:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // Determine if email or phone
    const isEmail = identifier.includes('@');

    if (isEmail) {
      // Send via Nodemailer
      await sendOtpEmail({ to: identifier, otp });
    } else {
      // Call the external SMS API
      // The SMS API expects a 10 digit number without the +91 country code.
      let cleanPhone = identifier.replace(/\D/g, '');
      if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
        cleanPhone = cleanPhone.substring(2);
      }

      const smsUrl = `http://dnd.saakshisoftware.in/api/mt/SendSMS?user=Fornix&password=Fornix@0&senderid=FORNIX&channel=Trans&DCS=0&flashsms=0&number=${encodeURIComponent(
        cleanPhone
      )}&text=${encodeURIComponent(
        `Welcome to Fornix! Your verification OTP is: ${otp} Valid for 10 minutes. Never share your OTP with anyone`
      )}&route=15&DLTTemplateId=1707177737958675421&PEID=1701177737269319910`;

      const smsResponse = await fetch(smsUrl);

      if (!smsResponse.ok) {
        console.error('SMS API returned error status:', smsResponse.status);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
