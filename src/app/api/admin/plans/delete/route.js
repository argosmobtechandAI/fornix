import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse, isUuid } from "@/lib/adminHelpers";

export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!isUuid(id)) return jsonResponse({ success: false, error: "Invalid plan id" }, 422);

    // Check active subscriptions
    const { data: activeSubs, error: sErr } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("plan_id", id)
      .neq("is_active", false)
      .limit(1);

    if (sErr) return jsonResponse({ success: false, error: sErr.message }, 500);
    if (activeSubs && activeSubs.length > 0) {
      return jsonResponse({ success: false, error: "Cannot delete plan with active subscriptions" }, 409);
    }

    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
    return jsonResponse({ success: true, message: "Plan deleted" }, 200);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
