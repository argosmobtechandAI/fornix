import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const course_id = searchParams.get("course_id");

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("banners")
      .select("*", { count: "exact" })
      .range(from, to)
      .order("created_at", { ascending: false });

    if (course_id) {
      query = query.eq("course_id", course_id);
    }

    const { data, error, count } = await query;

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      page,
      limit,
      total: count,
      banners: data,
    });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
