import { supabase } from "@/lib/supabaseAdmin";
import { ensureUser } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    const user = await ensureUser(req);
    const userId = user.sub || user.id;

    const { data: u, error: uErr } = await supabase
      .from("users")
      .select(
        "id, full_name, email, phone, gender, role, profile_picture, is_active, created_at, updated_at"
      )
      .eq("id", userId)
      .single();
    if (uErr) throw uErr;

    const nowIso = new Date().toISOString();
    const { data: subs, error: sErr } = await supabase
      .from("user_subscriptions")
      .select("id, user_id, course_id, plan_id, start_date, end_date, is_active, auto_renew")
      .eq("user_id", userId)
      .neq("is_active", false)
      .gte("end_date", nowIso)
      .order("end_date", { ascending: false });
    if (sErr) throw sErr;

    return Response.json(
      {
        success: true,
        user: u,
        active_subscriptions: subs || [],
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 401 });
  }
}


