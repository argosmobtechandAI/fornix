import { supabase } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

function toDateKey(dt) {
    if (!dt) return null;
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export async function GET(req, { params }) {
    try {
        const { id } = await params;

        if (!id) return Response.json({ success: false, error: "Student ID required" }, { status: 400 });

        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "university") return Response.json({ success: false, error: "Forbidden" }, { status: 403 });

        const { data: profile } = await supabase.from("university_profiles").select("id").eq("user_id", decoded.sub).single();
        if (!profile) return Response.json({ success: false, error: "Profile not found" }, { status: 404 });

        // Verify student belongs to this university
        const { data: student } = await supabase.from("users").select("id, university_id, full_name, email").eq("id", id).single();
        if (!student || student.university_id !== profile.id) {
            return Response.json({ success: false, error: "Student not found or unauthorized" }, { status: 404 });
        }

        // --- Analytics Gathering ---

        // 1. Quizzes
        const { data: quizAttempts } = await supabase
            .from("quiz_attempts")
            .select("id, total_questions, correct_answers, score, chapter_id, started_at, completed_at")
            .eq("user_id", id)
            .order("completed_at", { ascending: false });

        // 2. Tests
        const { data: testAttempts } = await supabase
            .from("test_attempts")
            .select(`
        id, mock_test_id, total_questions, correct_answers, score, status, started_at, completed_at,
        mock_tests (id, title)
      `)
            .eq("user_id", id)
            .order("completed_at", { ascending: false });

        // --- Aggregation ---
        let quizTotalAttempts = 0;
        let quizTotalQuestions = 0;
        let quizTotalCorrect = 0;
        let quizTotalScore = 0;
        let quizScoreCount = 0;

        let testTotalAttempts = 0;
        let testTotalQuestions = 0;
        let testTotalCorrect = 0;
        let testTotalScore = 0;
        let testScoreCount = 0;

        const perDate = new Map();

        for (const q of quizAttempts || []) {
            quizTotalAttempts++;
            const tq = Number(q.total_questions) || 0;
            const ca = Number(q.correct_answers) || 0;
            quizTotalQuestions += tq;
            quizTotalCorrect += ca;
            if (typeof q.score === "number") {
                quizTotalScore += q.score;
                quizScoreCount++;
            }

            const dateTs = q.completed_at || q.started_at;
            const dKey = toDateKey(dateTs);
            if (dKey) {
                if (!perDate.has(dKey)) perDate.set(dKey, { date: dKey, quiz: 0, test: 0, scoreSum: 0, scoreCount: 0 });
                const d = perDate.get(dKey);
                d.quiz++;
                if (typeof q.score === "number") {
                    d.scoreSum += q.score;
                    d.scoreCount++;
                }
            }
        }

        const testDetails = [];
        for (const t of testAttempts || []) {
            testTotalAttempts++;
            const tq = Number(t.total_questions) || Number(t.mock_tests?.total_questions) || 0;
            const ca = Number(t.correct_answers) || 0;
            testTotalQuestions += tq;
            testTotalCorrect += ca;
            if (typeof t.score === "number") {
                testTotalScore += t.score;
                testScoreCount++;
            }

            const dateTs = t.completed_at || t.started_at;
            const dKey = toDateKey(dateTs);
            if (dKey) {
                if (!perDate.has(dKey)) perDate.set(dKey, { date: dKey, quiz: 0, test: 0, scoreSum: 0, scoreCount: 0 });
                const d = perDate.get(dKey);
                d.test++;
                if (typeof t.score === "number") {
                    d.scoreSum += t.score;
                    d.scoreCount++;
                }
            }

            testDetails.push({
                id: t.id,
                title: t.mock_tests?.title || "Unknown Test",
                score: t.score,
                total_questions: tq,
                correct: ca,
                date: t.completed_at || t.started_at
            });
        }

        const timeline = Array.from(perDate.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({
                date: d.date,
                attempts: d.quiz + d.test,
                avg_score: d.scoreCount ? Math.round(d.scoreSum / d.scoreCount) : 0
            }));

        return Response.json({
            success: true,
            student: { id: student.id, full_name: student.full_name, email: student.email },
            summary: {
                total_attempts: quizTotalAttempts + testTotalAttempts,
                quiz_attempts: quizTotalAttempts,
                test_attempts: testTotalAttempts,
                total_questions: quizTotalQuestions + testTotalQuestions,
                total_correct: quizTotalCorrect + testTotalCorrect,
                accuracy: (quizTotalQuestions + testTotalQuestions) > 0 ? Math.round(((quizTotalCorrect + testTotalCorrect) / (quizTotalQuestions + testTotalQuestions)) * 100) : 0,
                average_score: (quizScoreCount + testScoreCount) > 0 ? Math.round(((quizTotalScore + testTotalScore) / (quizScoreCount + testScoreCount))) : 0,
            },
            tests: testDetails,
            timeline
        });

    } catch (err) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}
