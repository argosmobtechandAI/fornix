import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    const doctor = await ensureDoctor(req);
    const doctorId = doctor.sub;

    // Get unique courses from doctor's assigned subjects
    const { data: doctorSubjects, error: assignErr } = await supabase
      .from("doctor_subjects")
      .select("subject:subjects(course_id)")
      .eq("doctor_id", doctorId);

    if (assignErr) throw assignErr;
    
    const courseIds = [...new Set(doctorSubjects.map(item => item.subject?.course_id).filter(Boolean))];

    if (courseIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        data: [] 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get course details
    const { data: courses, error: coursesErr } = await supabase
      .from("courses")
      .select("id, name")
      .in("id", courseIds)
      .order("name", { ascending: true });

    if (coursesErr) throw coursesErr;

    return new Response(JSON.stringify({ 
      success: true, 
      data: courses || [] 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Doctor Courses API Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
      }
    );
  }
}