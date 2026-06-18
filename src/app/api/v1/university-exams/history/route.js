import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { user_id } = await req.json();

        if (!user_id) {
            return NextResponse.json({ success: false, message: "user_id is required" }, { status: 400 });
        }

        // Fetch user attempts joined with exam details
        const { data: attempts, error: attErr } = await supabase
            .from("university_exam_attempts")
            .select(`
                id, score, total_marks, created_at,
                university_exams (id, name, subjects, duration_minutes)
            `)
            .eq("student_id", user_id)
            .order("created_at", { ascending: false });

        if (attErr) {
            console.error("Fetch Exam History Error:", attErr);
            return NextResponse.json({ success: false, message: "Failed to fetch exam history" }, { status: 500 });
        }

        // Format for mobile
        const formattedHistory = (attempts || []).map(a => ({
            attempt_id: a.id,
            score: a.score,
            total_marks: a.total_marks,
            completed_at: a.created_at,
            exam_id: a.university_exams?.id,
            exam_name: a.university_exams?.name,
            exam_subjects: a.university_exams?.subjects,
            duration_minutes: a.university_exams?.duration_minutes
        }));

        return NextResponse.json({ success: true, data: formattedHistory }, { status: 200 });

    } catch (err) {
        console.error("Exam History Error:", err);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
