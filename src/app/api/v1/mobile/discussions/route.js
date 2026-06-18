import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// POST { course_id }
export async function POST(req) {
  try {
    const { course_id } = await req.json();
    if (!course_id) return NextResponse.json({ success: false, error: "course_id required" }, { status: 400 });

    const { data, error } = await supabase
      .from("discussions")
      .select(`
        id,
        title,
        description,
        course_id,
        subject_id,
        created_at,
        courses (id, name),
        subjects (id, name),
        discussion_doctors(doctor_id, doctors:users(id, full_name))
      `)
      .eq("course_id", course_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
