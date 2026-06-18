import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("test_attempts")
      .select(`
        *,
        mock_tests (
          id,
          title,
          course_id,
          total_questions,
          courses (id, name),
          mock_test_subjects (subjects(id, name))
        )
      `)
      .eq("user_id", user_id)
      .order("completed_at", { ascending: false });

    if (error) throw error;

    const attempts = (data || []).map(attempt => {
      const subjects = (attempt.mock_tests?.mock_test_subjects || []).map(mts => mts.subjects).filter(Boolean);
      return {
        id: attempt.id,
        test_id: attempt.mock_test_id,
        test_title: attempt.mock_tests?.title,
        course: attempt.mock_tests?.courses,
        subjects: subjects,
        score: attempt.score,
        correct_answers: attempt.correct_answers,
        total_questions: attempt.total_questions,
        completed_at: attempt.completed_at,
        status: attempt.status,
      };
    });

    return Response.json({ success: true, attempts }, { status: 200 });
  } catch (err) {
    console.error("Test history error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
