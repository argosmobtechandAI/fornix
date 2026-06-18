import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabaseAdmin";
import {
  shouldVerifyRazorpayPayment,
  verifyRazorpayPaymentCaptured,
} from "@/lib/razorpay";
import { sendPushNotification } from "@/lib/pushNotifications";

async function insertPaymentWithSchemaFallback(initialPayload) {
  const payload = { ...(initialPayload || {}) };
  const maxAttempts = 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from("payments")
      .insert([payload])
      .select()
      .single();

    if (!error) return { data, error: null, usedPayload: payload };

    const msg = String(error.message || "");
    const m = msg.match(/Could not find the '([^']+)' column of 'payments'/i);
    if (m && m[1]) {
      const missingCol = m[1];
      delete payload[missingCol];
      continue;
    }

    return { data: null, error, usedPayload: payload };
  }

  return {
    data: null,
    error: new Error("Failed to insert payment: payments schema mismatch"),
    usedPayload: payload,
  };
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      name,
      email,
      password,
      country,       // free-text country name from client
      country_id,    // optional FK to countries.id
      college_name,
      gender,
      mobile,
      mobile_no,
      payment_id,
      course_id,
      plan_id,
      amount,
      transaction_mode,
      transaction_status,
      payment_date,
      academic_year,
      preferred_language,
    } = body || {};

    const phone = mobile || mobile_no || body.phone || null;

    if (!name || !email || !password || !phone || !gender || !course_id || !plan_id || !payment_id) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    const password_hash = await bcrypt.hash(password, 10);

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
          course_id: course_id || null,
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

    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .maybeSingle();

    if (planErr) throw planErr;
    if (!plan) {
      return Response.json({ success: false, error: "Plan not found" }, { status: 404 });
    }
    if (plan.is_active === false) {
      return Response.json({ success: false, error: "Plan is not active" }, { status: 409 });
    }
    if (String(plan.course_id) !== String(course_id)) {
      return Response.json(
        { success: false, error: "plan_id does not belong to course_id" },
        { status: 422 }
      );
    }

    // Load the related course so we can always return course info and AMC flag
    let baseCourse = null;
    try {
      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .select("id, name, description")
        .eq("id", plan.course_id)
        .maybeSingle();

      if (!courseErr && course) {
        baseCourse = course;
      }
    } catch (e) {
      baseCourse = null;
    }

    const finalAmount = amount != null ? Number(amount) : Number(plan.price || 0);
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      return Response.json(
        { success: false, error: "Invalid or missing amount" },
        { status: 400 }
      );
    }

    const txnMode = (transaction_mode || "upi").toLowerCase();
    let txnStatus = (transaction_status || "success").toLowerCase();

    if (shouldVerifyRazorpayPayment({ transactionMode: txnMode, paymentId: payment_id })) {
      try {
        const rzPayment = await verifyRazorpayPaymentCaptured({
          paymentId: String(payment_id),
          expectedAmount: finalAmount,
        });

        txnStatus = String(rzPayment.status || "captured").toLowerCase();
      } catch (rzErr) {
        return Response.json(
          { success: false, error: `Razorpay verification failed: ${rzErr.message}` },
          { status: 402 }
        );
      }
    }

    const paymentInsert = {
      user_id: user.id,
      plan_id: plan.id,
      amount: finalAmount,
      tax_amount: 0,
      transaction_mode: txnMode,
      transaction_status: txnStatus,
      transaction_id: String(payment_id),
      order_id: null,
      payment_date: payment_date
        ? new Date(payment_date).toISOString()
        : new Date().toISOString(),
    };

    const { data: payment, error: payErr } = await insertPaymentWithSchemaFallback(paymentInsert);
    if (payErr) {
      return Response.json(
        { success: false, error: payErr.message },
        { status: 500 }
      );
    }

    const isSuccessful = ["success", "captured", "authorized"].includes(txnStatus);
    if (!isSuccessful) {
      // Payment not successful yet; no new active subscription is created.
      const is_amc_course =
        String(baseCourse?.name || "").trim().toLowerCase() === "amc";

      return Response.json(
        {
          success: true,
          message:
            "User registered and payment stored. Enrollment will be active only after success.",
          user: {
            id: user.id,
            name: user.full_name,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            role: user.role,
            profile_picture: user.profile_picture || null,
            has_active_subscription: false,
            student_type: "free",
            course_id: user.course_id,
            academic_year: user.academic_year || null,
            preferred_language: user.preferred_language || "en",
          },
          payment,
          enrolled_course: baseCourse
            ? {
              subscription: null,
              course: baseCourse,
              plan,
            }
            : null,
          is_amc: is_amc_course,
          has_active_subscription: false,
        },
        { status: 200 }
      );
    }

    const now = new Date();
    const sDate = now;
    const endDate = new Date(sDate.getTime() + Number(plan.duration_in_days || 0) * 24 * 60 * 60 * 1000);
    if (!Number.isFinite(endDate.getTime())) {
      return Response.json(
        { success: false, error: "Invalid plan duration" },
        { status: 422 }
      );
    }

    const insertSub = {
      user_id: user.id,
      plan_id: plan.id,
      course_id: plan.course_id,
      start_date: sDate.toISOString(),
      end_date: endDate.toISOString(),
      is_active: true,
      auto_renew: !!plan.auto_renew,
    };

    const { data: sub, error: subErr } = await supabase
      .from("user_subscriptions")
      .insert([insertSub])
      .select()
      .single();

    if (subErr) {
      return Response.json(
        { success: false, error: subErr.message },
        { status: 500 }
      );
    }

    // After creating the subscription, load enriched enrollment data
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

    // Send welcome + enrollment push notification
    sendPushNotification(
      user.id,
      "Welcome to Fornix! 🎉",
      `Your account is ready and you are enrolled in ${plan.name}. Start learning now!`,
      "course"
    ).catch(e => console.error("Register With Plan Push Failed:", e));

    return Response.json(
      {
        success: true,
        message: "Registered and enrolled successfully",
        user: {
          id: user.id,
          name: user.full_name,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          role: user.role,
          profile_picture: user.profile_picture || null,
          has_active_subscription,
          student_type: has_active_subscription ? "paid" : "free",
          course_id: enrolled_course?.course?.id || user.course_id,
          academic_year: user.academic_year || null,
          preferred_language: user.preferred_language || "en",
        },
        payment,
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
