import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse, isUuid } from "@/lib/adminHelpers";

export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!isUuid(id)) return jsonResponse({ success: false, error: "Invalid device id" }, 422);

    const { error } = await supabase.from("user_devices").delete().eq("id", id);
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
    return jsonResponse({ success: true, message: "Device removed" }, 200);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
