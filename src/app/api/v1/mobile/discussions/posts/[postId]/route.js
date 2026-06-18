import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// PUT - edit a post (only author)
export async function PUT(req, { params }) {
  try {
    const {postId} = await params;
    const { user_id, content } = await req.json();
    if (!user_id || !content) return NextResponse.json({ success: false, error: "user_id and content required" }, { status: 400 });

    // verify ownership
    const { data: existing, error: exErr } = await supabase.from("discussion_posts").select("user_id").eq("id", postId).single();
    if (exErr) throw exErr;
    if (!existing || String(existing.user_id) !== String(user_id)) return NextResponse.json({ success: false, error: "not authorized" }, { status: 403 });

    const { error } = await supabase.from("discussion_posts").update({ content, edited: true }).eq("id", postId);
    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE - soft delete (only author)
export async function DELETE(req, { params }) {
  try {
    const {postId} = await params;
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ success: false, error: "user_id required" }, { status: 400 });

    // verify ownership
    const { data: existing, error: exErr } = await supabase.from("discussion_posts").select("user_id").eq("id", postId).single();
    if (exErr) throw exErr;
    if (!existing || String(existing.user_id) !== String(user_id)) return NextResponse.json({ success: false, error: "not authorized" }, { status: 403 });

    const { error } = await supabase.from("discussion_posts").update({ deleted: true }).eq("id", postId);
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
