import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse } from "@/lib/adminHelpers";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 50);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase.from("subscription_audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
    return jsonResponse({ success: true, logs: data, pagination: { total: count, page, totalPages: Math.ceil((count || 0) / limit) }}, 200);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
