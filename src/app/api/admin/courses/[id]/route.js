import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const { id } = await params || {};

    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json(
        { success: false, error: "Valid course id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("courses")
      .select("*, course_categories(id, name)")
      .eq("id", id)
      .single();

    if (error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  const body = await req.json();
  const { id } = await params;

  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json(
      { success: false, error: "Valid course id is required" },
      { status: 400 }
    );
  }

  const slug = body.name ? body.name.toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '') : undefined;

  const updateData = {
    name: body.name,
    description: body.description,
    tutorial_video_url: body.tutorial_video_url || null,
    category_id: body.category_id || null,
    updated_at: new Date(),
  };
  if (slug) updateData.slug = slug;

  const { data, error } = await supabase
    .from("courses")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, data });
}

export async function DELETE(req, { params }) {
  const { id } = await params;

  if (!id || id === "undefined" || id === "null") {
    return NextResponse.json(
      { success: false, error: "Valid course id is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true });
}
