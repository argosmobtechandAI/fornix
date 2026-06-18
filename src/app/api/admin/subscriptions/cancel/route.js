import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse, isUuid, createSubscriptionAudit } from "@/lib/adminHelpers";
import { sendPushNotification } from "@/lib/pushNotifications";

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, mark_end_as_now = true } = body || {};
    if (!isUuid(id)) return jsonResponse({ success: false, error: "Invalid subscription id" }, 422);

    const updateObj = { is_active: false };
    if (mark_end_as_now) updateObj.end_date = new Date().toISOString();

    const { data, error } = await supabase.from("user_subscriptions").update(updateObj).eq("id", id).select().single();
    if (error) return jsonResponse({ success: false, error: error.message }, 500);

    await createSubscriptionAudit({ user_id: data.user_id, plan_id: data.plan_id, action: "cancelled", details: { by: "admin" } });

    // Notify the user their subscription was cancelled
    sendPushNotification(
      data.user_id,
      "Subscription Cancelled ❌",
      "Your subscription has been cancelled by the admin. Contact support for more info.",
      "course"
    ).catch(e => console.error("Cancel Sub Push Failed:", e));

    return jsonResponse({ success: true, subscription: data }, 200);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
