import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// Shared handler so both GET (query params) and POST (JSON body) work
async function handleSubjectsRequest(params) {
  const { course_id, media_type } = params || {};

  if (!course_id) {
    return NextResponse.json(
      { success: false, error: "course_id is required" },
      { status: 400 }
    );
  }

  // Load subjects for this course
  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, name, description")
    .eq("course_id", course_id)
    .order("name");

  if (subjectsError) throw subjectsError;

  if (!subjects || subjects.length === 0) {
    return NextResponse.json(
      { success: true, data: [] },
      { status: 200 }
    );
  }

  // Load all podcasts for this course (optionally filtered by media_type)
  let podcastsQuery = supabase
    .from("podcasts")
    .select("id, subject_id, media_type")
    .eq("course_id", course_id);

  if (media_type && ["audio", "video"].includes(media_type)) {
    podcastsQuery = podcastsQuery.eq("media_type", media_type);
  }

  const { data: podcasts, error: podcastsError } = await podcastsQuery;

  if (podcastsError) throw podcastsError;

  const countMap = new Map();
  (podcasts || []).forEach((p) => {
    if (!p.subject_id) return;
    const current = countMap.get(p.subject_id) || 0;
    countMap.set(p.subject_id, current + 1);
  });

  const enrichedSubjects = subjects.map((s) => ({
    ...s,
    podcasts_count: countMap.get(s.id) || 0,
  }));

  return NextResponse.json(
    { success: true, data: enrichedSubjects },
    { status: 200 }
  );
}

// Mobile API: Get subjects for a course with count of podcasts per subject
// POST body: { course_id: "UUID", media_type?: "audio" | "video" }
export async function POST(req) {
  try {
    const body = await req.json();
    return await handleSubjectsRequest(body);
  } catch (err) {
    console.error("Mobile podcasts subjects API error (POST):", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// Support GET as well for Vercel/browser/mobile clients
// GET /api/v1/podcasts/subjects?course_id=...&media_type=audio|video
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const course_id = searchParams.get("course_id");
    const media_type = searchParams.get("media_type");
    return await handleSubjectsRequest({ course_id, media_type });
  } catch (err) {
    console.error("Mobile podcasts subjects API error (GET):", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
