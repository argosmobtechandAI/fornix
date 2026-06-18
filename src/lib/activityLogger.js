import { supabase } from "@/lib/supabaseAdmin";

/**
 * Log a university activity
 * @param {string} universityId - UUID of the university profile
 * @param {string} action - Action name (e.g. 'student_deleted', 'exam_created')
 * @param {string} description - Human-readable description
 * @param {string} [targetType] - Type of target ('student', 'exam', 'question', 'bulk_import')
 * @param {string} [targetId] - ID(s) of the target
 * @param {object} [metadata] - Additional JSON metadata
 */
export async function logActivity(universityId, action, description, targetType = null, targetId = null, metadata = {}) {
    try {
        await supabase
            .from("university_activity_logs")
            .insert([{
                university_id: universityId,
                action,
                description,
                target_type: targetType,
                target_id: targetId,
                metadata,
            }]);
    } catch (err) {
        console.error("Failed to log activity:", err);
    }
}
