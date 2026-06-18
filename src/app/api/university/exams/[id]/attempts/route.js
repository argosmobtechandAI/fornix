import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// GET: List all attempts for an exam
export async function GET(req, { params }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        if (!token) {
            return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
            return Response.json({ success: false, error: "Invalid token" }, { status: 401 });
        }

        if (decoded.role !== "university") {
            return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const { data: profile } = await supabase
            .from("university_profiles")
            .select("id")
            .eq("user_id", decoded.sub)
            .single();

        if (!profile) {
            return Response.json({ success: false, error: "University profile not found" }, { status: 404 });
        }

        const { id } = await params;

        // Verify exam belongs to this university
        const { data: exam } = await supabase
            .from("university_exams")
            .select("id, name")
            .eq("id", id)
            .eq("university_id", profile.id)
            .single();

        if (!exam) {
            return Response.json({ success: false, error: "Exam not found" }, { status: 404 });
        }

        // Get all attempts with student info
        const { data: attempts, error } = await supabase
            .from("university_exam_attempts")
            .select(`
        id,
        score,
        total_marks,
        started_at,
        completed_at,
        created_at,
        student:users!student_id (
          id, full_name, email
        )
      `)
            .eq("exam_id", id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Format the attempts
        const formattedAttempts = (attempts || []).map(a => ({
            id: a.id,
            student_name: a.student?.full_name || "Unknown",
            student_email: a.student?.email || "",
            score: a.score,
            total_marks: a.total_marks,
            result: a.total_marks > 0 ? `${Math.round((a.score / a.total_marks) * 100)}%` : "N/A",
            started_at: a.started_at,
            completed_at: a.completed_at,
            created_at: a.created_at,
        }));

        return Response.json({
            success: true,
            data: {
                exam_name: exam.name,
                attempts: formattedAttempts,
            },
        });
    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}
