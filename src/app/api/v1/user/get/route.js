import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/verifyToken";

export async function POST(req) {
  try {
    const decoded = await verifyToken(req);
    const body = await req.json();
    const id = body.id || body.user_id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    if (decoded.role !== 'admin' && decoded.sub !== id && decoded.id !== id) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You can only access your own data" },
        { status: 403 }
      );
    }
    
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        email,
        phone,
        gender,
        role,
        academic_year,
        university_id,
        profile_picture,
        is_active,
        preferred_language,
        dob,
        institute,
        qualification,
        country_name,
        country_id,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    // Load active course subscriptions for this user
    const nowIso = new Date().toISOString();
    const { data: subsData, error: subsErr } = await supabase
      .from("user_subscriptions")
      .select(
        `id, user_id, course_id, plan_id, start_date, end_date, is_active, auto_renew`
      )
      .eq("user_id", id)
      .neq("is_active", false)
      .gte("end_date", nowIso);

    if (subsErr) {
      return NextResponse.json(
        { success: false, error: subsErr.message },
        { status: 500 }
      );
    }

    const subscriptions = subsData || [];

    // If there are subscriptions, fetch basic course + plan info for them
    let courses = [];
    let plans = [];
    if (subscriptions.length > 0) {
      const courseIds = Array.from(
        new Set(subscriptions.map((s) => s.course_id).filter(Boolean))
      );
      const planIds = Array.from(
        new Set(subscriptions.map((s) => s.plan_id).filter(Boolean))
      );

      if (courseIds.length > 0) {
        const { data: courseRows, error: cErr } = await supabase
          .from("courses")
          .select("id, name, description, icon_url")
          .in("id", courseIds);
        if (!cErr) courses = courseRows || [];
      }

      if (planIds.length > 0) {
        const { data: planRows, error: pErr } = await supabase
          .from("plans")
          .select(
            "id, course_id, name, description, duration_in_days, price, original_price, discount_price"
          )
          .in("id", planIds);
        if (!pErr) plans = planRows || [];
      }
    }

    const coursesById = new Map(courses.map((c) => [String(c.id), c]));
    const plansById = new Map(plans.map((p) => [String(p.id), p]));

    const enrichedSubs = subscriptions.map((s) => ({
      ...s,
      course: s.course_id ? coursesById.get(String(s.course_id)) || null : null,
      plan: s.plan_id ? plansById.get(String(s.plan_id)) || null : null,
    }));

    return NextResponse.json({
      success: true,
      user: data,
      subscriptions: enrichedSubs,
    });

  } catch (err) {
    const status = err.message && err.message.includes('Unauthorized') ? 401 : 500;
    if (status === 500) {
      console.error("Get User Details Error:", err);
    }
    return NextResponse.json(
      { success: false, error: err.message },
      { status }
    );
  }
}
