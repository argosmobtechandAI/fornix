import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// Shared handler so both GET (query params) and POST (JSON body) work
async function handlePodcastsRequest(params) {
  const { course_id, subject_id, media_type } = params || {};

  if (!course_id) {
    return NextResponse.json(
      { success: false, error: "course_id is required" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("podcasts")
    .select(
      "id, course_id, subject_id, title, description, topics, media_url, media_type, media_size_bytes, created_at, updated_at, subjects(id, name)"
    )
    .eq("course_id", course_id)
    .order("created_at", { ascending: false });

  if (subject_id) {
    query = query.eq("subject_id", subject_id);
  }

  if (media_type && ["audio", "video"].includes(media_type)) {
    query = query.eq("media_type", media_type);
  }

  const { data, error } = await query;

  if (error) throw error;

  const podcasts = (data || []).map((p) => ({
    ...p,
    subject: p.subjects || null,
    subjects: undefined,
  }));

  return NextResponse.json({ success: true, data: podcasts }, { status: 200 });
}

// Mobile API: Get podcasts by course_id and optional subject_id / media_type
// POST body: { course_id: "UUID", subject_id?: "UUID", media_type?: "audio" | "video" }
export async function POST(req) {
  try {
    const body = await req.json();
    return await handlePodcastsRequest(body);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// Support GET as well for Vercel/browser/mobile clients
// GET /api/v1/podcasts?course_id=...&subject_id=...&media_type=audio|video
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const course_id = searchParams.get("course_id");
    const subject_id = searchParams.get("subject_id");
    const media_type = searchParams.get("media_type");
    return await handlePodcastsRequest({ course_id, subject_id, media_type });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
