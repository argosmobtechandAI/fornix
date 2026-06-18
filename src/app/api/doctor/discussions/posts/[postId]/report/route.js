import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function POST(req, { params }) {
  try {
    const doctor = await ensureDoctor(req);
    const {postId} = await params;
    if (!postId || postId === 'undefined' || postId === 'null') {
      return new Response(JSON.stringify({ success: false, error: 'post id required' }), { status: 400 });
    }
    const { reason = "" } = await req.json();

    const { data, error } = await supabase.from("discussion_post_reports").insert([{ post_id: postId, reporter_id: doctor.sub || doctor.id, reason }]).select("id").single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, report_id: data.id }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
