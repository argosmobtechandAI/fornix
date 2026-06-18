import { supabase } from "@/lib/supabaseAdmin";
import { jsonResponse, isUuid, validateAccessFeatures } from "@/lib/adminHelpers";

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, name, price, access_features, is_active } = body || {};

    if (!isUuid(id)) return jsonResponse({ success: false, error: "Invalid addon id" }, 422);
    if (access_features && !validateAccessFeatures(access_features)) return jsonResponse({ success: false, error: "Invalid access_features" }, 422);

    const updateObj = {};
    if (name) updateObj.name = name.trim();
    if (price != null) {
      const p = Number(price);
      if (isNaN(p) || p < 0) return jsonResponse({ success: false, error: "Invalid price" }, 422);
      updateObj.price = p;
    }
    if (access_features) updateObj.access_features = access_features;
    if (is_active != null) updateObj.is_active = !!is_active;
    updateObj.updated_at = new Date();

    const { data, error } = await supabase.from("plan_addons").update(updateObj).eq("id", id).select().single();
    if (error) return jsonResponse({ success: false, error: error.message }, 500);

    return jsonResponse({ success: true, addon: data }, 200);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
