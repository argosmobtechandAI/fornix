import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, course_id } = body;
    
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    // First get mock tests
    let query = supabase
      .from("mock_tests")
      .select(`
        id,
        title,
        description,
        course_id,
        total_questions,
        duration_minutes,
        is_published,
        created_at,
        courses (id, name)
      `)
      .order("created_at", { ascending: false });

    // No published filter; return all tests

    if (course_id) query = query.eq("course_id", course_id);

    const { data: testsData, error } = await query;
    if (error) throw error;

    // Get subjects and question count for all tests
    const testIds = (testsData || []).map(t => t.id);
    let subjectsMap = {};
    let questionCountMap = {};
    if (testIds.length > 0) {
      // Subjects
      const { data: subjectsData } = await supabase
        .from("mock_test_subjects")
        .select("mock_test_id, subjects(id, name)")
        .in("mock_test_id", testIds);
      (subjectsData || []).forEach(item => {
        if (!subjectsMap[item.mock_test_id]) subjectsMap[item.mock_test_id] = [];
        if (item.subjects) subjectsMap[item.mock_test_id].push(item.subjects.name);
      });
      // Question count
      const { data: questionsData } = await supabase
        .from("mock_test_questions")
        .select("mock_test_id")
        .in("mock_test_id", testIds);
      (questionsData || []).forEach(item => {
        if (!questionCountMap[item.mock_test_id]) questionCountMap[item.mock_test_id] = 0;
        questionCountMap[item.mock_test_id]++;
      });
    }

    // Get user's attempts for each test
    const { data: attempts } = await supabase
      .from("test_attempts")
      .select("mock_test_id, status, score, completed_at")
      .eq("user_id", user_id);

    const tests = (testsData || []).map((test) => {
      const userAttempts = attempts?.filter(a => a.mock_test_id === test.id) || [];
      return {
        id: test.id,
        title: test.title,
        description: test.description,
        course_id: test.course_id,
        total_questions: questionCountMap[test.id] || 0,
        subjects: subjectsMap[test.id] || [],
        duration_minutes: test.duration_minutes,
        is_published: test.is_published,
        course: test.courses,
        attempts_count: userAttempts.length,
        best_score: userAttempts.length > 0 ? Math.max(...userAttempts.map(a => a.score || 0)) : null,
        last_attempt: userAttempts.length > 0 ? userAttempts.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0] : null,
      };
    });

    return Response.json({ success: true, tests, count: tests.length }, { status: 200 });
  } catch (err) {
    console.error("Mock tests list error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
