import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabaseAdmin";
import { sendPushNotification } from "@/lib/pushNotifications";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      name,
      email,
      password,
      country, // optional free-text country name
      country_id, // optional FK to countries.id
      college_name,
      gender,
      mobile,
      mobile_no,
      course_id,
      academic_year,
      preferred_language,
    } = body || {};

    const phone = mobile || mobile_no || null;

    if (!name || !email || !phone || !gender || !course_id) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Prevent duplicate registration by email
    const { data: existingUser, error: existingErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingErr) {
      return Response.json(
        { success: false, error: existingErr.message },
        { status: 500 }
      );
    }

    if (existingUser) {
      return Response.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    // Auto-generate a secure password if not provided (OTP-based auth)
    const rawPassword = password || Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    const password_hash = await bcrypt.hash(rawPassword, 10);

    const { data: user, error: createError } = await supabase
      .from("users")
      .insert([
        {
          full_name: name,
          email,
          phone,
          institute: college_name || null,
          gender,
          password_hash,
          role: "user",
          country_name: country || null,
          country_id: country_id || null,
          course_id, // preferred/default course for free user
          academic_year: academic_year || null,
          preferred_language: preferred_language || "en",
        },
      ])
      .select()
      .single();

    if (createError) {
      return Response.json(
        { success: false, error: createError.message },
        { status: 500 }
      );
    }

    // Load basic course info for the selected course_id
    let baseCourse = null;
    try {
      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .select("id, name, description")
        .eq("id", course_id)
        .maybeSingle();

      if (!courseErr && course) {
        baseCourse = course;
      }
    } catch (e) {
      baseCourse = null;
    }

    // After creating the user, load their active subscription info
    // so the response matches the login API shape.
    let enrolled_course = null;
    let is_amc = false;
    let has_active_subscription = false;
    try {
      const nowIso = new Date().toISOString();
      const { data: subs, error: sErr } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          user_id,
          course_id,
          plan_id,
          start_date,
          end_date,
          is_active,
          auto_renew,
          courses (id, name, description),
          plans (id, name, price, duration_in_days, access_features, features_list)
        `)
        .eq("user_id", user.id)
        .neq("is_active", false)
        .gte("end_date", nowIso)
        .order("end_date", { ascending: false });

      if (sErr) throw sErr;

      const first = (subs || [])[0] || null;
      enrolled_course = first
        ? {
          subscription: {
            id: first.id,
            plan_id: first.plan_id,
            course_id: first.course_id,
            start_date: first.start_date,
            end_date: first.end_date,
            is_active: first.is_active,
            auto_renew: first.auto_renew,
          },
          course: first.courses || null,
          plan: first.plans || null,
        }
        : null;

      is_amc =
        String(enrolled_course?.course?.name || "").trim().toLowerCase() === "amc";
      has_active_subscription = !!enrolled_course;
    } catch (e) {
      enrolled_course = null;
      is_amc = false;
      has_active_subscription = false;
    }

    // If there is no active subscription, still attach course info (and AMC flag)
    if (!has_active_subscription && baseCourse) {
      enrolled_course = {
        subscription: null,
        course: baseCourse,
        plan: null,
      };
      is_amc =
        String(baseCourse.name || "").trim().toLowerCase() === "amc";
    }

    // Send welcome push notification
    sendPushNotification(
      user.id,
      "Welcome to Fornix! 🎉",
      "Your free account has been created. Start exploring courses now!",
      "profile"
    ).catch(e => console.error("Register Free Push Failed:", e));

    return Response.json(
      {
        success: true,
        message: "Registered as free user",
        user: {
          id: user.id,
          name: user.full_name,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          role: user.role,
          has_active_subscription,
          profile_picture: user.profile_picture || null,
          student_type: has_active_subscription ? "paid" : "free",
          course_id: user.course_id,
          academic_year: user.academic_year || null,
        },
        enrolled_course,
        is_amc,
        has_active_subscription,
      },
      { status: 201 }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
