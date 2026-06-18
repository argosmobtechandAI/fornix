import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse, isUuid, validateAccessFeatures } from "@/lib/adminHelpers";

export async function POST(req) {
  try {
    const body = await req.json();
    const { plan_id, name, price, access_features = {} } = body || {};

    if (!isUuid(plan_id)) return jsonResponse({ success: false, error: "Invalid plan_id" }, 422);
    if (!name || typeof name !== "string") return jsonResponse({ success: false, error: "Invalid name" }, 422);
    if (typeof price !== "number" && typeof price !== "string") return jsonResponse({ success: false, error: "Invalid price" }, 422);
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) return jsonResponse({ success: false, error: "Price must be >= 0" }, 422);

    if (!validateAccessFeatures(access_features)) return jsonResponse({ success: false, error: "Invalid access_features" }, 422);

    // plan exists
    const { data: plan } = await supabase.from("plans").select("id, supports_addons").eq("id", plan_id).maybeSingle();
    if (!plan) return jsonResponse({ success: false, error: "Plan not found" }, 404);
    if (!plan.supports_addons) return jsonResponse({ success: false, error: "Plan does not support addons" }, 409);

    const { data, error } = await supabase.from("plan_addons").insert([{
      plan_id, name: name.trim(), price: priceNum, access_features, is_active: true
    }]).select().single();

    if (error) return jsonResponse({ success: false, error: error.message }, 500);
    return jsonResponse({ success: true, addon: data }, 201);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
