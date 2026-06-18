import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    const doctor = await ensureDoctor(req);
    const doctorId = doctor.sub || doctor.id;

    // find discussion ids assigned to this doctor
    const { data: rows, error: e2 } = await supabase
      .from("discussion_doctors")
      .select("discussion_id")
      .eq("doctor_id", doctorId);

    if (e2) throw e2;
    const discussionIds = (rows || []).map((r) => r.discussion_id);
    if (!discussionIds.length) return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });

    const { data: discussions, error: dErr } = await supabase
      .from("discussions")
      .select("id, title, description, course_id, subject_id, created_at, courses(id, name), subjects(id, name), discussion_doctors(doctor_id, doctors:users(id, full_name))")
      .in("id", discussionIds)
      .order("created_at", { ascending: false });

    if (dErr) throw dErr;
    return new Response(JSON.stringify({ success: true, data: discussions }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
