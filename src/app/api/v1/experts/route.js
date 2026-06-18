import { supabase } from "@/lib/supabaseAdmin";

// GET /api/v1/experts - Publicly list all experts
export async function GET(req) {
  try {
    const { data, error } = await supabase
      .from("cms_experts")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) throw error;

    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("Public Experts GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
