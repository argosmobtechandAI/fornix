import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req, { params }) {
  try {
    const { session_id } = await params;
    if (!session_id) return new Response(JSON.stringify({ success: false, error: "session_id required" }), { status: 400 });
    const { data: session, error: sErr } = await supabase
      .from("chat_sessions")
      .select("id, user_id, course_name, started_at, ended_at, created_at")
      .eq("id", session_id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) return new Response(JSON.stringify({ success: false, error: "session not found" }), { status: 404 });
    const { data: messages, error: mErr } = await supabase
      .from("chat_messages")
      .select("id, message, is_user, created_at")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });
    if (mErr) throw mErr;
    return new Response(JSON.stringify({ success: true, session, messages }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
