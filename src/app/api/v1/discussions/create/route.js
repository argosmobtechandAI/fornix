import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

// Admin creates discussion and assigns doctors
export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();
    const { course_id, subject_id, title, description, doctor_ids = [] } = body;

    if (!course_id || !title) {
      return Response.json({ success: false, error: "course_id and title are required" }, { status: 400 });
    }

    const created_by = admin.sub || admin.id || null;

    // sanitize subject_id (treat 'undefined'/'null' as null)
    const subjectId = subject_id && subject_id !== "undefined" && subject_id !== "null" ? subject_id : null;

    const { data: discussion, error: insertErr } = await supabase
      .from("discussions")
      .insert([
        { course_id, subject_id: subjectId, title, description, created_by }
      ])
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    const discussionId = discussion.id;

    if (Array.isArray(doctor_ids) && doctor_ids.length) {
      const validDoctorIds = doctor_ids.filter((d) => d && d !== "undefined" && d !== "null");
      if (validDoctorIds.length) {
        const records = validDoctorIds.map((d) => ({ discussion_id: discussionId, doctor_id: d }));
        const { error: ddErr } = await supabase.from("discussion_doctors").insert(records);
        if (ddErr) throw ddErr;
      }
    }

    return Response.json({ success: true, discussion_id: discussionId }, { status: 201 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
