import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabaseAdmin";
import { sendPushNotification } from "@/lib/pushNotifications";

/**
 * Helper to insert payment resiliently (auto-drop unknown columns)
 */
async function insertPaymentWithSchemaFallback(initialPayload) {
  const payload = { ...(initialPayload || {}) };
  const maxAttempts = 8; // generous retry limit

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from("payments")
      .insert([payload])
      .select()
      .single();

    if (!error) return { data, error: null };

    // Check if error is "Could not find the 'X' column"
    const msg = String(error.message || "");
    const m = msg.match(/Could not find the '([^']+)' column of 'payments'/i);
    if (m && m[1]) {
      const missingCol = m[1];
      console.warn(`[create-student] Dropping missing column '${missingCol}' from payments insert.`);
      delete payload[missingCol];
      continue;
    }

    // Other error
    return { data: null, error };
  }

  return {
    data: null,
    error: new Error("Failed to insert payment: schema mismatch persist"),
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      full_name,
      email,
      phone,
      password,
      gender,
      role = "user", // defaults to student/user
      // Enrollment fields (optional/required based on context)
      plan_id,
      course_id,
      academic_year,
      amount,
      institute,
      payment_date,
      transaction_mode,
      transaction_id,
    } = body;

    // 1. Validate User Fields
    if (!full_name || !email || !password || !phone) {
      return Response.json(
        { success: false, error: "Missing required user fields (name, email, phone, password)" },
        { status: 400 }
      );
    }

    // 2. Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return Response.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    // 3. Create User
    const password_hash = await bcrypt.hash(password, 10);
    const { data: user, error: createError } = await supabase
      .from("users")
      .insert([
        {
          full_name,
          email,
          phone,
          password_hash,
          role,
          gender: gender || null,
          is_active: true,
          course_id: course_id || null, // assign to course if provided
          institute: institute || null,
          academic_year: academic_year || null,
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

    // 4. Handle Enrollment (if plan_id provided)
    let enrollmentResult = null;
    let paymentResult = null;

    if (plan_id && course_id) {
      // Fetch Plan
      const { data: plan, error: planErr } = await supabase
        .from("plans")
        .select("*")
        .eq("id", plan_id)
        .single();

      if (planErr || !plan) {
        // User created but plan failed
        return Response.json({
          success: true,
          message: "User created but plan not found. Enrollment failed.",
          user
        });
      }

      // Create Manual Payment Record
      const finalAmount = amount !== undefined ? Number(amount) : Number(plan.price || 0);
      const payDate = payment_date ? new Date(payment_date) : new Date();

      const paymentPayload = {
        user_id: user.id,
        plan_id: plan.id,
        amount: finalAmount,
        transaction_mode: transaction_mode || "upi",
        transaction_status: "success",
        transaction_id: transaction_id || `ADMIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        payment_date: payDate.toISOString(),
        tax_amount: 0,
      };

      const { data: payData, error: payErr } = await insertPaymentWithSchemaFallback(paymentPayload);
      if (payErr) {
        console.error("Manual payment insert failed:", payErr);
        // Continue to try subscription? Or stop? 
        // We'll continue but warn.
      }
      paymentResult = payData;

      // Create Subscription
      const startDate = payDate;
      const days = Number(plan.duration_in_days || 365);
      const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

      const subPayload = {
        user_id: user.id,
        plan_id: plan.id,
        course_id: plan.course_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        auto_renew: false,
      };

      const { data: sub, error: subErr } = await supabase
        .from("user_subscriptions")
        .insert([subPayload])
        .select()
        .single();

      if (subErr) {
        console.error("Manual subscription failed:", subErr);
        return Response.json({
          success: true,
          message: "User created. Payment recorded. Subscription FAILED.",
          user,
          error_detail: subErr.message
        });
      }
      enrollmentResult = sub;
    }

    return Response.json({
      success: true,
      message: enrollmentResult
        ? "User created and enrolled successfully"
        : "User created successfully (no enrollment)",
      user,
      enrollment: enrollmentResult,
      payment: paymentResult
    });

    // Fire push notification in background
    if (enrollmentResult && plan) {
      sendPushNotification(
        user.id,
        "Welcome to Fornix! 🎉",
        `Your account has been created and you are enrolled in ${plan.name}.`,
        "course"
      ).catch(e => console.error("Admin Create Push Failed:", e));
    } else {
      sendPushNotification(
        user.id,
        "Welcome to Fornix! 🎉",
        "Your account has been successfully created by the Admin.",
        "profile"
      ).catch(e => console.error("Admin Create Push Failed:", e));
    }

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
