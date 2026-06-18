import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { user_id } = await req.json();

        if (!user_id) {
            return NextResponse.json({ success: false, message: "user_id is required" }, { status: 400 });
        }

        // 1. Fetch user to get their academic_year
        const { data: user, error: userErr } = await supabase
            .from("users")
            .select("id, academic_year")
            .eq("id", user_id)
            .single();

        if (userErr || !user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        // 2. Fetch active plans via user_subscriptions
        const nowIso = new Date().toISOString();
        const { data: subs, error: subsErr } = await supabase
            .from("user_subscriptions")
            .select("plan_id")
            .eq("user_id", user_id)
            .neq("is_active", false)
            .gte("end_date", nowIso);

        if (subsErr) {
            return NextResponse.json({ success: false, message: "Failed to fetch subscriptions" }, { status: 500 });
        }

        const planIds = subs.map(s => s.plan_id).filter(Boolean);

        if (planIds.length === 0) {
            // No active plans, so they can't see any plan-restricted university exams
            return NextResponse.json({ success: true, data: [] }, { status: 200 });
        }

        // 3. Fetch university exams based on plan_ids and optional academic_year
        let query = supabase
            .from("university_exams")
            .select(`
                id, name, subjects, description, duration_minutes, status,
                plan_id, academic_year, created_at,
                university_profiles (id, university_name)
            `)
            .eq("status", "published")
            .in("plan_id", planIds);

        const { data: exams, error: examsErr } = await query.order("created_at", { ascending: false });

        if (examsErr) {
            console.error("Exams DB Error:", examsErr);
            return NextResponse.json({ success: false, message: "Failed to fetch exams", error: examsErr }, { status: 500 });
        }

        // 4. Filter exams by academic_year (if the exam enforces one)
        const validExams = exams.filter(exam => {
            if (!exam.academic_year) return true; // Exam doesn't require a specific year
            return exam.academic_year === user.academic_year; // Match year if FMGE
        });

        if (validExams.length === 0) {
            return NextResponse.json({ success: true, data: [] }, { status: 200 });
        }

        // 5. Fetch user's attempts to mark exams as attempted
        const examIds = validExams.map(e => e.id);
        const { data: attempts, error: attErr } = await supabase
            .from("university_exam_attempts")
            .select("exam_id, score, total_marks, created_at")
            .eq("student_id", user_id)
            .in("exam_id", examIds);

        if (attErr) {
            return NextResponse.json({ success: false, message: "Failed to fetch attempts" }, { status: 500 });
        }

        // Map attempts by exam_id
        const attemptMap = {};
        attempts?.forEach(a => {
            attemptMap[a.exam_id] = a;
        });

        // 6. Enrich exams with attempt info
        const displayExams = validExams.map(exam => {
            const attempt = attemptMap[exam.id];
            return {
                ...exam,
                university_name: exam.university_profiles?.university_name || "Unknown University",
                is_attempted: !!attempt,
                attempt_score: attempt ? attempt.score : null,
                attempt_total_marks: attempt ? attempt.total_marks : null,
                attempt_date: attempt ? attempt.created_at : null
            };
        });

        // Clean up nested relationship
        displayExams.forEach(e => delete e.university_profiles);

        return NextResponse.json({ success: true, data: displayExams }, { status: 200 });

    } catch (err) {
        console.error("List Student Exams Error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
