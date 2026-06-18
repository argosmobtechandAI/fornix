import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    if (!user_id) return new Response(JSON.stringify({ success: false, error: "user_id required" }), { status: 400 });
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, course_name, started_at, ended_at, created_at")
      .eq("user_id", user_id)
      .order("started_at", { ascending: false });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, sessions: data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
