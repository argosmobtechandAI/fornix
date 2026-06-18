import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { user_id, exam_id } = await req.json();

        if (!user_id || !exam_id) {
            return NextResponse.json({ success: false, message: "user_id and exam_id are required" }, { status: 400 });
        }

        // 1. Verify access (student's active plans against the exam's plan_id)
        const { data: user, error: userErr } = await supabase
            .from("users")
            .select("academic_year")
            .eq("id", user_id)
            .single();

        if (userErr || !user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        // Fetch Exam
        const { data: exam, error: examErr } = await supabase
            .from("university_exams")
            .select(`
                id, name, subjects, description, duration_minutes, status,
                plan_id, academic_year,
                university_profiles (university_name)
            `)
            .eq("id", exam_id)
            .single();

        if (examErr || !exam) {
            return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });
        }

        if (exam.status !== "published") {
            return NextResponse.json({ success: false, message: "Exam is not currently published" }, { status: 403 });
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

        // 2. Check if already attempted
        const { data: attempt, error: attErr } = await supabase
            .from("university_exam_attempts")
            .select("id, score, total_marks")
            .eq("student_id", user_id)
            .eq("exam_id", exam_id)
            .single();

        if (attempt) {
            return NextResponse.json({ success: false, message: "You have already attempted this exam." }, { status: 403 });
        }

        // 3. Fetch questions, omitting correct_option and explanation
        const { data: questions, error: questionsErr } = await supabase
            .from("university_questions")
            .select("id, question, option_a, option_b, option_c, option_d, option_e, option_f, marks")
            .eq("exam_id", exam_id)
            .order("created_at", { ascending: true });

        if (questionsErr) {
            return NextResponse.json({ success: false, message: "Failed to load questions" }, { status: 500 });
        }

        const safeExam = {
            ...exam,
            university_name: exam.university_profiles?.university_name,
        };
        delete safeExam.university_profiles;

        return NextResponse.json({
            success: true,
            exam: safeExam,
            questions: questions || []
        }, { status: 200 });

    } catch (err) {
        console.error("Exam Details Error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
