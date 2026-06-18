import { supabase } from "@/lib/supabaseAdmin";

// POST /api/v1/mobile/mock-tests/history - Get user's test attempt history
export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, course_id } = body;
    
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    let query = supabase
      .from("test_attempts")
      .select(`
        id,
        mock_test_id,
        score,
        correct_answers,
        wrong_answers,
        unanswered,
        total_questions,
        status,
        time_taken_seconds,
        started_at,
        completed_at,
        mock_tests (
          id,
          title,
          course_id,
          total_questions,
          duration_minutes,
          courses (id, name),
          mock_test_subjects (subjects(id, name))
        )
      `)
      .eq("user_id", user_id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Filter by course_id if provided
    let filteredData = data || [];
    if (course_id) {
      filteredData = filteredData.filter(a => a.mock_tests?.course_id === course_id);
    }

    const attempts = filteredData.map(attempt => {
      const subjects = (attempt.mock_tests?.mock_test_subjects || []).map(mts => mts.subjects).filter(Boolean);
      return {
        id: attempt.id,
        test_id: attempt.mock_test_id,
        test_title: attempt.mock_tests?.title,
        course: attempt.mock_tests?.courses,
        subjects: subjects,
        score: attempt.score,
        correct_answers: attempt.correct_answers,
        wrong_answers: attempt.wrong_answers,
        unanswered: attempt.unanswered,
        total_questions: attempt.total_questions,
        time_taken_seconds: attempt.time_taken_seconds,
        started_at: attempt.started_at,
        completed_at: attempt.completed_at,
        status: attempt.status,
      };
    });

    // Calculate overall stats
    const stats = {
      total_tests_taken: attempts.length,
      average_score: attempts.length > 0 
        ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length) 
        : 0,
      best_score: attempts.length > 0 ? Math.max(...attempts.map(a => a.score || 0)) : 0,
      total_correct: attempts.reduce((sum, a) => sum + (a.correct_answers || 0), 0),
      total_questions_attempted: attempts.reduce((sum, a) => sum + (a.total_questions || 0), 0),
    };

    return Response.json({ success: true, attempts, stats }, { status: 200 });
  } catch (err) {
    console.error("Test history error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
