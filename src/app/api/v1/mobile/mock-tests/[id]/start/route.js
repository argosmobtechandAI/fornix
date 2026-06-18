import { supabase } from "@/lib/supabaseAdmin";

// POST /api/v1/mobile/mock-tests/[id]/start - Start a new test attempt
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { user_id } = body;
    
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    // Get test details with questions and their options in a single query
    const { data: testData, error: testError } = await supabase
      .from("mock_tests")
      .select(`
        id,
        title,
        total_questions,
        duration_minutes,
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

    const test = testData && testData.length > 0 ? testData[0] : null;

    if (testError || !test) {
      return Response.json({ success: false, error: "Test not found" }, { status: 404 });
    }



    // Check if user already has an in-progress attempt
    const { data: existingAttemptData } = await supabase
      .from("test_attempts")
      .select("id, started_at")
      .eq("mock_test_id", id)
      .eq("user_id", user_id)
      .eq("status", "in_progress");

    const existingAttempt = existingAttemptData && existingAttemptData.length > 0 ? existingAttemptData[0] : null;

    if (existingAttempt) {
      // Also return questions and options
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
      return Response.json({
        success: true,
        message: "Existing attempt found",
        attempt: existingAttempt,
        questions,
      }, { status: 200 });
    }

    // Create new attempt
    const { data: newAttempt, error: attemptError } = await supabase
      .from("test_attempts")
      .insert([{
        user_id: user_id,
        mock_test_id: id,
        status: "in_progress",
        started_at: new Date(),
        total_questions: test.total_questions,
      }])
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Also return questions and options
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
    return Response.json({
      success: true,
      message: "Test started",
      attempt: newAttempt,
      questions,
    }, { status: 201 });
  } catch (err) {
    console.error("Start test error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
