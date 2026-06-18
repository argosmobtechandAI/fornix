import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/pushNotifications";

export async function POST(req) {
    try {
        const { user_id, exam_id, answers } = await req.json();

        if (!user_id || !exam_id || !answers) {
            return NextResponse.json({ success: false, message: "user_id, exam_id, and answers object are required" }, { status: 400 });
        }

        // 1. Verify access and duplicate attempt
        const { data: attemptExists } = await supabase
            .from("university_exam_attempts")
            .select("id, score, total_marks, answers, created_at")
            .eq("student_id", user_id)
            .eq("exam_id", exam_id)
            .single();

        if (attemptExists) {
            // Already attempted. Fetch full questions, format them, and return.
            const { data: existingQuestions } = await supabase
                .from("university_questions")
                .select("id, question, option_a, option_b, option_c, option_d, option_e, option_f, correct_option, marks, explanation")
                .eq("exam_id", exam_id)
                .order("created_at", { ascending: true });

            const formattedExisting = (existingQuestions || []).map(q => {
                const studentAnswer = attemptExists.answers?.[q.id] || null;
                const isCorrect = studentAnswer && studentAnswer.toLowerCase() === q.correct_option.toLowerCase();

                return {
                    ...q,
                    student_answer: studentAnswer,
                    is_correct: isCorrect,
                    earned_marks: isCorrect ? q.marks : 0
                };
            });

            return NextResponse.json({
                success: true,
                message: "You have already attempted this exam.",
                attempt_id: attemptExists.id,
                score: attemptExists.score,
                total_marks: attemptExists.total_marks,
                completed_at: attemptExists.created_at,
                questions_review: formattedExisting
            }, { status: 200 }); // 200 OK since data is returned
        }

        const { data: user, error: userErr } = await supabase
            .from("users")
            .select("academic_year")
            .eq("id", user_id)
            .single();

        if (userErr || !user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const { data: exam, error: examErr } = await supabase
            .from("university_exams")
            .select("plan_id, academic_year, status")
            .eq("id", exam_id)
            .single();

        if (examErr || !exam || exam.status !== "published") {
            return NextResponse.json({ success: false, message: "Exam is unavailable" }, { status: 404 });
        }

        if (exam.academic_year && exam.academic_year !== user.academic_year) {
            return NextResponse.json({ success: false, message: "This exam is not available for your academic year" }, { status: 403 });
        }

        // Verify active plan
        const nowIso = new Date().toISOString();
        const { count, error: subErr } = await supabase
            .from("user_subscriptions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user_id)
            .eq("plan_id", exam.plan_id)
            .neq("is_active", false)
            .gte("end_date", nowIso);

        if (subErr || count === 0) {
            return NextResponse.json({ success: false, message: "You are not enrolled in the plan associated with this exam." }, { status: 403 });
        }

        // 2. Fetch all questions for this exam to evaluate answers
        const { data: questions, error: questionsErr } = await supabase
            .from("university_questions")
            .select("id, question, option_a, option_b, option_c, option_d, option_e, option_f, correct_option, marks, explanation")
            .eq("exam_id", exam_id)
            .order("created_at", { ascending: true });

        if (questionsErr || !questions) {
            return NextResponse.json({ success: false, message: "Failed to load questions for evaluation" }, { status: 500 });
        }

        // 3. Evaluate score
        let score = 0;
        let total_marks = 0;

        questions.forEach(q => {
            total_marks += q.marks;
            const submittedAnswer = answers[q.id];

            if (submittedAnswer && submittedAnswer.toLowerCase() === q.correct_option.toLowerCase()) {
                score += q.marks;
            }
        });

        // 4. Save attempt
        const { data: attemptResult, error: insertErr } = await supabase
            .from("university_exam_attempts")
            .insert([{
                exam_id: exam_id,
                student_id: user_id,
                score: score,
                total_marks: total_marks,
                answers: answers, // JSONB
                completed_at: new Date().toISOString(),
                started_at: new Date().toISOString() // Or optionally accept this from the client payload if they tracked exact time
            }])
            .select("id")
            .single();

        if (insertErr) {
            console.error("Insert Attempt Error:", insertErr);
            return NextResponse.json({ success: false, message: "Failed to save exam attempt" }, { status: 500 });
        }

        // 5. Format the submitted questions structure to return exact right/wrong context
        const formattedQuestions = (questions || []).map(q => {
            const studentAnswer = answers?.[q.id] || null;
            const isCorrect = studentAnswer && studentAnswer.toLowerCase() === q.correct_option.toLowerCase();

            return {
                ...q,
                student_answer: studentAnswer,
                is_correct: isCorrect,
                earned_marks: isCorrect ? q.marks : 0
            };
        });

        // Send push notification with exam score
        const percentage = total_marks > 0 ? Math.round((score / total_marks) * 100) : 0;
        sendPushNotification(
            user_id,
            "University Exam Completed! 🎓",
            `You scored ${score}/${total_marks} marks (${percentage}%). Tap to review your answers.`,
            "exam"
        ).catch(e => console.error("University Exam Push Failed:", e));

        // Return score directly so the UI can show immediate feedback if needed
        return NextResponse.json({
            success: true,
            attempt_id: attemptResult.id,
            score: score,
            total_marks: total_marks,
            completed_at: new Date().toISOString(),
            message: "Exam submitted successfully!",
            questions_review: formattedQuestions
        }, { status: 201 });

    } catch (err) {
        console.error("Exam Attempt Error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
