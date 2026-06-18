import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req, { params }) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    const { id } = await params;
    
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    // Get test details
    const { data: test, error: testError } = await supabase
      .from("mock_tests")
      .select(`
        *,
        mock_test_questions (
          id,
          question_id,
          order,
          questions (
            id,
            question_text,
            question_type,
            question_image_url
          )
        )
      `)
      .eq("id", id)
      .single();

    if (testError) throw testError;

    // Check if user has an active attempt
    const { data: attempt } = await supabase
      .from("test_attempts")
      .select("*")
      .eq("mock_test_id", id)
      .eq("user_id", user_id)
      .single();

    // Prepare questions without correct answers
    const questions = (test.mock_test_questions || [])
      .sort((a, b) => a.order - b.order)
      .map(mtq => ({
        mock_test_question_id: mtq.id,
        question_id: mtq.question_id,
        text: mtq.questions.question_text,
        type: mtq.questions.question_type,
        image_url: mtq.questions.question_image_url,
      }));

    return Response.json({
      success: true,
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        total_questions: test.total_questions,
        duration_minutes: test.duration_minutes,
        questions,
      },
      attempt: attempt || null,
    }, { status: 200 });
  } catch (err) {
    console.error("Mock test details error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
