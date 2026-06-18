import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// GET - list posts for discussion
export async function GET(req, { params }) {
  try {
    const {id:discussionId} = await params;
    const { data, error } = await supabase
      .from("discussion_posts")
      .select("id, discussion_id, user_id, parent_id, content, is_answer, edited, deleted, created_at, users!inner(id, full_name)")
      .eq("discussion_id", discussionId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST - create new post (student or doctor)
export async function POST(req, { params }) {
  try {
    const {id:discussionId} = await params;
    const { user_id, parent_id = null, content } = await req.json();
    if (!user_id || !content) return NextResponse.json({ success: false, error: "user_id and content required" }, { status: 400 });

    const { data, error } = await supabase
      .from("discussion_posts")
      .insert([{ discussion_id: discussionId, user_id, parent_id, content }])
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, post_id: data.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
