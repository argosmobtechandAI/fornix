import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

// GET /api/admin/py-topics - List PY topics (optionally filter by subject_id or course_id)
export async function GET(req) {
  try {
    await ensureAdmin(req);
    const url = new URL(req.url);
    const subject_id = url.searchParams.get("subject_id");
    const course_id = url.searchParams.get("course_id");

    let query = supabase
      .from("py_topics")
      .select(`
        *,
        courses(id, name),
        subjects(id, name)
      `)
      .order("created_at", { ascending: false });

    if (subject_id) {
      query = query.eq("subject_id", subject_id);
    } else if (course_id) {
      query = query.eq("course_id", course_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("PY Topics GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/admin/py-topics - Create a new PY topic
export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();
    const { course_id, subject_id, years, topic, sub_topics, extra_explanation } = body;

    if (!course_id || !subject_id || !topic) {
      return Response.json({ success: false, error: "course_id, subject_id, and topic are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("py_topics")
      .insert([{
        course_id,
        subject_id,
        years: years || [],
        topic,
        sub_topics: sub_topics || [],
        extra_explanation: extra_explanation || null,
      }])
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("PY Topics POST error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
