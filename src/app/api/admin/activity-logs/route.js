import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    await ensureAdmin(req);

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const action = url.searchParams.get("action") || null;
    const targetType = url.searchParams.get("target_type") || null;
    const search = url.searchParams.get("search") || null;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("admin_activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (action) query = query.eq("action", action);
    if (targetType) query = query.eq("target_type", targetType);
    if (search) {
      query = query.or(
        `description.ilike.%${search}%,target_name.ilike.%${search}%,admin_email.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: page < Math.ceil((count || 0) / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
