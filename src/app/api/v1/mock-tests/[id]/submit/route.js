import { supabase } from "@/lib/supabaseAdmin";
import { sendPushNotification } from "@/lib/pushNotifications";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { user_id, answers } = body; // user_id and Array of { question_id, selected_option }
    
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    if (!answers || !Array.isArray(answers)) {
      return Response.json({ success: false, error: "answers array is required" }, { status: 400 });
    }

    // Get test details
    const { data: test, error: testError } = await supabase
      .from("mock_tests")
      .select(`
        *,
        mock_test_questions (
          id,
          question_id
        )
      `)
      .eq("id", id)
      .single();

    if (testError) throw testError;

    // Get correct answers
    const questionIds = test.mock_test_questions.map(q => q.question_id);
    const { data: correctAnswersData } = await supabase
      .from("correct_answers")
      .select("question_id, correct_key")
      .in("question_id", questionIds);

    // Create a map of question_id -> correct_key
    const correctMap = {};
    (correctAnswersData || []).forEach(ca => {
      correctMap[ca.question_id] = ca.correct_key;
    });

    // Calculate score
    let correctAnswers = 0;
    const answerDetails = answers.map(answer => {
      const correctKey = correctMap[answer.question_id];
      const isCorrect = correctKey === answer.selected_option;
      if (isCorrect) correctAnswers++;
      
      return {
        question_id: answer.question_id,
        selected_option: answer.selected_option,
        correct_option: correctKey,
        is_correct: isCorrect,
      };
    });

    const score = Math.round((correctAnswers / test.total_questions) * 100);

    // Check if user already has an attempt
    const { data: existingAttempt } = await supabase
      .from("test_attempts")
      .select("id")
      .eq("mock_test_id", id)
      .eq("user_id", user_id)
      .single();

    let attempt;

    if (existingAttempt) {
      // Update existing attempt
      const { data, error } = await supabase
        .from("test_attempts")
        .update({
          answers: answerDetails,
          score,
          status: "completed",
          correct_answers: correctAnswers,
          total_questions: test.total_questions,
          completed_at: new Date(),
        })
        .eq("id", existingAttempt.id)
        .select()
        .single();

      if (error) throw error;
      attempt = data;
    } else {
      // Create new attempt
      const { data, error } = await supabase
        .from("test_attempts")
        .insert([{
          user_id: user_id,
          mock_test_id: id,
          answers: answerDetails,
          score,
          status: "completed",
          correct_answers: correctAnswers,
          total_questions: test.total_questions,
          completed_at: new Date(),
        }])
        .select()
        .single();

      if (error) throw error;
      attempt = data;
    }

    // Send push notification with mock test score
    sendPushNotification(
      user_id,
      "Mock Test Completed! 🎯",
      `You scored ${score}% (${correctAnswers}/${test.total_questions} correct). Tap to review.`,
      "exam"
    ).catch(e => console.error("Mock Test Push Failed:", e));

    return Response.json({
      success: true,
      result: {
        score,
        correct_answers: correctAnswers,
        total_questions: test.total_questions,
        percentage: score,
      },
      attempt,
    }, { status: 200 });
  } catch (err) {
    console.error("Test submission error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
