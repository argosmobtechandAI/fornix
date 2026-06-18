import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();
    const { name, description = "", course_id, academic_year } = body;
    if (!name) throw new Error("Subject name required");
    if (!course_id) throw new Error("Course ID required");

    // Check if course is FMGE to validate academic_year
    const { data: course } = await supabase
      .from("courses")
      .select("id, name")
      .eq("id", course_id)
      .single();

    const isFMGE = course && course.name.toUpperCase().includes("FMGE");
    const validYears = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year"];

    if (isFMGE && !academic_year) {
      throw new Error("Academic year is required for FMGE subjects");
    }
    if (isFMGE && academic_year && !validYears.includes(academic_year)) {
      throw new Error("Invalid academic year. Must be one of: " + validYears.join(", "));
    }

    const { data, error } = await supabase
      .from("subjects")
      .insert([{
        name,
        description,
        course_id,
        academic_year: isFMGE ? academic_year : null,
        created_by: admin.sub || admin.id || null,
        updated_by: admin.sub || admin.id || null,
      }])
      .select(`
        *,
        courses (id, name)
      `)
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, subject: data }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}

export async function GET(req) {
  try {
    await ensureAdmin(req);

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const search = url.searchParams.get('search') || '';
    const rawCourseId = url.searchParams.get('course_id');
    const courseId = rawCourseId && rawCourseId !== 'undefined' && rawCourseId !== 'null'
      ? rawCourseId
      : null;

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit - 1;

    // Build base query for counting
    let countQuery = supabase
      .from("subjects")
      .select('*', { count: 'exact', head: true });

    // Build main query for data
    let dataQuery = supabase
      .from("subjects")
      .select(`
        *,
        courses (id, name),
        chapters (id)
      `);

    // Apply search filter - Fixed approach
    if (search) {
      const searchCondition = `name.ilike.%${search}%`;
      countQuery = countQuery.or(searchCondition);
      dataQuery = dataQuery.or(searchCondition);
    }

    // Apply course filter
    if (courseId && courseId !== 'all') {
      countQuery = countQuery.eq('course_id', courseId);
      dataQuery = dataQuery.eq('course_id', courseId);
    }

    // Execute count query first
    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error("Count error:", countError);
      throw countError;
    }

    // Apply pagination and ordering to data query
    const { data, error: dataError } = await dataQuery
      .order('name')
      .range(startIndex, endIndex);

    if (dataError) {
      console.error("Data error:", dataError);
      throw dataError;
    }

    // Transform data
    const transformedData = data.map(subject => ({
      ...subject,
      course: subject.courses,
      chapters_count: subject.chapters?.length || 0,
      courses: undefined,
      chapters: undefined
    }));

    // Calculate pagination info
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
    console.error("Subjects API Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
    });
  }
}

// Alternative GET method with better search (if above doesn't work)
export async function GET_ALTERNATIVE(req) {
  try {
    await ensureAdmin(req);

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const search = url.searchParams.get('search') || '';
    const courseId = url.searchParams.get('course_id');

    const startIndex = (page - 1) * limit;

    // Method 2: Separate queries for better control
    let subjectsQuery = supabase
      .from('subjects')
      .select(`
        *,
        courses (id, name),
        chapters (id)
      `, { count: 'exact' });

    // Apply filters one by one
    if (search) {
      subjectsQuery = subjectsQuery.ilike('name', `%${search}%`);
    }

    if (courseId && courseId !== 'all') {
      subjectsQuery = subjectsQuery.eq('course_id', courseId);
    }

    // Get paginated results
    const { data, error, count } = await subjectsQuery
      .order('name')
      .range(startIndex, startIndex + limit - 1);

    if (error) throw error;

    // Transform data
    const transformedData = data.map(subject => ({
      ...subject,
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
    console.error("Subjects API Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
    });
  }
}

export async function PUT(req, { params }) {
  try {
    const admin = await ensureAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const { name, description = "", course_id, academic_year } = body;

    if (!name) throw new Error("Subject name required");
    if (!course_id) throw new Error("Course ID required");

    // Check if course is FMGE to validate academic_year
    const { data: course } = await supabase
      .from("courses")
      .select("id, name")
      .eq("id", course_id)
      .single();

    const isFMGE = course && course.name.toUpperCase().includes("FMGE");
    const validYears = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year"];

    if (isFMGE && !academic_year) {
      throw new Error("Academic year is required for FMGE subjects");
    }
    if (isFMGE && academic_year && !validYears.includes(academic_year)) {
      throw new Error("Invalid academic year. Must be one of: " + validYears.join(", "));
    }

    const { data, error } = await supabase
      .from("subjects")
      .update({
        name,
        description,
        course_id,
        academic_year: isFMGE ? academic_year : null,
        updated_by: admin.sub || admin.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        courses (id, name)
      `)
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, subject: data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}