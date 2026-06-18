import { supabase } from "@/lib/supabaseAdmin";
import { verifyToken } from "@/lib/verifyToken";

export const dynamic = 'force-dynamic';

async function safeUserId(req) {
  try {
    const decoded = await verifyToken(req);
    return decoded?.sub || decoded?.id || null;
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const include_plans = url.searchParams.get("include_plans") !== "0";
    const include_subscription = url.searchParams.get("include_subscription") !== "0";
    const userId = include_subscription ? await safeUserId(req) : null;

    const { data: courses, error: cErr } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });
    if (cErr) throw cErr;

    let plans = [];
    if (include_plans) {
      const { data: p, error: pErr } = await supabase
        .from("plans")
        .select(
          "id, course_id, name, description, duration_in_days, price, original_price, discount_price, offer_active, access_features, features_list, device_limit, max_streams, trial_days, auto_renew, is_active, popular, priority_order, release_mode, download_allowed, supports_addons"
        )
        .eq("is_active", true)
        .order("priority_order", { ascending: true })
        .order("price", { ascending: true });
      if (pErr) throw pErr;
      plans = p || [];
    }

    let activeSubs = [];
    if (userId && include_subscription) {
      const nowIso = new Date().toISOString();
      const { data: subs, error: sErr } = await supabase
        .from("user_subscriptions")
        .select("id, user_id, course_id, plan_id, start_date, end_date, is_active, auto_renew")
        .eq("user_id", userId)
        .neq("is_active", false)
        .gte("end_date", nowIso);
      if (sErr) throw sErr;
      activeSubs = subs || [];
    }

    const plansByCourse = new Map();
    for (const p of plans) {
      const key = String(p.course_id);
      if (!plansByCourse.has(key)) plansByCourse.set(key, []);
      plansByCourse.get(key).push(p);
    }

    const subByCourse = new Map();
    for (const s of activeSubs) {
      subByCourse.set(String(s.course_id), s);
    }

    const data = (courses || []).map((c) => ({
      ...c,
      plans: include_plans ? plansByCourse.get(String(c.id)) || [] : undefined,
      active_subscription: userId ? subByCourse.get(String(c.id)) || null : undefined,
      is_enrolled: userId ? !!subByCourse.get(String(c.id)) : undefined,
    }));

    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
