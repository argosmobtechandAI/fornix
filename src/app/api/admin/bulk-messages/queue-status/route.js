import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    await ensureAdmin(req);
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 50);
    const status = searchParams.get("status") || "all";

    if (!campaignId) {
      return Response.json(
        { success: false, error: "campaignId is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("bulk_message_queue")
      .select(`
        id,
        user_id,
        status,
        error_message,
        sent_at,
        created_at,
        users:user_id (
          full_name,
          email
        )
      `, { count: "exact" })
      .eq("campaign_id", campaignId);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      queue: data || [],
      pagination: {
        total: count || 0,
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("Queue Status API error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: err.message === "Forbidden" || err.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
