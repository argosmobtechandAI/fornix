import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    const doctor = await ensureDoctor(req);
    const doctorId = doctor.sub;

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const search = url.searchParams.get('search') || '';
    const courseId = url.searchParams.get('course_id');
    
    const startIndex = (page - 1) * limit;

    // Get assigned subject IDs for this doctor
    const { data: doctorSubjects, error: assignErr } = await supabase
      .from("doctor_subjects")
      .select("subject_id")
      .eq("doctor_id", doctorId);

    if (assignErr) throw assignErr;
    
    const assignedSubjectIds = doctorSubjects.map((r) => r.subject_id);

    if (assignedSubjectIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          total: 0,
          limit,
          hasNext: false,
          hasPrev: false
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build query for subjects with course information
    let query = supabase
      .from("subjects")
      .select(`
        *,
        courses (id, name),
        chapters (id)
      `, { count: 'exact' })
      .in("id", assignedSubjectIds);

    // Apply search filter
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply course filter
    if (courseId && courseId !== 'all') {
      query = query.eq('course_id', courseId);
    }

    // Execute query with pagination
    const { data, error, count } = await query
      .order('name', { ascending: true })
      .range(startIndex, startIndex + limit - 1);

    if (error) throw error;

    // Transform data to include course names
    const transformedData = data.map(subject => ({
      ...subject,
      course_name: subject.courses?.name || 'No Course',
      course: subject.courses,
      chapters_count: subject.chapters?.length || 0,
      courses: undefined,
      chapters: undefined
    }));

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return new Response(JSON.stringify({ 
      success: true, 
      data: transformedData,
      pagination: {
        currentPage: page,
        totalPages,
        total: totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Doctor Subjects API Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
      }
    );
  }
}