import { supabase } from "@/lib/supabaseAdmin";

// POST /api/v1/mobile/pyt/topics
// Body: { subject_id, year? }
// Returns: PY topics for a subject, optionally filtered by year
export async function POST(req) {
  try {
    const { subject_id, year } = await req.json();

    if (!subject_id) {
      return Response.json(
        { success: false, error: "subject_id is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("py_topics")
      .select(
        `id, course_id, subject_id, years, topic, sub_topics, extra_explanation, created_at,
         courses ( id, name ),
         subjects ( id, name )`
      )
      .eq("subject_id", subject_id)
      .order("created_at", { ascending: false });

    if (year) {
      const yearNumber = typeof year === "string" ? parseInt(year, 10) : year;
      if (!Number.isNaN(yearNumber)) {
        query = query.contains("years", [yearNumber]);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const topics = (data || []).map((t) => ({
      id: t.id,
      topic: t.topic,
      years: t.years || [],
      sub_topics: t.sub_topics || [],
      extra_explanation: t.extra_explanation || null,
      course: t.courses ? { id: t.courses.id, name: t.courses.name } : null,
      subject: t.subjects ? { id: t.subjects.id, name: t.subjects.name } : null,
      created_at: t.created_at,
    }));

    return Response.json({ success: true, topics, count: topics.length }, { status: 200 });
  } catch (err) {
    console.error("Mobile PYT topics error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
