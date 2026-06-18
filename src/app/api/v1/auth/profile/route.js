import { supabase } from "@/lib/supabaseAdmin";
import { verifyToken } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    const decoded = await verifyToken(req);
    const userId = decoded.sub || decoded.id;

    if (!userId) {
      return Response.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Fetch user details
    const { data: user, error: uErr } = await supabase
      .from("users")
      .select(
        "id, full_name, email, phone, gender, role, profile_picture, is_active, created_at, updated_at"
      )
      .eq("id", userId)
      .single();

    if (uErr || !user) {
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (user.is_active === false) {
      return Response.json(
        { success: false, error: "Account deactivated" },
        { status: 403 }
      );
    }

    // Fetch active subscriptions if role === "user" (student)
    let active_subscriptions = [];
    if (user.role === "user") {
      const nowIso = new Date().toISOString();
      const { data: subs } = await supabase
        .from("user_subscriptions")
        .select("id, user_id, course_id, plan_id, start_date, end_date, is_active, auto_renew")
        .eq("user_id", userId)
        .neq("is_active", false)
        .gte("end_date", nowIso);
      active_subscriptions = subs || [];
    }

    return Response.json(
      {
        success: true,
        user,
        active_subscriptions,
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 401 }
    );
  }
}
