import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const { user_id } = body;
    const { id } = await params; // This is the attempt_id
    
    if (!user_id) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    // 1. Get attempt details first
    const { data: attempt, error: aErr } = await supabase
      .from("test_attempts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user_id)
      .single();

    if (aErr || !attempt) {
      console.error("Attempt not found:", aErr);
      return Response.json({ success: false, error: "Attempt not found" }, { status: 404 });
    }

    // 2. Get mock test title and basic info
    const { data: testInfo, error: tErr } = await supabase
      .from("mock_tests")
      .select("id, title, total_questions, duration_minutes")
      .eq("id", attempt.mock_test_id)
      .single();

    if (tErr) console.error("Test info fetch error:", tErr);

    // 3. Get all questions linked to this mock test
    const { data: mtqs, error: mtqErr } = await supabase
      .from("mock_test_questions")
      .select(`
        question_id,
        order,
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
      `)
      .eq("mock_test_id", attempt.mock_test_id)
      .order("order");

    if (mtqErr) {
        console.error("MTQS fetch error:", mtqErr);
        throw mtqErr;
    }

    const questionIds = (mtqs || []).map(q => q.question_id);

    // 4. Get question options with chunking to avoid 414 error
    let options = [];
    const chunkSize = 50;
    for (let i = 0; i < questionIds.length; i += chunkSize) {
      const chunk = questionIds.slice(i, i + chunkSize);
      const { data: optChunk, error: optErr } = await supabase
        .from("question_options")
        .select("question_id, option_key, content")
        .in("question_id", chunk);
      
      if (optErr) {
        console.error("Options chunk fetch error:", optErr);
        throw optErr;
      }
      if (optChunk) options = options.concat(optChunk);
    }

    // 5. Build lookup maps
    const optionsMap = {};
    (options || []).forEach(opt => {
      const qId = opt.question_id;
      if (!optionsMap[qId]) optionsMap[qId] = [];
      optionsMap[qId].push({
        key: opt.option_key,
        content: opt.content,
        // Include option_key for compatibility with different frontend versions
        option_key: opt.option_key
      });
    });

    // Sort options by key for each question
    Object.keys(optionsMap).forEach(qId => {
        optionsMap[qId].sort((a, b) => a.key.localeCompare(b.key));
    });

    const questionsMap = {};
    (mtqs || []).forEach(mtq => {
      const q = Array.isArray(mtq.questions) ? mtq.questions[0] : mtq.questions;
      questionsMap[mtq.question_id] = {
        order: mtq.order,
        question: q,
      };
    });

    // 6. Build detailed results
    const userAnswers = attempt.answers || [];
    const userAnswersMap = {};
    userAnswers.forEach(ua => {
        userAnswersMap[ua.question_id] = ua;
    });

    const details = (mtqs || []).map(mtq => {
      const qId = mtq.question_id;
      const questionInfo = questionsMap[qId];
      const answer = userAnswersMap[qId];
      
      return {
        question_id: qId,
        order: mtq.order,
        question_text: questionInfo?.question?.question_text,
        question_type: questionInfo?.question?.question_type,
        image_url: questionInfo?.question?.question_image_url,
        explanation: questionInfo?.question?.explanation,
        options: optionsMap[qId] || [],
        user_answer: answer?.selected_option || null,
        correct_answer: answer?.correct_option || null,
        is_correct: !!answer?.is_correct,
        male_explanation_audio_url: questionInfo?.question?.male_explanation_audio_url,
        female_explanation_audio_url: questionInfo?.question?.female_explanation_audio_url,
        explanation_audio_urls: questionInfo?.question?.explanation_audio_urls,
      };
    });

    // Calculate analysis
    const analysis = {
      score: attempt.score,
      correct_answers: attempt.correct_answers,
      wrong_answers: attempt.wrong_answers,
      unanswered: attempt.unanswered,
      total_questions: attempt.total_questions,
      percentage: attempt.score,
      time_taken_seconds: attempt.time_taken_seconds,
      accuracy: (attempt.correct_answers + (attempt.wrong_answers || 0)) > 0 
        ? Math.round((attempt.correct_answers / (attempt.correct_answers + (attempt.wrong_answers || 0))) * 100) 
        : 0,
      completion_rate: Math.round(((attempt.total_questions - (attempt.unanswered || 0)) / attempt.total_questions) * 100),
    };

    return Response.json({
      success: true,
      result: {
        attempt_id: attempt.id,
        test_id: attempt.mock_test_id,
        test_title: testInfo?.title,
        started_at: attempt.started_at,
        completed_at: attempt.completed_at,
        analysis,
        details,
      }
    }, { status: 200 });

  } catch (err) {
    console.error("Test result error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
