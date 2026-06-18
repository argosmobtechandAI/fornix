import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { course_id } = await req.json();

    let query = supabase
      .from("discussions")
      .select(`
        id,
        title,
        description,
        course_id,
        subject_id,
        created_at,
        updated_at,
        courses (id, name),
        subjects (id, name),
        discussion_doctors(doctor_id, doctors:users(id, full_name))
      `)
      .order("created_at", { ascending: false });

    if (course_id) {
      query = query.eq("course_id", course_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
