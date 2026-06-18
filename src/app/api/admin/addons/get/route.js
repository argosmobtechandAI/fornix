import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse } from "@/lib/adminHelpers";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const plan_id = url.searchParams.get("plan_id");

    let query = supabase.from("plan_addons").select("*").order("created_at", { ascending: false });
    if (plan_id) query = query.eq("plan_id", plan_id);

    const { data, error } = await query;
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
    return jsonResponse({ success: true, addons: data }, 200);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
