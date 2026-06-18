import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { chapter_id, limit = 20, user_id, question_type } = await req.json();

        if (!user_id || !chapter_id) {
            return NextResponse.json(
                { success: false, message: 'user_id and chapter_id are required' },
                { status: 400 }
            );
        }

        const validTypes = ['easy', 'moderate', 'difficult', 'mixed'];
        if (question_type && !validTypes.includes(question_type.toLowerCase())) {
            return NextResponse.json(
                { success: false, message: 'If provided, question_type must be easy, moderate, difficult, or mixed' },
                { status: 400 }
            );
        }

        // Optional free-user limit: if user_id is provided, enforce 50-attempt cap for free users
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

        // 1) Candidate questions for scope (filtered by both chapter and subject for integrity)
        const { data: chapterData } = await supabase
            .from('chapters')
            .select('subject_id')
            .eq('id', chapter_id)
            .single();
        
        const subject_id = chapterData?.subject_id;

        let qQuery = supabase
            .from('questions')
            .select('id, question_type')
            .eq('chapter_id', chapter_id);
        
        if (subject_id) {
            qQuery = qQuery.eq('subject_id', subject_id);
        }

        const { data: allChapterQs, error: qErr } = await qQuery;

        if (qErr) throw qErr;

        const qt = question_type ? question_type.toLowerCase() : 'mixed';

        const candidates = ((allChapterQs || []).filter(q => {
            if (qt === 'mixed') return true;
            const raw = q.question_type ? q.question_type.toLowerCase() : '';
            if (qt === 'easy') return raw.includes('easy');
            if (qt === 'difficult') return raw.includes('difficult') || raw.includes('hard');
            // moderate: explicit moderate/medium, OR questions with no recognized type
            return raw.includes('moderate') || raw.includes('medium')
                || (!raw.includes('easy') && !raw.includes('difficult') && !raw.includes('hard'));
        })).map(x => x.id);

        if (candidates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No questions available for this chapter/difficulty.' },
                { status: 400 }
            );
        }
        // 2) Previously attempted question_ids for user in this chapter
        let attemptedIds = [];
        {
            const { data: attempts } = await supabase
                .from('quiz_attempts')
                .select('id')
                .eq('chapter_id', chapter_id)
                .eq('user_id', user_id);

            const attemptIds = (attempts || []).map((a) => a.id);

            if (attemptIds.length > 0) {
                const { data: answers } = await supabase
                    .from('quiz_answers')
                    .select('question_id')
                    .in('attempt_id', attemptIds);
                attemptedIds = [...new Set((answers || []).map((a) => a.question_id))];
            }
        }

        // 3) Build selection: unattempted questions only
        const setCandidates = new Set(candidates);
        const setAttempted = new Set(attemptedIds);
        const unattempted = [...setCandidates].filter((id) => !setAttempted.has(id));

        // Cap at however many unattempted exist (or the requested limit, whichever is smaller)
        const effectiveLimit = Math.min(limit, unattempted.length);

        if (effectiveLimit === 0) {
            return NextResponse.json(
                { success: false, error: 'ALL_ATTEMPTED', message: 'You have attempted all questions in this chapter. Reset your progress to try again.' },
                { status: 400 }
            );
        }

        // Shuffle helper
        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        shuffle(unattempted);

        // Only serve unattempted questions — never pad with already-attempted ones.
        // If fewer unattempted than requested, serve whatever is left.
        const pick = unattempted.slice(0, effectiveLimit);

        // 4) Fetch question payload (without correct answers)
        let finalQuestions = [];
        if (pick.length > 0) {
            const { data: qs, error } = await supabase
                .from('questions')
                .select('id, question_text, question_type, question_image_url, chapter_id, subject_id')
                .in('id', pick);
            if (error) throw error;

            // Secondary verification: ensure all fetched questions strictly belong to the requested chapter and subject
            const byId = new Map((qs || [])
                .filter(q => {
                    const matchChapter = String(q.chapter_id) === String(chapter_id);
                    const matchSubject = !subject_id || String(q.subject_id) === String(subject_id);
                    return matchChapter && matchSubject;
                })
                .map((q) => [q.id, q]));
            
            finalQuestions = pick.map((id) => byId.get(id)).filter(Boolean);

            // Attach options only (no correct key)
            for (const q of finalQuestions) {
                const { data: options } = await supabase
                    .from('question_options')
                    .select('option_key, content')
                    .eq('question_id', q.id)
                    .order('option_key');
                q.options = options || [];
            }
        }

        // 5) Create attempt (started)
        const { data: attempt, error: attemptErr } = await supabase
            .from('quiz_attempts')
            .insert({
                user_id,
                chapter_id,
                total_questions: finalQuestions.length,
                started_at: new Date(),
            })
            .select('id')
            .single();

        if (attemptErr) throw attemptErr;

        // 6) Persist selected questions in quiz_answers with null selections for refresh recovery
        if (attempt?.id && pick.length > 0) {
            // Fetch correct keys for these questions to pre-populate the session
            const { data: corrects, error: cErr } = await supabase
                .from('correct_answers')
                .select('question_id, correct_key')
                .in('question_id', pick);
            
            if (!cErr && corrects) {
                const correctMap = new Map(corrects.map(c => [String(c.question_id), c.correct_key]));
                
                const { error: ansErr } = await supabase
                    .from('quiz_answers')
                    .insert(pick.map(qId => ({
                        attempt_id: attempt.id,
                        question_id: qId,
                        selected_key: null,
                        correct_key: correctMap.get(String(qId)) || null,
                        is_correct: false
                    })));
                
                if (ansErr) console.error('[amc/chapter-quiz] Failed to persist questions:', ansErr);
            }
        }

        return NextResponse.json({
            success: true,
            attempt_id: attempt?.id,
            total: finalQuestions.length,
            data: finalQuestions,
        });
    } catch (err) {
        console.error('AMC Chapter Quiz Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
