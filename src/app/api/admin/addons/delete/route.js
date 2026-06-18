import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse, isUuid } from "@/lib/adminHelpers";

export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!isUuid(id)) return jsonResponse({ success: false, error: "Invalid addon id" }, 422);

    // prevent deletion if user_addons exist
    const { data: used, error: uErr } = await supabase.from("user_addons").select("id").eq("addon_id", id).limit(1);
    if (uErr) return jsonResponse({ success: false, error: uErr.message }, 500);
    if (used && used.length > 0) return jsonResponse({ success: false, error: "Cannot delete addon with active users" }, 409);

    const { error } = await supabase.from("plan_addons").delete().eq("id", id);
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
    return jsonResponse({ success: true, message: "Addon deleted" }, 200);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
