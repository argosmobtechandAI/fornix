import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { sendPushNotification } from "@/lib/pushNotifications";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req) {
  try {
    const { user_id, chapter_id, answers, time_taken_seconds } = await req.json();

    if (!user_id || !answers?.length) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    // Check if user has an active paid subscription.
    // If not, treat them as a free user and enforce a 2-quiz limit.
    let hasActiveSubscription = false;
    try {
      const nowIso = new Date().toISOString();
      const { data: subs, error: subErr } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', user_id)
        .neq('is_active', false)
        .gte('end_date', nowIso)
        .order('end_date', { ascending: false })
        .limit(1);

      if (!subErr && (subs || []).length > 0) {
        hasActiveSubscription = true;
      }
    } catch (e) {
      // If subscription check fails, don't block the quiz; treat as paid.
      hasActiveSubscription = true;
    }

    if (!hasActiveSubscription) {
      const { count: attemptCount, error: countErr } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id);

      if (!countErr && typeof attemptCount === 'number' && attemptCount >= 50) {
        return NextResponse.json(
          {
            success: false,
            error: 'FREE_QUIZ_LIMIT_REACHED',
            message: 'Free users can attempt only 50 quizzes. Please purchase a plan to continue.',
          },
          { status: 403 }
        );
      }
    }

    // Create attempt
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id,
        chapter_id,
        total_questions: answers.length,
        time_taken_seconds,
        completed_at: new Date(),
      })
      .select()
      .single();

    // Fetch question marks/negative_marks and correct keys in bulk
    const questionIds = answers.map(a => a.question_id).filter(Boolean);
    
    let qs = [];
    let corrects = [];
    const chunkSize = 50; // Small chunk size to keep URLs short

    for (const part of chunk(questionIds, chunkSize)) {
      const { data: qChunk, error: qErr } = await supabase
        .from('questions')
        .select('id, marks, negative_marks')
        .in('id', part);
      if (qErr) throw qErr;
      if (qChunk) qs = qs.concat(qChunk);

      const { data: cChunk, error: cErr } = await supabase
        .from('correct_answers')
        .select('question_id, correct_key')
        .in('question_id', part);
      if (cErr) throw cErr;
      if (cChunk) corrects = corrects.concat(cChunk);
    }

    const qById = new Map((qs || []).map(q => [q.id, q]));
    const correctMap = new Map((corrects || []).map(c => [c.question_id, c.correct_key]));

    let correct = 0;
    let obtainedMarks = 0;
    let totalMarks = 0;

    for (const a of answers) {
      const q = qById.get(a.question_id);
      if (!q) continue;

      const ck = correctMap.get(a.question_id) || null;
      const selected = a.selected_key;
      const isCorrect = ck && selected ? ck === selected : false;

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

      await supabase.from('quiz_answers').insert({
        attempt_id: attempt.id,
        question_id: a.question_id,
        selected_key: selected,
        correct_key: ck,
        is_correct: isCorrect,
      });
    }

    const score = totalMarks > 0
      ? Math.round((Math.max(0, obtainedMarks) / totalMarks) * 100)
      : 0;

    await supabase
      .from('quiz_attempts')
      .update({ correct_answers: correct, score })
      .eq('id', attempt.id);

    // Send push notification with the score
    sendPushNotification(
      user_id,
      "Quiz Completed! 📝",
      `You scored ${score}% (${obtainedMarks}/${totalMarks} marks). Tap to view detailed answers.`,
      "exam"
    ).catch(e => console.error("Quiz Push Failed:", e));

    return NextResponse.json({
      success: true,
      score,
      obtained_marks: obtainedMarks,
      total_marks: totalMarks,
      correct,
      total: answers.length,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
