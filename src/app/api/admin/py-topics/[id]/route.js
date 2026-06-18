import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

// GET /api/admin/py-topics/[id] - Get a single PY topic
export async function GET(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;

    const { data, error } = await supabase
      .from("py_topics")
      .select(`
        *,
        courses(id, name),
        subjects(id, name)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("PY Topics GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT /api/admin/py-topics/[id] - Update a PY topic
export async function PUT(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const { course_id, subject_id, years, topic, sub_topics, extra_explanation } = body;

    const updates = { updated_at: new Date().toISOString() };
    if (course_id !== undefined) updates.course_id = course_id;
    if (subject_id !== undefined) updates.subject_id = subject_id;
    if (years !== undefined) updates.years = years;
    if (topic !== undefined) updates.topic = topic;
    if (sub_topics !== undefined) updates.sub_topics = sub_topics;
    if (extra_explanation !== undefined) updates.extra_explanation = extra_explanation;

    const { data, error } = await supabase
      .from("py_topics")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("PY Topics PUT error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/py-topics/[id] - Delete a PY topic
export async function DELETE(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;

    const { error } = await supabase
      .from("py_topics")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("PY Topics DELETE error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
