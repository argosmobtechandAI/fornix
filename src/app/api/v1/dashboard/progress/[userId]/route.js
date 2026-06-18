import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req, { params }) {
    const { userId } = await params;

    if (!userId) {
        return Response.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    try {
        // Fetch Regular Quiz Attempts
        const { data: quizAttempts, error: quizError } = await supabase
            .from('quiz_attempts')
            .select('score, time_taken_seconds, started_at, completed_at, total_questions, correct_answers')
            .eq('user_id', userId);

        if (quizError) throw quizError;

        // Fetch Mock Test Attempts
        const { data: testAttempts, error: testError } = await supabase
            .from('test_attempts')
            .select('score, time_taken_seconds, started_at, completed_at, total_questions, correct_answers')
            .eq('user_id', userId);

        if (testError) throw testError;

        const allAttempts = [...(quizAttempts || []), ...(testAttempts || [])];

        const quizzes_taken = allAttempts.length;

        // Calculate study hours and average score
        let totalSeconds = 0;
        let scoreSum = 0;
        let scoreCount = 0;

        for (const attempt of allAttempts) {
            // Sum explicit or implicitly calculated time difference
            if (attempt.time_taken_seconds) {
                totalSeconds += attempt.time_taken_seconds;
            } else if (attempt.started_at && attempt.completed_at) {
                const start = new Date(attempt.started_at).getTime();
                const end = new Date(attempt.completed_at).getTime();
                if (end > start) {
                    totalSeconds += Math.floor((end - start) / 1000);
                }
            }

            // Derive accurate percentage
            if (attempt.total_questions > 0) {
                scoreSum += (attempt.correct_answers / attempt.total_questions) * 100;
                scoreCount++;
            } else if (attempt.score !== null && attempt.score !== undefined) {
                scoreSum += attempt.score;
                scoreCount++;
            }
        }

        const study_hours = parseFloat((totalSeconds / 3600).toFixed(1));
        const average_score = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;

        return Response.json({
            quizzes_taken,
            study_hours,
            average_score
        }, { status: 200 });

    } catch (error) {
        console.error("Dashboard Progress API Error:", error.message || error);
        return Response.json({ success: false, error: error.message || "Failed to aggregate progress" }, { status: 500 });
    }
}
