import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req, { params }) {
  try {
    const { user_id } = params;
    if (!user_id) return new Response(JSON.stringify({ success: false, error: "user_id required" }), { status: 400 });

    const { data, error } = await supabase
      .from("smart_tracking")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
