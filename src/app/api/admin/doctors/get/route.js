import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    await ensureAdmin(req);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const offset = (page - 1) * limit;

    // Build query for doctors
    let query = supabase
      .from("users")
      .select("id, full_name, email, role, is_active, created_at", { count: 'exact' })
      .eq("role", "doctor");

    // Apply search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('is_active', status === 'active');
    }

    // Get paginated doctors
    const { data: doctors, error: dErr, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (dErr) throw dErr;

    // Get doctor_subjects joined with subjects and courses for the fetched doctors
    const doctorIds = doctors?.map(d => d.id) || [];
    let assignments = [];

    if (doctorIds.length > 0) {
      const { data: assignmentsData, error: aErr } = await supabase
        .from("doctor_subjects")
        .select(`
          doctor_id, 
          subject:subjects(
            id, 
            name,
            courses (id, name)
          )
        `)
        .in("doctor_id", doctorIds);

      if (aErr) throw aErr;
      assignments = assignmentsData || [];
    }

    // Map subjects by doctor_id and include course information
    const map = {};
    assignments.forEach((r) => {
      if (!map[r.doctor_id]) map[r.doctor_id] = [];
      map[r.doctor_id].push({
        ...r.subject,
        course_name: r.subject.courses?.name || 'No Course',
        course: r.subject.courses
      });
    });

    const payload = (doctors || []).map((doc) => ({
      ...doc,
      subjects: map[doc.id] || [],
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    return new Response(JSON.stringify({ 
      success: true, 
      doctors: payload,
      pagination: {
        currentPage: page,
        totalPages,
        totalDoctors: count,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}