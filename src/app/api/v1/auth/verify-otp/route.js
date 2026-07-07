import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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

    // Look up user by phone or email to return user + token for passwordless login
    const isEmail = identifier.includes('@');
    let userQuery = supabase
      .from('users')
      .select(`
        id, full_name, email, phone, role, gender, profile_picture,
        course_id, academic_year, preferred_language,
        user_subscriptions (
          id, course_id, plan_id, start_date, end_date, is_active, auto_renew,
          courses (id, name, description),
          plans (id, name, price, duration_in_days, access_features, features_list)
        )
      `);

    if (isEmail) {
      userQuery = userQuery.eq('email', identifier);
    } else {
      // Build robust phone matching
      let phoneVariations = [identifier];
      if (identifier.startsWith('+')) {
        phoneVariations.push(identifier.replace('+', ''));
        if (identifier.startsWith('+91')) {
          phoneVariations.push(identifier.slice(3));
        }
      } else {
        if (identifier.length === 10) {
          phoneVariations.push('+91' + identifier);
          phoneVariations.push('91' + identifier);
        } else if (identifier.startsWith('91') && identifier.length === 12) {
          phoneVariations.push('+' + identifier);
          phoneVariations.push(identifier.slice(2));
        }
      }
      const phoneOrStr = phoneVariations.map(v => `phone.eq.${v}`).join(',');
      userQuery = userQuery.or(phoneOrStr);
    }

    // We use limit(1) instead of maybeSingle() in case multiple variations somehow match
    const { data: users, error: userError } = await userQuery.limit(1);
    
    if (userError) {
      console.error('User lookup error:', userError);
    }

    const user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      // OTP verified but no user yet (signup flow) - just confirm verification
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully',
      });
    }

    // Find active subscription
    const nowIso = new Date().toISOString();
    const activeSub = (user.user_subscriptions || []).find(
      s => s.is_active && s.end_date >= nowIso
    );
    const has_active_subscription = !!activeSub;
    const enrolled_course = activeSub ? {
      subscription: { id: activeSub.id, plan_id: activeSub.plan_id, course_id: activeSub.course_id, start_date: activeSub.start_date, end_date: activeSub.end_date, is_active: activeSub.is_active },
      course: activeSub.courses || null,
      plan: activeSub.plans || null,
    } : null;

    // ---- Update session ----
    const sessionId = globalThis.crypto.randomUUID();
    const { error: sessionUpdateError } = await supabase
      .from("users")
      .update({ current_session_id: sessionId })
      .eq("id", user.id);

    if (sessionUpdateError) {
      console.error("Session update error:", sessionUpdateError);
    }

    const userPayload = {
      id: user.id,
      user_id: user.id,
      name: user.full_name,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      gender: user.gender,
      profile_picture: user.profile_picture || null,
      has_active_subscription,
      student_type: has_active_subscription ? 'paid' : 'free',
      course_id: user.course_id,
      academic_year: user.academic_year || null,
      preferred_language: user.preferred_language || 'en',
      enrolled_course,
    };

    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fornix-secret';
    const token = jwt.sign(
      { 
        sub: user.id, 
        id: user.id, 
        role: user.role, 
        email: user.email,
        phone: user.phone,
        name: user.full_name,
        session_id: sessionId 
      }, 
      secret, 
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: userPayload,
      enrolled_course,
      has_active_subscription,
      is_amc: String(enrolled_course?.course?.name || '').trim().toLowerCase() === 'amc',
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
