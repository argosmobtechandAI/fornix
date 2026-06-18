import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { topic_ids, question_type, limit = 30, user_id } = await req.json();

    if (!Array.isArray(topic_ids) || topic_ids.length === 0 || !question_type) {
      return NextResponse.json(
        { success: false, message: 'topic_ids and question_type are required' },
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

    const { data: questionsData, error } = await supabase
      .from('questions')
      .select('id, question_text, question_type, explanation, question_image_url, female_explanation_audio_url, male_explanation_audio_url, explanation_audio_urls, topic_id')
      .in('topic_id', topic_ids)
      .eq('question_type', question_type)
      .limit(limit);

    if (error) throw error;

    // Defensive check: ensure all questions actually match the requested topic IDs
    const questions = (questionsData || []).filter(q => topic_ids.includes(String(q.topic_id)));

    if (questions.length < limit) {
        return NextResponse.json(
            { success: false, error: `Only ${questions.length} questions available. Please enter ${questions.length} or fewer questions.` },
            { status: 400 }
        );
    }

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
    
    // Create attempt record for tracking (persistence)
    let attemptId = null;
    if (user_id) {
       const { data: attempt, error: attemptErr } = await supabase
         .from('quiz_attempts')
         .insert({
           user_id,
           total_questions: questions?.length || 0,
           started_at: new Date(),
         })
         .select('id')
         .single();
       
       if (!attemptErr && attempt) {
          attemptId = attempt.id;
          
          // Persist selected questions in quiz_answers with null selections
          if (questions.length > 0) {
            const { error: ansErr } = await supabase
              .from('quiz_answers')
              .insert(questions.map(q => ({
                attempt_id: attemptId,
                question_id: q.id,
                selected_key: null,
                correct_key: q.correct_answer,
                is_correct: false
              })));
            
            if (ansErr) {
              console.error('[topic-quizzes] Failed to persist questions:', ansErr);
            }
          }
       }
    }

    return NextResponse.json({
      success: true,
      total: questions?.length || 0,
      attempt_id: attemptId,
      data: questions || [],
    });
  } catch (err) {
    console.error('Topic Quiz API Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
