import { supabase } from "@/lib/supabaseAdmin";

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, subject_id, question_type, limit = 20 } = body || {};

    if (!user_id) {
      return Response.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }
    if (!subject_id || !question_type) {
      return Response.json(
        { success: false, error: "subject_id and question_type are required" },
        { status: 400 }
      );
    }

    if (!["easy", "moderate", "difficult"].includes(String(question_type).toLowerCase())) {
      return Response.json(
        { success: false, error: "question_type must be easy, moderate, or difficult" },
        { status: 422 }
      );
    }

    const qType = String(question_type).toLowerCase();
    const qLimit = Math.max(1, Math.min(100, Number(limit) || 20));

    // 0) Enforce free-user quiz limit before creating a new attempt
    let hasActiveSubscription = false;
    try {
      const nowIso = new Date().toISOString();
      const { data: subs, error: subErr } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", user_id)
        .neq("is_active", false)
        .gte("end_date", nowIso)
        .order("end_date", { ascending: false })
        .limit(1);

      if (!subErr && (subs || []).length > 0) {
        hasActiveSubscription = true;
      }
    } catch (e) {
      // If subscription check fails, don't block; treat as paid.
      hasActiveSubscription = true;
    }

    if (!hasActiveSubscription) {
      const { count: attemptCount, error: countErr } = await supabase
        .from("quiz_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id);

      if (!countErr && typeof attemptCount === "number" && attemptCount >= 50) {
        return Response.json(
          {
            success: false,
            error: "FREE_QUIZ_LIMIT_REACHED",
            message:
              "Free users can attempt only 50 quizzes. Please purchase a plan to continue.",
          },
          { status: 403 }
        );
      }
    }

    // 1) Candidate questions for subject + type (with verification)
    let candidates = [];
    {
      let allCandidates = [];
      // Fetch all with chunking in case there are many
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: candRows, error: candErr } = await supabase
          .from("questions")
          .select("id, subject_id, question_type")
          .eq("subject_id", subject_id)
          .eq("question_type", qType)
          .range(offset, offset + pageSize - 1);

        if (candErr) throw candErr;

        if (!candRows || candRows.length === 0) {
          hasMore = false;
          break;
        }

        // Verify each candidate actually has the right subject and type
        candRows.forEach(q => {
          if (String(q.subject_id) === String(subject_id) && String(q.question_type).toLowerCase() === qType) {
            allCandidates.push(q.id);
          }
        });

        if (candRows.length < pageSize) hasMore = false;
        offset += pageSize;
      }

      candidates = allCandidates;
    }

    // 2) Previously attempted question_ids for user (only those within candidates for this subject+type)
    let attemptedIds = [];
    {
      const { data: attempts, error: aErr } = await supabase
        .from("quiz_attempts")
        .select("id")
        .eq("user_id", user_id);
      if (aErr) throw aErr;
      const attemptIds = (attempts || []).map((a) => a.id);

      if (attemptIds.length > 0) {
        let allAnswers = [];
        for (const part of chunk(attemptIds, 50)) {
          if (part.length === 0) continue;
          const { data: answers, error: ansErr } = await supabase
            .from("quiz_answers")
            .select("question_id, attempt_id")
            .in("attempt_id", part);
          if (ansErr) throw ansErr;
          allAnswers = allAnswers.concat(answers || []);
        }
        // Only include question_ids that are in our candidates list (same subject+type)
        const allAttemptedIds = allAnswers.map((a) => a.question_id);
        attemptedIds = [...new Set(allAttemptedIds.filter(id => candidates.includes(id)))];
      }
    }

    // 3) Build selection: prefer unattempted, then fill from attempted to reach limit
    const setCandidates = new Set(candidates);
    const setAttempted = new Set(attemptedIds);
    const unattempted = [...setCandidates].filter((id) => !setAttempted.has(id));

    shuffle(unattempted);

    const pick = [];
    for (const id of unattempted) {
      if (pick.length >= qLimit) break;
      pick.push(id);
    }

    // 4) Fetch question payload (NO correct answers, NO explanation)
    let questions = [];
    if (pick.length > 0) {
      let allQs = [];
      for (const part of chunk(pick, 50)) {
        if (part.length === 0) continue;
        const { data: qs, error: qErr } = await supabase
          .from("questions")
          .select("id, question_text, question_type, question_image_url, subject_id")
          .in("id", part);
        if (qErr) throw qErr;
        allQs = allQs.concat(qs || []);
      }

      // Verify all questions belong to the requested subject
      const wrongSubject = allQs.find(q => String(q.subject_id) !== String(subject_id));
      if (wrongSubject) {
        // Filter out questions from wrong subject to ensure data consistency
        allQs = allQs.filter(q => String(q.subject_id) === String(subject_id));
      }

      // Also verify question_type matches
      const wrongType = allQs.find(q => String(q.question_type).toLowerCase() !== qType);
      if (wrongType) {
        // Filter out questions from wrong type to ensure data consistency
        allQs = allQs.filter(q => String(q.question_type).toLowerCase() === qType);
      }

      if (wrongSubject || wrongType) {
        const invalidCount = allQs.length;
        console.warn(`[subject-quiz/start] Data inconsistency detected`, {
          subject_id,
          question_type: qType,
          requestedCount: pick.length,
          validCount: invalidCount,
          wrongSubject: wrongSubject ? wrongSubject.id : null,
          wrongType: wrongType ? wrongType.id : null
        });
      }

      const byId = new Map(allQs.map((q) => [q.id, q]));
      questions = pick.map((id) => byId.get(id)).filter(Boolean);

      // Attach options only
      for (const q of questions) {
        const { data: options, error: optErr } = await supabase
          .from("question_options")
          .select("option_key, content")
          .eq("question_id", q.id)
          .order("option_key");
        if (optErr) throw optErr;
        q.options = options || [];
        // Remove subject_id from response
        delete q.subject_id;
      }
    }

    // 5) Create attempt (started) - store chapter_id null for subject quiz
    const { data: attempt, error: insErr } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id,
        chapter_id: null,
        total_questions: questions.length,
        started_at: new Date(),
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // 6) Persist selected questions in quiz_answers with null selections
    if (attempt?.id && pick.length > 0) {
      // Fetch correct keys for these questions
      let corrects = [];
      for (const part of chunk(pick, 50)) {
        const { data: cChunk, error: cErr } = await supabase
          .from("correct_answers")
          .select("question_id, correct_key")
          .in("question_id", part);
        if (cErr) throw cErr;
        if (cChunk) corrects = corrects.concat(cChunk);
      }
      
      if (corrects.length > 0) {
        const correctMap = new Map(corrects.map(c => [String(c.question_id), c.correct_key]));
        
        // Bulk insert into quiz_answers
        const { error: ansErr } = await supabase
          .from("quiz_answers")
          .insert(pick.map(qId => ({
            attempt_id: attempt.id,
            question_id: qId,
            selected_key: null,
            correct_key: correctMap.get(String(qId)) || null,
            is_correct: false
          })));
        
        if (ansErr) {
          console.error('[subject-quiz/start] Failed to persist questions:', ansErr);
        }
      }
    }

    return Response.json(
      {
        success: true,
        attempt_id: attempt?.id,
        scope: { subject_id, question_type: qType },
        total: questions.length,
        requested: qLimit,
        exhausted: questions.length < qLimit,
        data: questions,
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}


