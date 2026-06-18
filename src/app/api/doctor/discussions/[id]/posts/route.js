import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function GET(req, { params }) {
  try {
    await ensureDoctor(req);
    const { id: discussionId } = await params;
    if (!discussionId || discussionId === 'undefined' || discussionId === 'null') {
      return new Response(JSON.stringify({ success: false, error: 'discussion id required' }), { status: 400 });
    }
    const { data, error } = await supabase
      .from("discussion_posts")
      .select(
        "id, discussion_id, user_id, parent_id, content, is_answer, edited, deleted, created_at, users!inner(id, full_name)",
      )
      .eq("discussion_id", discussionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 },
    );
  }
}

export async function POST(req, { params }) {
  try {
    const doctor = await ensureDoctor(req);
    const { id: discussionId } = await params;
    if (!discussionId || discussionId === 'undefined' || discussionId === 'null') {
      return new Response(JSON.stringify({ success: false, error: 'discussion id required' }), { status: 400 });
    }
    const { parent_id = null, content } = await req.json();
    if (!content)
      return new Response(
        JSON.stringify({ success: false, error: "content required" }),
        { status: 400 },
      );

    const userId = doctor.sub || doctor.id;
    const { data, error } = await supabase
      .from("discussion_posts")
      .insert([
        { discussion_id: discussionId, user_id: userId, parent_id, content },
      ])
      .select("id, created_at, users!inner(id, full_name)")
      .single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, post: data }), {
      status: 201,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 },
    );
  }
}
