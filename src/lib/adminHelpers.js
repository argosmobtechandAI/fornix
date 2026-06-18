import { supabase } from "@/lib/supabaseAdmin";

export const MIN_PLAN_DAYS = 7;
export const MAX_PLAN_DAYS = 1825; // 5 years
export const VALID_RELEASE_MODES = ['instant', 'scheduled', 'drip', 'locked', 'daily', 'weekly'];
export const VALID_TRANSACTION_MODES = ["upi","card","stripe","apple","google"];

export function jsonResponse(payload, status = 200) {
  return Response.json(payload, { status });
}

export function isUuid(v) {
  if (!v || typeof v !== "string") return false;
  return /^[0-9a-fA-F-]{36}$/.test(v);
}
export function validateAccessFeatures(obj) {
  if (!obj || typeof obj !== "object") return false;
  const acceptedKeys = ['videos', 'notes', 'tests', 'ai_explanation', 'download_allowed'];
  for (const k of Object.keys(obj)) {
    if (!acceptedKeys.includes(k)) return false;
    if (typeof obj[k] !== "boolean") return false;
  }
  return true;
}

export async function createSubscriptionAudit({ user_id, plan_id, action, details }) {
  try {
    await supabase.from("subscription_audit_logs").insert([{
      user_id,
      plan_id,
      action,
      details: details || {},
    }]);
  } catch (err) {
    console.warn("Audit log failed:", err?.message);
  }
}
