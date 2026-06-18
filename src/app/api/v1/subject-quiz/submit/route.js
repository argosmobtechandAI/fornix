import { supabase } from "@/lib/supabaseAdmin";
import { sendPushNotification } from "@/lib/pushNotifications";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req) {
  try {
    const { user_id, attempt_id, answers, time_taken_seconds, subject_id, question_type } =
      await req.json();

    if (!user_id) {
      return Response.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }
    if (!attempt_id || !Array.isArray(answers) || answers.length === 0) {
      return Response.json(
        { success: false, error: "attempt_id and answers[] are required" },
        { status: 400 }
      );
    }

    const qType = question_type ? String(question_type).toLowerCase() : null;
    if (qType && !["easy", "moderate", "difficult"].includes(qType)) {
      return Response.json(
        { success: false, error: "question_type must be easy, moderate, or difficult" },
        { status: 422 }
      );
    }

    // Load attempt
    const { data: attempt, error: aErr } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("id", attempt_id)
      .single();
    if (aErr) throw aErr;
    if (!attempt || String(attempt.user_id) !== String(user_id)) {
      return Response.json(
        { success: false, error: "Attempt not found or not owned by user" },
        { status: 404 }
      );
    }

    // Validate submitted question ids are within requested scope (if provided)
    const submittedQuestionIds = answers.map((a) => a.question_id).filter(Boolean);
    
    let qs = [];
    let allOptions = [];
    let corrects = [];
    const chunkSize = 50; // Small chunk size to keep URLs short

    for (const part of chunk(submittedQuestionIds, chunkSize)) {
      // Fetch questions for chunk
      const { data: qChunk, error: qErr } = await supabase
        .from("questions")
        .select(
          "id, subject_id, question_type, question_text, question_image_url, explanation, male_explanation_audio_url, female_explanation_audio_url, explanation_audio_urls, marks, negative_marks"
        )
        .in("id", part);
      if (qErr) throw qErr;
      if (qChunk) qs = qs.concat(qChunk);

      // Fetch options for chunk
      const { data: optChunk, error: optErr } = await supabase
        .from("question_options")
        .select("question_id, option_key, content")
        .in("question_id", part)
        .order("option_key");
      if (optErr) throw optErr;
      if (optChunk) allOptions = allOptions.concat(optChunk);

      // Fetch correct keys for chunk
      const { data: cChunk, error: cErr } = await supabase
        .from("correct_answers")
        .select("question_id, correct_key")
        .in("question_id", part);
      if (cErr) throw cErr;
      if (cChunk) corrects = corrects.concat(cChunk);
    }

    const qById = new Map((qs || []).map((q) => [q.id, q]));

    const optionsMap = new Map();
    (allOptions || []).forEach((o) => {
      const key = String(o.question_id);
      if (!optionsMap.has(key)) optionsMap.set(key, []);
      optionsMap.get(key).push({ option_key: o.option_key, content: o.content });
    });

    const correctMap = new Map(
      (corrects || []).map((c) => [String(c.question_id), c.correct_key])
    );

    // Insert quiz_answers and compute score using per-question marks & negative_marks
    let correct = 0;
    let obtainedMarks = 0;
    let totalMarks = 0;
    const review = [];
    const answerRows = [];

    // Clear any previous answers for this attempt (idempotent submit)
    await supabase.from("quiz_answers").delete().eq("attempt_id", attempt_id);

    for (const a of answers) {
      const q = qById.get(a.question_id);
      if (!q) continue;

      const ck = correctMap.get(String(q.id)) || null;
      const selected = a.selected_key ? String(a.selected_key).toLowerCase() : null;
      const isCorrect = ck && selected ? String(ck).toLowerCase() === selected : false;

      const baseMarks = Number(q.marks ?? 1) || 0;
      const negMarks = Number(q.negative_marks ?? 0) || 0;
      totalMarks += baseMarks;

      let delta = 0;
      if (selected) {
        if (isCorrect) {
          correct++;
          delta = baseMarks;
        } else {
          delta = -negMarks;
        }
      }
      obtainedMarks += delta;

      answerRows.push({
        attempt_id,
        question_id: q.id,
        selected_key: selected,
        correct_key: ck,
        is_correct: isCorrect,
      });

      review.push({
        question_id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        question_image_url: q.question_image_url,
        options: optionsMap.get(String(q.id)) || [],
        selected_key: selected,
        correct_key: ck,
        is_correct: isCorrect,
        explanation: q.explanation || null,
        male_explanation_audio_url: q.male_explanation_audio_url || null,
        female_explanation_audio_url: q.female_explanation_audio_url || null,
        explanation_audio_urls: q.explanation_audio_urls || null,
      });
    }

    // Bulk insert all quiz_answers in one call — avoids partial failures from per-row inserts
    if (answerRows.length > 0) {
      const { error: insertErr } = await supabase.from("quiz_answers").insert(answerRows);
      if (insertErr) throw insertErr;
    }

    const total = review.length;
    // Use marks-based percentage, clamp at 0 to avoid negative overall score
    const score = totalMarks > 0
      ? Math.round((Math.max(0, obtainedMarks) / totalMarks) * 100)
      : 0;

    await supabase
      .from("quiz_attempts")
      .update({
        correct_answers: correct,
        score,
        time_taken_seconds: time_taken_seconds || null,
        completed_at: new Date(),
      })
      .eq("id", attempt_id);

    // Ranking (best-score per user) scoped to subject+type if possible using quiz_answers + questions
    // We compute attempt_ids that have answers within the subject+type question set, then rank by best score per user.
    let rank = null;
    let outOf = null;

    if (subject_id && qType) {
      const { data: scopeQs, error: scopeQErr } = await supabase
        .from("questions")
        .select("id")
        .eq("subject_id", subject_id)
        .eq("question_type", qType);
      if (scopeQErr) throw scopeQErr;

      const scopeIds = (scopeQs || []).map((x) => x.id);
      const attemptIdsInScope = new Set();

      // Fetch quiz_answers in chunks to avoid IN limits
      for (const part of chunk(scopeIds, 50)) {
        if (part.length === 0) continue;
        const { data: ans, error: ansErr } = await supabase
          .from("quiz_answers")
          .select("attempt_id, question_id")
          .in("question_id", part);
        if (ansErr) throw ansErr;
        (ans || []).forEach((r) => attemptIdsInScope.add(String(r.attempt_id)));
      }

      const attemptIds = Array.from(attemptIdsInScope);
      if (attemptIds.length) {
        const bestByUser = new Map();
        for (const part of chunk(attemptIds, 50)) {
          const { data: attempts, error: atErr } = await supabase
            .from("quiz_attempts")
            .select("user_id, score")
            .in("id", part);
          if (atErr) throw atErr;
          for (const at of attempts || []) {
            if (typeof at.score !== "number") continue;
            const prev = bestByUser.get(String(at.user_id));
            if (!prev || at.score > prev.score) {
              bestByUser.set(String(at.user_id), { user_id: String(at.user_id), score: at.score });
            }
          }
        }

        const leaderboard = Array.from(bestByUser.values()).sort((a, b) => b.score - a.score);
        rank = leaderboard.findIndex((x) => x.user_id === String(user_id)) + 1 || null;
        outOf = leaderboard.length;
      } else {
        rank = 1;
        outOf = 1;
      }
    }

    // Send push notification with score
    sendPushNotification(
      user_id,
      "Subject Quiz Completed! 📝",
      `You scored ${score}% (${obtainedMarks}/${totalMarks} marks). Tap to review your answers.`,
      "exam"
    ).catch(e => console.error("Subject Quiz Push Failed:", e));

    return Response.json(
      {
        success: true,
        attempt_id,
        score,
        obtained_marks: obtainedMarks,
        total_marks: totalMarks,
        correct,
        total,
        rank,
        outOf,
        review,
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}


