import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { chapter_id, easy = 0, moderate = 0, difficult = 0, user_id } = await req.json();

    if (!chapter_id) {
      return NextResponse.json(
        { success: false, message: 'chapter_id required' },
        { status: 400 }
      );
    }

    // Optional free-user limit: if user_id is provided, enforce 2-attempt cap for free users
    if (user_id) {
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
        // If subscription check fails, don't block quiz; treat as paid.
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
              message:
                'Free users can attempt only 50 quizzes. Please purchase a plan to continue.',
            },
            { status: 403 }
          );
        }
      }
    }

    async function fetchByType(type, limit) {
      if (limit === 0) return [];

      const { data: questions, error } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          question_type,
          explanation,
          question_image_url
        `)
        .eq('chapter_id', chapter_id)
        .eq('question_type', type)
        // .eq('status', 'approved')
        .limit(limit);

      if (error) throw error;

      // Attach options & correct answer
      for (const q of questions || []) {
        const { data: options } = await supabase
          .from('question_options')
          .select('option_key, content')
          .eq('question_id', q.id)
          .order('option_key');

        const { data: correct } = await supabase
          .from('correct_answers')
          .select('correct_key')
          .eq('question_id', q.id)
          .single();

        q.options = options || [];
        q.correct_answer = correct?.correct_key || null;
      }

      return questions || [];
    }

    const questions = [
      ...(await fetchByType('easy', easy)),
      ...(await fetchByType('moderate', moderate)),
      ...(await fetchByType('difficult', difficult)),
    ];

    // Create attempt record for tracking (persistence)
    let attempt_id = null;
    if (user_id && questions.length > 0) {
      const { data: attempt, error: attemptErr } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id,
          chapter_id,
          total_questions: questions.length,
          started_at: new Date(),
        })
        .select('id')
        .single();
      
      if (!attemptErr && attempt) {
        attempt_id = attempt.id;
        
        // Persist selected questions in quiz_answers with null selections
        const { error: ansErr } = await supabase
          .from('quiz_answers')
          .insert(questions.map(q => ({
            attempt_id,
            question_id: q.id,
            selected_key: null,
            correct_key: q.correct_answer,
            is_correct: false
          })));
        
        if (ansErr) {
          console.error('[mixed-quiz] Failed to persist questions:', ansErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: questions.length,
      attempt_id: attempt_id,
      data: questions,
    });
  } catch (err) {
    console.error('Mixed Quiz API Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
