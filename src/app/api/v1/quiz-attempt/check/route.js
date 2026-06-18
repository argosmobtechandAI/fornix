import { supabase } from "@/lib/supabaseAdmin";

// Check if a user is allowed to start a new quiz attempt.
// - Paid users (any active subscription) can attempt unlimited quizzes.
// - Free users (no active subscription) are limited to 2 total attempts.
//   When they try to start the 3rd, this API will return can_attempt = false
//   so the app can show an alert.
export async function POST(req) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    // 1) Check if user has an active paid subscription
    let hasActiveSubscription = false;
    try {
      const nowIso = new Date().toISOString();
      const { data: subs, error: subErr } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", user_id)
        .neq("is_active", false)
        .gte("end_date", nowIso)
        .order("end_date", { ascending: false })
        .limit(1);

      if (!subErr && (subs || []).length > 0) {
        hasActiveSubscription = true;
      }
    } catch (e) {
      // If we fail to check subscriptions, assume paid to avoid blocking.
      hasActiveSubscription = true;
    }

    if (hasActiveSubscription) {
      return Response.json(
        {
          success: true,
          student_type: "paid",
          has_active_subscription: true,
          can_attempt: true,
          free_attempt_limit: 50,
          total_attempts: null,
          remaining_attempts: null,
          message: "Paid user. Unlimited quiz attempts allowed.",
        },
        { status: 200 }
      );
    }

    // 2) Free user: enforce 50-attempt limit across all quizzes
    const { count: attemptCount, error: countErr } = await supabase
      .from("quiz_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    const totalAttempts = typeof attemptCount === "number" ? attemptCount : 0;
    const limit = 50;
    const remaining = Math.max(0, limit - totalAttempts);

    if (!countErr && totalAttempts >= limit) {
      return Response.json(
        {
          success: true,
          student_type: "free",
          has_active_subscription: false,
          can_attempt: false,
          free_attempt_limit: limit,
          total_attempts: totalAttempts,
          remaining_attempts: 0,
          message:
            "Free users can attempt only 50 quizzes. Please purchase a plan to continue.",
        },
        { status: 200 }
      );
    }

    return Response.json(
      {
        success: true,
        student_type: "free",
        has_active_subscription: false,
        can_attempt: true,
        free_attempt_limit: limit,
        total_attempts: totalAttempts,
        remaining_attempts: remaining,
        message:
          remaining === 1
            ? "You have 1 free quiz attempt remaining."
            : `You have ${remaining} free quiz attempts remaining.`,
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
