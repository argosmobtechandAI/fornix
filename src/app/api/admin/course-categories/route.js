import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("course_categories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, data });
}

export async function POST(req) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("course_categories")
      .insert([
        {
          name: body.name,
          description: body.description || null,
          slug: body.slug || null,
          hero_title: body.hero_title || null,
          hero_subtitle: body.hero_subtitle || null,
          hero_image: body.hero_image || null,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
