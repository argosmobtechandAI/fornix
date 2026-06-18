import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    await ensureAdmin(req);
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
      .from("bulk_message_campaigns")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      campaigns: data || [],
      pagination: {
        total: count || 0,
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("History API error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: err.message === "Forbidden" || err.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
