import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req, { params }) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    const { id } = await params;
    
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
          total_questions,
          mock_test_questions (
            id,
            question_id,
            questions (
              id,
              question_text,
              question_type,
              question_image_url,
              male_explanation_audio_url,
              female_explanation_audio_url,
              explanation_audio_urls,
              explanation
            )
          )
        )
      `)
      .eq("id", id)
      .eq("user_id", user_id)
      .single();

    if (error) throw error;

    // Build detailed results
    const details = (data.answers || []).map(answer => {
      const question = data.mock_tests.mock_test_questions.find(
        q => q.question_id === answer.question_id
      );
      return {
        question_id: answer.question_id,
        question_text: question?.questions.question_text,
        question_type: question?.questions.question_type,
        image_url: question?.questions.question_image_url,

        user_answer: answer.selected_option,
        correct_answer: answer.correct_option,
        is_correct: answer.is_correct,
        explanation: question?.questions.explanation,
        male_explanation_audio_url: question?.questions.male_explanation_audio_url,
        female_explanation_audio_url: question?.questions.female_explanation_audio_url,
        explanation_audio_urls: question?.questions.explanation_audio_urls,
      };
    });

    return Response.json({
      success: true,
      result: {
        test_id: data.mock_test_id,
        test_title: data.mock_tests.title,
        score: data.score,
        correct_answers: data.correct_answers,
        total_questions: data.total_questions,
        percentage: data.score,
        completed_at: data.completed_at,
        details,
      }
    }, { status: 200 });
  } catch (err) {
    console.error("Test result error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
