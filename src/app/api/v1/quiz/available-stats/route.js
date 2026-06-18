import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { chapter_id, topic_ids, multi_chapter_ids, user_id } = await req.json();

        if (!user_id) {
            return NextResponse.json({ success: false, message: 'user_id is required' }, { status: 400 });
        }

        // 1. Build the base query to fetch all candidates for the given scope
        // Determine subject_id for integrity filtering
        let subject_id = null;
        if (chapter_id) {
            const { data: c } = await supabase.from('chapters').select('subject_id').eq('id', chapter_id).single();
            subject_id = c?.subject_id;
        } else if (topic_ids && topic_ids.length > 0) {
            const { data: t } = await supabase.from('topics').select('chapter_id').eq('id', topic_ids[0]).single();
            if (t?.chapter_id) {
                const { data: c } = await supabase.from('chapters').select('subject_id').eq('id', t.chapter_id).single();
                subject_id = c?.subject_id;
            }
        } else if (multi_chapter_ids && multi_chapter_ids.length > 0) {
            const { data: c } = await supabase.from('chapters').select('subject_id').eq('id', multi_chapter_ids[0]).single();
            subject_id = c?.subject_id;
        }

        let qQuery = supabase.from('questions').select('id, question_type');

        if (subject_id) {
            qQuery = qQuery.eq('subject_id', subject_id);
        }

        if (chapter_id) {
            qQuery = qQuery.eq('chapter_id', chapter_id);
        } else if (topic_ids && Array.isArray(topic_ids) && topic_ids.length > 0) {
            qQuery = qQuery.in('topic_id', topic_ids);
        } else if (multi_chapter_ids && Array.isArray(multi_chapter_ids) && multi_chapter_ids.length > 0) {
            qQuery = qQuery.in('chapter_id', multi_chapter_ids);
        } else {
            return NextResponse.json({ success: false, message: 'Invalid scope provided' }, { status: 400 });
        }

        const { data: qData, error: qErr } = await qQuery;
        if (qErr) throw qErr;

        if (!qData || qData.length === 0) {
            return NextResponse.json({ 
                success: true, 
                stats: { easy: 0, moderate: 0, difficult: 0, mixed: 0 }, 
                unattempted: { easy: 0, moderate: 0, difficult: 0, mixed: 0 } 
            });
        }

        // 2. Fetch ALL previously attempted question IDs for this user
        // Fetch both quiz attempts and test attempts to check all resources
        const [quizAtt, testAtt] = await Promise.all([
            supabase.from('quiz_attempts').select('id').eq('user_id', user_id).limit(10000),
            supabase.from('test_attempts').select('id').eq('user_id', user_id).limit(10000)
        ]);

        const quizAttemptIds = (quizAtt.data || []).map(a => a.id).filter(Boolean);
        const testAttempts = testAtt.data || [];

        const attemptedIds = new Set();

        // 2a) Fetch quiz answers from quiz_attempts in chunks of 50 to avoid query string limits
        if (quizAttemptIds.length > 0) {
            const chunkSize = 50;
            for (let i = 0; i < quizAttemptIds.length; i += chunkSize) {
                const chunk = quizAttemptIds.slice(i, i + chunkSize);
                const { data: answers, error: ansErr } = await supabase
                    .from('quiz_answers')
                    .select('question_id')
                    .in('attempt_id', chunk)
                    .limit(50000);
                if (!ansErr && answers) {
                    answers.forEach(ans => attemptedIds.add(ans.question_id));
                }
            }
        }

        // 2b) Fetch test answers from test_attempts in chunks of 50 to avoid query string limits
        if (testAttempts.length > 0) {
            const testIds = testAttempts.map(t => t.id);
            const chunkSize = 50;
            for (let i = 0; i < testIds.length; i += chunkSize) {
                const chunk = testIds.slice(i, i + chunkSize);
                const { data: testAnswersData, error: tErr } = await supabase
                    .from('test_attempts')
                    .select('answers')
                    .in('id', chunk);
                if (!tErr && testAnswersData) {
                    testAnswersData.forEach(tAttempt => {
                        if (Array.isArray(tAttempt.answers)) {
                            tAttempt.answers.forEach(ans => {
                                if (ans.question_id) attemptedIds.add(ans.question_id);
                            });
                        }
                    });
                }
            }
        }

        // 3. Calculate both total bank size and unattempted bank size
        const stats = { easy: 0, moderate: 0, difficult: 0, mixed: 0 };
        const unattempted = { easy: 0, moderate: 0, difficult: 0, mixed: 0 };
        
        qData.forEach(q => {
            let rawType = q.question_type ? q.question_type.toLowerCase() : '';
            
            // Map common synonyms to ensure we don't miss categories
            let mappedType = null;
            if (rawType.includes('easy')) mappedType = 'easy';
            else if (rawType.includes('moderate') || rawType.includes('medium')) mappedType = 'moderate';
            else if (rawType.includes('difficult') || rawType.includes('hard')) mappedType = 'difficult';
            
            // Increment total counts
            stats.mixed += 1;
            if (mappedType && stats[mappedType] !== undefined) {
                stats[mappedType] += 1;
            }

            // Increment unattempted counts
            if (!attemptedIds.has(q.id)) {
                unattempted.mixed += 1;
                if (mappedType && unattempted[mappedType] !== undefined) {
                    unattempted[mappedType] += 1;
                }
            }
        });

        return NextResponse.json({ success: true, stats, unattempted });

    } catch (error) {
        console.error('Quiz Available Stats API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
