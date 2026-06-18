import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse } from "@/lib/adminHelpers";

export async function GET(req) {
    try {
        const checks = {};
        const tbs = ["mock_test_results", "question_attempts", "video_progress", "subject_progress", "chapter_progress"];
        for (const tb of tbs) {
            const { data, error } = await supabase.from(tb).select("id").limit(1);
            checks[tb] = error ? error.message : "Exists";
        }

        // Try to get structure of mock_test_results
        const { data: mtData } = await supabase.from("mock_test_results").select("*").limit(1);

        return jsonResponse({
            success: true,
            checks,
            mtSample: mtData ? mtData[0] : null
        }, 200);

    } catch (err) {
        return jsonResponse({ success: false, error: err.message }, 500);
    }
}
