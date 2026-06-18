import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const { user_id } = body;
    const { id } = await params;
    
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    // Get test details with questions and their options in a single query
    const { data: testData, error: testError } = await supabase
      .from("mock_tests")
      .select(`
        id,
        title,
        description,
        total_questions,
        duration_minutes,
        course_id,
        courses (id, name),
        mock_test_subjects (subjects(id, name)),
        mock_test_questions (
          id,
          question_id,
          order,
          questions (
            id,
            question_text,
            question_type,
            question_image_url,
            question_options!fk_options_question (
              option_key,
              content
            )
          )
        )
      `)
      .eq("id", id);

    if (testError) throw testError;
    
    const test = testData && testData.length > 0 ? testData[0] : null;
    
    if (!test) {
      return Response.json({ success: false, error: "Test not found" }, { status: 404 });
    }



    // Check if user has an active/incomplete attempt
    const { data: existingAttemptData } = await supabase
      .from("test_attempts")
      .select("id, status, started_at")
      .eq("mock_test_id", id)
      .eq("user_id", user_id)
      .eq("status", "in_progress");
    
    const existingAttempt = existingAttemptData && existingAttemptData.length > 0 ? existingAttemptData[0] : null;

    // Prepare questions without correct answers
    const questions = (test.mock_test_questions || [])
      .sort((a, b) => a.order - b.order)
      .map(mtq => {
        const q = Array.isArray(mtq.questions) ? mtq.questions[0] : mtq.questions;
        const opts = q?.question_options || [];
        return {
          id: mtq.question_id,
          text: q?.question_text,
          type: q?.question_type,
          image_url: q?.question_image_url,
          options: opts.map(opt => ({
            key: opt.option_key,
            content: opt.content
          })),
        };
      });

    const subjects = (test.mock_test_subjects || []).map(mts => mts.subjects).filter(Boolean);

    return Response.json({
      success: true,
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        total_questions: test.total_questions,
        duration_minutes: test.duration_minutes,
        course: test.courses,
        subjects: subjects,
        questions,
      },
      existing_attempt: existingAttempt || null,
    }, { status: 200 });
  } catch (err) {
    console.error("Mock test details error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
