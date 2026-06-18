import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    const course_id = url.searchParams.get("course_id");
    
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    let query = supabase
      .from("mock_tests")
      .select(`
        *,
        courses (id, name),
        mock_test_subjects (subjects(id, name))
      `)
      .eq("is_published", true);

    if (course_id) query = query.eq("course_id", course_id);

    const { data, error } = await query;
    if (error) throw error;

    // Get user's attempts for each test
    const { data: attempts } = await supabase
      .from("test_attempts")
      .select("mock_test_id, status, score")
      .eq("user_id", user_id);

    const tests = (data || []).map((test) => {
      const userAttempt = attempts?.find(a => a.mock_test_id === test.id);
      const subjects = (test.mock_test_subjects || []).map(mts => mts.subjects).filter(Boolean);
      return {
        id: test.id,
        title: test.title,
        description: test.description,
        course_id: test.course_id,
        total_questions: test.total_questions,
        duration_minutes: test.duration_minutes,
        course: test.courses,
        subjects: subjects,
        user_attempt: userAttempt || null,
      };
    });

    return Response.json({ success: true, tests }, { status: 200 });
  } catch (err) {
    console.error("Mock tests list error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
