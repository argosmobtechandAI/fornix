import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { data, error } = await supabase
      .from("course_categories")
      .update({
        name: body.name,
        description: body.description || null,
        slug: body.slug || null,
        hero_title: body.hero_title || null,
        hero_subtitle: body.hero_subtitle || null,
        hero_image: body.hero_image || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from("course_categories")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
