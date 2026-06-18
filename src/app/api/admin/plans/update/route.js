import { supabase } from "@/lib/supabaseAdmin";
import {
  jsonResponse,
  isUuid,
  MIN_PLAN_DAYS,
  MAX_PLAN_DAYS,
  VALID_RELEASE_MODES,
  validateAccessFeatures
} from "@/lib/adminHelpers";

export async function PUT(req) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      description,
      duration_in_days,
      price,
      original_price,
      discount_price,
      offer_active,
      access_features,
      device_limit,
      max_streams,
      ai_access,
      trial_days,
      auto_renew,
      supports_addons,
      release_mode,
      download_allowed,
      is_active,
      popular,
      priority_order,
      features_list,
      support_included,
      certificate_included,
      community_access,
      mentorship,
      project_review
    } = body || {};

    if (!isUuid(id)) {
      return jsonResponse({ success: false, error: "Invalid plan id" }, 422);
    }

    // Load plan to get course_id for uniqueness check
    const { data: plan, error: pErr } = await supabase
      .from("plans")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    
    if (pErr) {
      return jsonResponse({ success: false, error: pErr.message }, 500);
    }
    
    if (!plan) {
      return jsonResponse({ success: false, error: "Plan not found" }, 404);
    }

    // If name provided, check uniqueness within course
    if (name && typeof name === "string") {
      const { data: dup } = await supabase
        .from("plans")
        .select("id")
        .eq("course_id", plan.course_id)
        .ilike("name", name.trim())
        .neq("id", id)
        .maybeSingle();
      
      if (dup) {
        return jsonResponse({ 
          success: false, 
          error: "Plan name already in use for this course" 
        }, 409);
      }
    }

    // Validate duration
    if (duration_in_days != null && 
        (!Number.isInteger(duration_in_days) || 
         duration_in_days < MIN_PLAN_DAYS || 
         duration_in_days > MAX_PLAN_DAYS)) {
      return jsonResponse({ 
        success: false, 
        error: `duration_in_days must be integer between ${MIN_PLAN_DAYS} and ${MAX_PLAN_DAYS}` 
      }, 422);
    }

    // Validate price
    if (price != null) {
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return jsonResponse({ success: false, error: "Price must be >= 0" }, 422);
      }
    }

    // Validate original_price
    if (original_price != null) {
      const origNum = Number(original_price);
      if (isNaN(origNum) || origNum < 0) {
        return jsonResponse({ success: false, error: "Original price must be >= 0" }, 422);
      }
    }

    // Validate discount_price
    if (discount_price != null) {
      const discNum = Number(discount_price);
      if (isNaN(discNum) || discNum < 0) {
        return jsonResponse({ success: false, error: "Discount price must be >= 0" }, 422);
      }
      
      // If both discount and original prices are provided, validate discount < original
      const basePrice = original_price != null ? Number(original_price) : (price != null ? Number(price) : null);
      if (basePrice != null && discNum >= basePrice) {
        return jsonResponse({ 
          success: false, 
          error: "Discount price must be lower than original/selling price" 
        }, 422);
      }
    }

    // Validate access_features
    if (access_features && !validateAccessFeatures(access_features)) {
      return jsonResponse({ success: false, error: "Invalid access_features structure" }, 422);
    }

    // Validate device_limit (allow -1 for unlimited)
    if (device_limit != null && 
        (!Number.isInteger(device_limit) || 
         (device_limit !== -1 && (device_limit < 1 || device_limit > 10)))) {
      return jsonResponse({ 
        success: false, 
        error: "device_limit must be -1 (unlimited) or integer 1-10" 
      }, 422);
    }

    // Validate max_streams
    if (max_streams != null && 
        (!Number.isInteger(max_streams) || 
         max_streams < 1 || 
         max_streams > 5)) {
      return jsonResponse({ 
        success: false, 
        error: "max_streams must be integer 1-5" 
      }, 422);
    }

    // Validate trial_days
    if (trial_days != null && 
        (!Number.isInteger(trial_days) || 
         trial_days < 0 || 
         trial_days > 365)) {
      return jsonResponse({ 
        success: false, 
        error: "trial_days must be integer 0-365" 
      }, 422);
    }

    // Validate release_mode
    if (release_mode && !VALID_RELEASE_MODES.includes(release_mode)) {
      return jsonResponse({ 
        success: false, 
        error: `Invalid release_mode. Must be one of: ${VALID_RELEASE_MODES.join(', ')}` 
      }, 422);
    }

    // Validate priority_order
    if (priority_order != null && 
        (!Number.isInteger(priority_order) || 
         priority_order < 0)) {
      return jsonResponse({ 
        success: false, 
        error: "priority_order must be non-negative integer" 
      }, 422);
    }

    // Validate features_list is an array if provided
    if (features_list != null && !Array.isArray(features_list)) {
      return jsonResponse({ success: false, error: "features_list must be an array" }, 422);
    }

    // Prepare update object
    const updateObj = {
      updated_at: new Date()
    };

    // Add fields if they are provided
    if (name != null) updateObj.name = name.trim();
    if (description != null) updateObj.description = description ? description.trim() : null;
    if (duration_in_days != null) updateObj.duration_in_days = duration_in_days;
    if (price != null) updateObj.price = Number(price);
    if (original_price != null) updateObj.original_price = Number(original_price);
    if (discount_price != null) updateObj.discount_price = Number(discount_price);
    if (offer_active != null) updateObj.offer_active = !!offer_active;
    if (access_features != null) updateObj.access_features = access_features;
    if (device_limit != null) updateObj.device_limit = device_limit;
    if (max_streams != null) updateObj.max_streams = max_streams;
    if (ai_access != null) updateObj.ai_access = !!ai_access;
    if (trial_days != null) updateObj.trial_days = trial_days;
    if (auto_renew != null) updateObj.auto_renew = !!auto_renew;
    if (supports_addons != null) updateObj.supports_addons = !!supports_addons;
    if (release_mode != null) updateObj.release_mode = release_mode;
    if (download_allowed != null) updateObj.download_allowed = !!download_allowed;
    if (is_active != null) updateObj.is_active = !!is_active;
    if (popular != null) updateObj.popular = !!popular;
    if (priority_order != null) updateObj.priority_order = priority_order;
    if (features_list != null) updateObj.features_list = features_list.length > 0 ? features_list : null;
    if (support_included != null) updateObj.support_included = !!support_included;
    if (certificate_included != null) updateObj.certificate_included = !!certificate_included;
    if (community_access != null) updateObj.community_access = !!community_access;
    if (mentorship != null) updateObj.mentorship = !!mentorship;
    if (project_review != null) updateObj.project_review = !!project_review;

    // Update the plan
    const { data, error } = await supabase
      .from("plans")
      .update(updateObj)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      return jsonResponse({ success: false, error: error.message }, 500);
    }

    return jsonResponse({ success: true, plan: data }, 200);

  } catch (err) {
    console.error("API error:", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}