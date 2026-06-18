import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse } from "@/lib/adminHelpers";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 20);
    const user_id = url.searchParams.get("user_id");
    const course_id = url.searchParams.get("course_id");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from("user_subscriptions").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (user_id) query = query.eq("user_id", user_id);
    if (course_id) query = query.eq("course_id", course_id);

    const { data, count, error } = await query.range(from, to);
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
    return jsonResponse({ success: true, subscriptions: data, pagination: { total: count, page, totalPages: Math.ceil((count || 0) / limit) } }, 200);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
