import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    await ensureAdmin(req);
    
    const { data, error } = await supabase
      .from("subjects")
      .select(`
        id, 
        name,
        course_id,
        courses (
          id,
          name
        )
      `)
      .order("name", { ascending: true });
      
    if (error) throw error;

    // Transform the data to include course information in a cleaner format
    const transformedData = data.map(subject => ({
      id: subject.id,
      name: subject.name,
      course_id: subject.course_id,
      course_name: subject.courses?.name || 'No Course',
      course: subject.courses ? {
        id: subject.courses.id,
        name: subject.courses.name
      } : null
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      subjects: transformedData 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Subjects API Error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}