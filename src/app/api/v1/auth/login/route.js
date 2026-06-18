import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return Response.json(
        { success: false, error: "Missing credentials" },
        { status: 400 }
      );
    }

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
      }
    }
    
    // Create an OR string for all variations
    const phoneOrStr = phoneVariations.map(v => `phone.eq.${v}`).join(',');

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .or(`email.eq.${identifier},${phoneOrStr}`);

    if (error || !users || users.length === 0) {
      return Response.json(
        { success: false, error: "Invalid email/phone or password" },
        { status: 401 }
      );
    }

    // Since multiple accounts might share the same phone number, check all matches
    let user = null;
    let validPassword = false;

    for (const potentialUser of users) {
      if (potentialUser.is_active === false) {
        continue; // Skip deactivated accounts
      }
      const isValid = await bcrypt.compare(password, potentialUser.password_hash);
      if (isValid) {
        user = potentialUser;
        validPassword = true;
        break;
      }
    }

    if (!user || !validPassword) {
      return Response.json(
        { success: false, error: "Invalid email/phone or password (or account deactivated)" },
        { status: 401 }
      );
    }

    // ---- Fetch active enrolled course details (for student/mobile app) ----
    // A "purchase/enrollment" is represented by an active subscription in user_subscriptions
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

      const first = (subs || [])[0] || null; // latest active subscription
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
      // Don't fail login if enrollment lookup fails; mobile can re-fetch later.
      enrolled_course = null;
      is_amc = false;
      has_active_subscription = false;
    }

    // ---- Update session ----
    const sessionId = globalThis.crypto.randomUUID();
    const { error: updateError } = await supabase
      .from("users")
      .update({ current_session_id: sessionId })
      .eq("id", user.id);

    if (updateError) {
      console.error("Session update error:", updateError);
    }

    // ---- Generate JWT ----
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        phone: user.phone,
        name: user.full_name,
        role: user.role,
        university_id: user.university_id || null,
        session_id: sessionId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ---- Success ----
    return Response.json(
      {
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          user_id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          gender: user.gender || null,
          role: user.role,
          academic_year: user.academic_year || null,
          university_id: user.university_id || null,
          course_id: user?.course_id,
          course: "amc",
          profile_picture: user.profile_picture || null,
          preferred_language: user.preferred_language || "en",
        },
        enrolled_course, // null if not enrolled
        is_amc,
        has_active_subscription,
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
