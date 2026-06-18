import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(req) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return Response.json({ success: false, error: "Invalid token" }, { status: 401 });
        }

        if (decoded.role !== "university") {
            return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        // 1. Get university profile
        const { data: profile, error: profileErr } = await supabase
            .from("university_profiles")
            .select("id")
            .eq("user_id", decoded.sub)
            .single();

        if (profileErr || !profile) {
            return Response.json({ success: false, error: "University profile not found" }, { status: 404 });
        }

        // 2. Get all students for this university
        const { data: students, error: studentsErr } = await supabase
            .from("users")
            .select("id, full_name, email, phone, is_active, created_at")
            .eq("university_id", profile.id)
            .order("full_name", { ascending: true });

        if (studentsErr) throw studentsErr;
        if (!students || students.length === 0) {
            return Response.json({ success: true, data: [] });
        }

        const studentIds = students.map((s) => s.id);
        const analyticsMap = new Map();

        // Initialize analytics map
        for (const s of students) {
            analyticsMap.set(s.id, {
                id: s.id,
                full_name: s.full_name,
                email: s.email,
                phone: s.phone,
                is_active: s.is_active,
                created_at: s.created_at,
                total_quiz_attempts: 0,
                total_test_attempts: 0,
                total_questions: 0,
                total_correct: 0,
                total_score: 0,
                score_entries: 0,
            });
        }

        // Helper to fetch in chunks to avoid URL too long / postgrest limits
        const chunkSize = 200;

        // 3. Fetch Quiz Attempts
        for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            const { data: quizzes } = await supabase
                .from("quiz_attempts")
                .select("user_id, total_questions, correct_answers, score")
                .in("user_id", chunk);

            if (quizzes) {
                for (const q of quizzes) {
                    const stats = analyticsMap.get(q.user_id);
                    if (stats) {
                        stats.total_quiz_attempts++;
                        stats.total_questions += Number(q.total_questions) || 0;
                        stats.total_correct += Number(q.correct_answers) || 0;
                        if (typeof q.score === "number") {
                            stats.total_score += q.score;
                            stats.score_entries++;
                        }
                    }
                }
            }
        }

        // 4. Fetch Test Attempts
        for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            const { data: tests } = await supabase
                .from("test_attempts")
                .select("user_id, total_questions, correct_answers, score")
                .in("user_id", chunk);

            if (tests) {
                for (const t of tests) {
                    const stats = analyticsMap.get(t.user_id);
                    if (stats) {
                        stats.total_test_attempts++;
                        stats.total_questions += Number(t.total_questions) || 0;
                        stats.total_correct += Number(t.correct_answers) || 0;
                        if (typeof t.score === "number") {
                            stats.total_score += t.score;
                            stats.score_entries++;
                        }
                    }
                }
            }
        }

        // 5. Finalize Stats & Rank
        const results = Array.from(analyticsMap.values()).map(s => {
            s.total_attempts = s.total_quiz_attempts + s.total_test_attempts;
            s.accuracy = s.total_questions > 0 ? Math.round((s.total_correct / s.total_questions) * 100) : 0;
            s.average_score = s.score_entries > 0 ? Math.round(s.total_score / s.score_entries) : 0;
            return s;
        });

        // Rank by average score descending, then by total attempts descending
        results.sort((a, b) => {
            if (b.average_score !== a.average_score) return b.average_score - a.average_score;
            return b.total_attempts - a.total_attempts;
        });

        // Assign rank number
        results.forEach((r, idx) => {
            r.university_rank = idx + 1;
        });

        return Response.json({ success: true, data: results });

    } catch (err) {
        console.error("University Analytics Error:", err);
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}
