import { supabase } from "@/lib/supabaseAdmin";

// POST /api/v1/mobile/pyt/subjects
// Body: { course_id }
// Returns: subjects that have PY topics in this course, with topics_count and available years
export async function POST(req) {
  try {
    const { course_id } = await req.json();

    if (!course_id) {
      return Response.json(
        { success: false, error: "course_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("py_topics")
      .select("subject_id, years, subjects ( id, name )")
      .eq("course_id", course_id);

    if (error) throw error;

    const bySubject = new Map();

    for (const row of data || []) {
      const sid = row.subject_id;
      if (!sid) continue;

      const existing = bySubject.get(sid) || {
        id: sid,
        name: row.subjects?.name || "",
        topics_count: 0,
        years_set: new Set(),
      };

      existing.topics_count += 1;
      for (const y of row.years || []) {
        existing.years_set.add(y);
      }

      bySubject.set(sid, existing);
    }

    const subjects = Array.from(bySubject.values())
      .map((s) => ({
        id: s.id,
        name: s.name,
        topics_count: s.topics_count,
        years: Array.from(s.years_set).sort((a, b) => a - b),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({ success: true, subjects }, { status: 200 });
  } catch (err) {
    console.error("Mobile PYT subjects error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
