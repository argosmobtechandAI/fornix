import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse } from "@/lib/adminHelpers";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    if (!user_id) return jsonResponse({ success: false, error: "user_id required" }, 422);

    const { data, error } = await supabase.from("user_devices").select("*").eq("user_id", user_id).order("last_used", { ascending: false });
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
    return jsonResponse({ success: true, devices: data }, 200);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
