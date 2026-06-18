import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { user_id, attempt_id, exam_id } = await req.json();

        if (!user_id || (!attempt_id && !exam_id)) {
            return NextResponse.json({ success: false, message: "user_id and either attempt_id or exam_id are required" }, { status: 400 });
        }

        // 1. Fetch the specific attempt
        let query = supabase
            .from("university_exam_attempts")
            .select(`
                id, exam_id, score, total_marks, answers, created_at,
                university_exams (name, subjects, duration_minutes)
            `)
            .eq("student_id", user_id);

        if (attempt_id) {
            query = query.eq("id", attempt_id);
        } else {
            query = query.eq("exam_id", exam_id).order("created_at", { ascending: false }).limit(1);
        }

        const { data: attempt, error: attErr } = await query.single();

        if (attErr || !attempt) {
            return NextResponse.json({ success: false, message: "Exam attempt not found" }, { status: 404 });
        }

        // 2. Fetch all questions for this exam (including correct answers and explanations this time)
        const { data: questions, error: questionsErr } = await supabase
            .from("university_questions")
            .select("id, question, option_a, option_b, option_c, option_d, option_e, option_f, correct_option, marks, explanation")
            .eq("exam_id", attempt.exam_id)
            .order("created_at", { ascending: true });

        if (questionsErr) {
            return NextResponse.json({ success: false, message: "Failed to load questions for review" }, { status: 500 });
        }

        // 3. Format response, merging student's submitted answer with the actual question
        const formattedQuestions = (questions || []).map(q => {
            const studentAnswer = attempt.answers?.[q.id] || null;
            const isCorrect = studentAnswer && studentAnswer.toLowerCase() === q.correct_option.toLowerCase();

            return {
                ...q,
                student_answer: studentAnswer,
                is_correct: isCorrect,
                earned_marks: isCorrect ? q.marks : 0
            };
        });

        // Calculate some basic stats
        const correctCount = formattedQuestions.filter(q => q.is_correct).length;
        const totalCount = formattedQuestions.length;
        const skippedCount = formattedQuestions.filter(q => !q.student_answer).length;
        const incorrectCount = totalCount - correctCount - skippedCount;

        return NextResponse.json({
            success: true,
            attempt: {
                attempt_id: attempt.id,
                exam_name: attempt.university_exams?.name,
                exam_subjects: attempt.university_exams?.subjects,
                score: attempt.score,
                total_marks: attempt.total_marks,
                completed_at: attempt.created_at,
                stats: {
                    correct: correctCount,
                    incorrect: incorrectCount,
                    skipped: skippedCount,
                    total: totalCount
                }
            },
            questions_review: formattedQuestions
        }, { status: 200 });

    } catch (err) {
        console.error("Exam Result Error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
