import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse, isUuid, createSubscriptionAudit } from "@/lib/adminHelpers";
import { sendPushNotification } from "@/lib/pushNotifications";

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, plan_id, start_date = null, custom_end_date = null, auto_renew = false } = body || {};

    if (!isUuid(user_id) || !isUuid(plan_id)) return jsonResponse({ success: false, error: "Invalid user_id or plan_id" }, 422);

    // load plan
    const { data: plan } = await supabase.from("plans").select("*").eq("id", plan_id).maybeSingle();
    if (!plan) return jsonResponse({ success: false, error: "Plan not found" }, 404);

    // prevent overlapping: check if user has active subscription for same course
    const now = new Date();
    const { data: existing } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user_id)
      .eq("course_id", plan.course_id)
      .neq("is_active", false)
      .gte("end_date", now.toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      // strict policy: do not auto-assign overlapping subscription
      return jsonResponse({ success: false, error: "User already has an active subscription for this course" }, 409);
    }

    const sDate = start_date ? new Date(start_date) : new Date();
    const endDate = custom_end_date ? new Date(custom_end_date) : new Date(sDate.getTime() + plan.duration_in_days * 24 * 60 * 60 * 1000);

    // insert subscription
    const insertObj = {
      user_id,
      plan_id,
      course_id: plan.course_id,
      start_date: sDate.toISOString(),
      end_date: endDate.toISOString(),
      is_active: true,
      auto_renew: !!auto_renew
    };

    const { data, error } = await supabase.from("user_subscriptions").insert([insertObj]).select().single();
    if (error) return jsonResponse({ success: false, error: error.message }, 500);

    // audit
    await createSubscriptionAudit({ user_id, plan_id, action: "assigned", details: { by: "admin", subscription_id: data.id } });

    // Send push notification to student
    sendPushNotification(
      user_id,
      "New Plan Assigned! 📚",
      `Admin has assigned you the ${plan.name} plan. You now have access to new content!`,
      "course"
    ).catch(e => console.error("Admin Assign Push Failed:", e));

    return jsonResponse({ success: true, subscription: data }, 201);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
