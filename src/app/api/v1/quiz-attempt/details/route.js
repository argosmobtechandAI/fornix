import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { user_id, attempt_id } = await req.json();
    if (!user_id || !attempt_id) {
      return Response.json(
        { success: false, error: "user_id and attempt_id are required" },
        { status: 400 }
      );
    }

    const CHUNK_SIZE = 50;

    // 1. Try to find in quiz_attempts first (Practice Quizzes)
    const { data: quizAttempt, error: qErr } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("user_id", user_id)
      .maybeSingle(); 

    if (quizAttempt) {
      // 2. Load answers for this attempt
      const { data: answers, error: ansErr } = await supabase
        .from("quiz_answers")
        .select("question_id, selected_key, correct_key, is_correct")
        .eq("attempt_id", attempt_id);
      if (ansErr) throw ansErr;

      const answeredIds = (answers || []).map((a) => String(a.question_id)).filter(Boolean);

      if (!answeredIds.length) {
        return Response.json({ success: true, attempt: quizAttempt, review: [] });
      }

      // 3. Load question data and options with chunking to avoid 414 error
      let qs = [];
      let opts = [];

      for (let i = 0; i < answeredIds.length; i += CHUNK_SIZE) {
        const chunk = answeredIds.slice(i, i + CHUNK_SIZE);
        
        const { data: qChunk, error: qDataErr } = await supabase
          .from("questions")
          .select("id, subject_id, chapter_id, topic_id, question_text, question_type, question_image_url, explanation, male_explanation_audio_url, female_explanation_audio_url, explanation_audio_urls")
          .in("id", chunk);
        if (qDataErr) throw qDataErr;
        if (qChunk) qs = qs.concat(qChunk);

        const { data: optChunk, error: optErr } = await supabase
          .from("question_options")
          .select("question_id, option_key, content")
          .in("question_id", chunk)
          .order("option_key");
        if (optErr) throw optErr;
        if (optChunk) opts = opts.concat(optChunk);
      }

      const optByQ = new Map();
      (opts || []).forEach((o) => {
        const k = String(o.question_id);
        if (!optByQ.has(k)) optByQ.set(k, []);
        optByQ.get(k).push({ option_key: o.option_key, content: o.content });
      });

      const qById = new Map((qs || []).map((q) => [String(q.id), q]));

      // 5. Build review
      const review = (answers || []).map((a) => {
        const q = qById.get(String(a.question_id));
        return {
          question_id: a.question_id,
          question: q ? {
            ...q,
            options: optByQ.get(String(q.id)) || []
          } : null,
          selected_key: a.selected_key || null,
          correct_key: a.correct_key || null,
          is_correct: !!a.is_correct,
          status: a.selected_key ? "attempted" : "skipped",
        };
      });

      return Response.json({ success: true, attempt: quizAttempt, review });
    }

    // 6. If not found in quiz_attempts, try test_attempts (Mock Tests)
    const { data: testAttempt, error: tErr } = await supabase
      .from("test_attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (testAttempt) {
      // 7. Get mock test questions
      const { data: mtqs, error: mtqErr } = await supabase
        .from("mock_test_questions")
        .select(`
          question_id,
          order,
          questions (
            id, subject_id, chapter_id, topic_id, question_text, question_type, 
            question_image_url, explanation, male_explanation_audio_url, 
            female_explanation_audio_url, explanation_audio_urls
          )
        `)
        .eq("mock_test_id", testAttempt.mock_test_id)
        .order("order");
      if (mtqErr) throw mtqErr;

      const questionIds = (mtqs || []).map(q => String(q.question_id));
      let opts = [];

      // 8. Get options with chunking
      for (let i = 0; i < questionIds.length; i += CHUNK_SIZE) {
        const chunk = questionIds.slice(i, i + CHUNK_SIZE);
        const { data: optChunk, error: optErr } = await supabase
          .from("question_options")
          .select("question_id, option_key, content")
          .in("question_id", chunk)
          .order("option_key");
        if (optErr) throw optErr;
        if (optChunk) opts = opts.concat(optChunk);
      }

      const optByQ = new Map();
      (opts || []).forEach((o) => {
        const k = String(o.question_id);
        if (!optByQ.has(k)) optByQ.set(k, []);
        optByQ.get(k).push({ option_key: o.option_key, content: o.content });
      });

      // 9. Map answers
      const answersMap = new Map((testAttempt.answers || []).map(a => [String(a.question_id), a]));

      // 10. Build review to match practice quiz format
      const review = (mtqs || []).map(mtq => {
        const qRaw = Array.isArray(mtq.questions) ? mtq.questions[0] : mtq.questions;
        const qId = String(mtq.question_id);
        const ans = answersMap.get(qId);

        return {
          question_id: qId,
          question: qRaw ? {
            ...qRaw,
            options: optByQ.get(qId) || []
          } : null,
          selected_key: ans?.selected_option || null,
          correct_key: ans?.correct_option || null,
          is_correct: !!ans?.is_correct,
          status: ans?.selected_option ? "attempted" : "skipped",
        };
      });

      // Format testAttempt to match quizAttempt for frontend stats
      const formattedAttempt = {
        ...testAttempt,
        total_questions: testAttempt.total_questions || review.length,
        correct_answers: testAttempt.correct_answers || 0,
        score: testAttempt.score || 0,
        time_taken_seconds: testAttempt.time_taken_seconds || 0,
        type: 'mock'
      };

      return Response.json({ success: true, attempt: formattedAttempt, review });
    }

    // 11. If not found in either
    return Response.json(
      { success: false, error: "Attempt not found in any record" },
      { status: 404 }
    );

  } catch (err) {
    console.error("Quiz Detail API Error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
