import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { topic_id, user_id, limit = 20, question_type } = await req.json();

        if (!topic_id || !user_id) {
            return NextResponse.json(
                { success: false, message: 'topic_id and user_id are required' },
                { status: 400 }
            );
        }

        // 1) Fetch the PY topic to get the name
        const { data: pyTopic, error: pyErr } = await supabase
            .from('py_topics')
            .select('topic, sub_topics, subject_id')
            .eq('id', topic_id)
            .single();

        if (pyErr || !pyTopic) {
            return NextResponse.json(
                { success: false, message: 'PY Topic not found' },
                { status: 404 }
            );
        }

        // 2) Search for questions that match the topic or sub_topics
        // This is a fuzzy search since there is no direct mapping
        const searchTerms = [pyTopic.topic, ...(pyTopic.sub_topics || [])];
        
        let allCandidates = [];
        
        for (const term of searchTerms) {
            const { data: qs } = await supabase
                .from('questions')
                .select('id, question_text, question_type, explanation, question_image_url, female_explanation_audio_url, male_explanation_audio_url, explanation_audio_urls')
                .ilike('question_text', `%${term}%`)
                .eq('subject_id', pyTopic.subject_id)
                .limit(limit);
            
            if (qs) {
                allCandidates = [...allCandidates, ...qs];
            }
        }

        // Remove duplicates
        const uniqueCandidates = Array.from(new Map(allCandidates.map(q => [q.id, q])).values());

        if (uniqueCandidates.length === 0) {
            return NextResponse.json(
                { success: false, message: 'No practice questions found for this topic yet.' },
                { status: 404 }
            );
        }

        // Shuffle and limit
        const finalSelection = uniqueCandidates
            .sort(() => Math.random() - 0.5)
            .slice(0, limit);

        // Fetch options and correct answers for the selected questions
        for (const q of finalSelection) {
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
            
            // For the quiz taking page, it expects 'question' instead of 'question_text' sometimes
            q.question = q.question_text;
        }

        // 3) Create attempt record
        const { data: attempt, error: attemptErr } = await supabase
            .from('quiz_attempts')
            .insert({
                user_id,
                total_questions: finalSelection.length,
                started_at: new Date(),
                // Store metadata if needed
            })
            .select('id')
            .single();

        if (attemptErr) throw attemptErr;

        // 4) Persist selected questions in quiz_answers
        if (finalSelection.length > 0) {
            const { error: ansErr } = await supabase
                .from('quiz_answers')
                .insert(finalSelection.map(q => ({
                    attempt_id: attempt.id,
                    question_id: q.id,
                    selected_key: null,
                    correct_key: q.correct_answer,
                    is_correct: false
                })));
            
            if (ansErr) {
                console.error('[pyt-quiz] Failed to persist questions:', ansErr);
            }
        }

        return NextResponse.json({
            success: true,
            attempt_id: attempt.id,
            total: finalSelection.length,
            data: finalSelection,
        });

    } catch (err) {
        console.error('PYT Quiz Start Error:', err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
