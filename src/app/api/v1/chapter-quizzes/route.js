import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { chapter_id, question_type, limit = 20, user_id } = await req.json();

    if (!chapter_id || !question_type) {
      return NextResponse.json(
        { success: false, message: 'chapter_id and question_type are required' },
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

    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, question_text, question_type, explanation, question_image_url,female_explanation_audio_url,male_explanation_audio_url,explanation_audio_urls')
      .eq('chapter_id', chapter_id)
      .eq('question_type', question_type)
      // .eq('status', 'approved')
      .limit(limit);

    if (error) throw error;

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
    let attempt_id = null;
    const { data: attempt, error: attemptErr } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id,
        chapter_id,
        total_questions: questions?.length || 0,
        started_at: new Date(),
      })
      .select('id')
      .single();
    
    if (!attemptErr && attempt) {
      attempt_id = attempt.id;
      
      // Persist selected questions in quiz_answers with null selections
      const questionIds = (questions || []).map(q => q.id);
      if (questionIds.length > 0) {
        // Fetch correct keys (already fetched in the loop above? No, only in the response. 
        // Let's re-use the ones from the loop for efficiency or fetch them here)
        // Actually, we already have q.correct_answer from the loop at line 81.
        
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
          console.error('[chapter-quizzes] Failed to persist questions:', ansErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: questions?.length || 0,
      attempt_id: attempt_id,
      data: questions || [],
    });
  } catch (err) {
    console.error('Chapter Quiz API Error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
