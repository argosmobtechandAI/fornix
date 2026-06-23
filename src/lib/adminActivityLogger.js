import { supabase } from "@/lib/supabaseAdmin";

/**
 * Log an admin activity action.
 * @param {object} opts
 * @param {string} opts.adminId       - Admin user ID (from JWT)
 * @param {string} opts.adminEmail    - Admin email (from JWT)
 * @param {string} opts.action        - Action key e.g. 'course_cloned', 'course_created', 'course_deleted'
 * @param {string} opts.description   - Human-readable description of the action
 * @param {string} [opts.targetType]  - Type of affected resource: 'course', 'subject', 'question', etc.
 * @param {string} [opts.targetId]    - ID of the affected record
 * @param {string} [opts.targetName]  - Name of the affected record
 * @param {object} [opts.metadata]    - Extra JSON (e.g. clone summary counts)
 */
export async function logAdminActivity({
  adminId = null,
  adminEmail = null,
  action,
  description,
  targetType = null,
  targetId = null,
  targetName = null,
  metadata = {},
}) {
  try {
    await supabase.from("admin_activity_logs").insert([{
      admin_id: adminId,
      admin_email: adminEmail,
      action,
      description,
      target_type: targetType,
      target_id: targetId,
      target_name: targetName,
      metadata,
    }]);
  } catch (err) {
    // Never block main flow due to logging failures
    console.error("❌ Failed to log admin activity:", err);
  }
}
