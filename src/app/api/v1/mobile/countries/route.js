import { supabase } from "@/lib/supabaseAdmin";

// Mobile API: list countries with their colleges/universities
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("countries")
      .select("id, name, code, courses_csv, colleges:colleges(id, name, city, type)")
      .order("name", { ascending: true });
    if (error) throw error;

    return Response.json({ success: true, data: data || [] }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
