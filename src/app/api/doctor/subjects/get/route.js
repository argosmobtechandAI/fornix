
import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function GET(req) {
  try {
    await ensureDoctor(req);
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, subjects: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
