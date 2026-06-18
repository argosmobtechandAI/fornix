import { supabase } from "@/lib/supabaseAdmin";
import {
  jsonResponse,
  isUuid,
  MIN_PLAN_DAYS,
  MAX_PLAN_DAYS,
  VALID_RELEASE_MODES,
  validateAccessFeatures
} from "@/lib/adminHelpers";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      course_id, name, description = "",
      duration_in_days, price,
      original_price, discount_price, offer_active = false,
      access_features = { 
        videos: true, 
        notes: true, 
        tests: true, 
        ai_explanation: false,
        download_allowed: false 
      },
      device_limit = 1, max_streams = 1, ai_access = false,
      trial_days = 0, auto_renew = false, supports_addons = false,
      release_mode = "instant", download_allowed = false, 
      is_active = true, popular = false, priority_order = 0,
      features_list = [], support_included = false,
      certificate_included = false, community_access = false,
      mentorship = false, project_review = false
    } = body || {};

    // Basic validations
    if (!isUuid(course_id)) return jsonResponse({ success: false, error: "Invalid course_id" }, 422);
    
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return jsonResponse({ success: false, error: "Invalid plan name (minimum 2 characters)" }, 422);
    }
    
    if (description && typeof description !== "string") {
      return jsonResponse({ success: false, error: "Invalid description" }, 422);
    }

    if (!Number.isInteger(duration_in_days) || duration_in_days < MIN_PLAN_DAYS || duration_in_days > MAX_PLAN_DAYS) {
      return jsonResponse({ 
        success: false, 
        error: `Duration must be integer between ${MIN_PLAN_DAYS} and ${MAX_PLAN_DAYS}` 
      }, 422);
    }

    if (typeof price !== "number" && typeof price !== "string") {
      return jsonResponse({ success: false, error: "Invalid price" }, 422);
    }
    
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return jsonResponse({ success: false, error: "Price must be >= 0" }, 422);
    }

    // Validate original and discount prices
    if (original_price != null) {
      const orig = Number(original_price);
      if (isNaN(orig) || orig < 0) {
        return jsonResponse({ success: false, error: "Invalid original_price" }, 422);
      }
    }

    if (discount_price != null) {
      const disc = Number(discount_price);
      if (isNaN(disc) || disc < 0) {
        return jsonResponse({ success: false, error: "Invalid discount_price" }, 422);
      }
      
      const basePrice = original_price != null ? Number(original_price) : priceNum;
      if (disc >= basePrice) {
        return jsonResponse({ 
          success: false, 
          error: "Discount price must be lower than original/selling price" 
        }, 422);
      }
    }

    // Validate access features
    if (!validateAccessFeatures(access_features)) {
      return jsonResponse({ success: false, error: "Invalid access_features structure" }, 422);
    }

    // Validate device limit and streams (allow -1 for unlimited devices)
    if (!Number.isInteger(device_limit) || device_limit < -1 || device_limit === 0 || device_limit > 10) {
      return jsonResponse({ 
        success: false, 
        error: "device_limit must be integer -1 (unlimited) or 1-10" 
      }, 422);
    }

    if (!Number.isInteger(max_streams) || max_streams < 1 || max_streams > 5) {
      return jsonResponse({ 
        success: false, 
        error: "max_streams must be integer 1-5" 
      }, 422);
    }

    // Validate trial days
    if (!Number.isInteger(trial_days) || trial_days < 0 || trial_days > 365) {
      return jsonResponse({ success: false, error: "trial_days must be 0-365" }, 422);
    }

    // Validate release mode
    if (!VALID_RELEASE_MODES.includes(release_mode)) {
      return jsonResponse({ 
        success: false, 
        error: `Invalid release_mode. Must be one of: ${VALID_RELEASE_MODES.join(', ')}` 
      }, 422);
    }

    // Validate priority order
    if (!Number.isInteger(priority_order) || priority_order < 0) {
      return jsonResponse({ success: false, error: "priority_order must be non-negative integer" }, 422);
    }

    // Validate features_list is an array
    if (!Array.isArray(features_list)) {
      return jsonResponse({ success: false, error: "features_list must be an array" }, 422);
    }

    // Course existence check
    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", course_id)
      .maybeSingle();
    
    if (!course) {
      return jsonResponse({ success: false, error: "Course not found" }, 404);
    }

    // Unique plan name per course
    const { data: dup } = await supabase
      .from("plans")
      .select("id")
      .eq("course_id", course_id)
      .ilike("name", name.trim())
      .maybeSingle();

    if (dup) {
      return jsonResponse({ 
        success: false, 
        error: "Plan name already exists for this course" 
      }, 409);
    }

    // Prepare insert object with all fields
    const insertObj = {
      course_id,
      name: name.trim(),
      description: description ? description.trim() : null,
      duration_in_days,
      price: priceNum,
      original_price: original_price != null ? Number(original_price) : null,
      discount_price: discount_price != null ? Number(discount_price) : null,
      offer_active: !!offer_active,
      access_features,
      device_limit,
      max_streams,
      ai_access: !!ai_access,
      trial_days,
      auto_renew: !!auto_renew,
      supports_addons: !!supports_addons,
      release_mode,
      download_allowed: !!download_allowed,
      is_active: !!is_active,
      popular: !!popular,
      priority_order,
      features_list: features_list.length > 0 ? features_list : null,
      support_included: !!support_included,
      certificate_included: !!certificate_included,
      community_access: !!community_access,
      mentorship: !!mentorship,
      project_review: !!project_review
    };

    // Insert into database
    const { data: newPlan, error } = await supabase
      .from("plans")
      .insert([insertObj])
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      return jsonResponse({ success: false, error: error.message }, 500);
    }

    return jsonResponse({ success: true, plan: newPlan }, 201);

  } catch (err) {
    console.error("API error:", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}