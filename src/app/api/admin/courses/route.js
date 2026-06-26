import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("courses")
    .select("*, course_categories(id, name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, data });
}

export async function POST(req) {
  const body = await req.json();

  const slug = body.name ? body.name.toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '') : null;

  const { data, error } = await supabase
    .from("courses")
    .insert([
      {
        name: body.name,
        slug: slug,
        description: body.description,
        tutorial_video_url: body.tutorial_video_url || null,
        category_id: body.category_id || null,
      },
    ])
    .select()
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, data });
}
