import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const { subject_id, name, description = "" } = await req.json();
    if (!subject_id || !name) throw new Error("subject_id and name required");
    const { data, error } = await supabase
      .from("chapters")
      .insert([{
        subject_id,
        name,
        description,
        created_by: admin.sub || admin.id || null,
        updated_by: admin.sub || admin.id || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, chapter: data }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}
export async function GET(req) {
  try {
    await ensureAdmin(req);
    const url = new URL(req.url);
    const subjectId = url.searchParams.get("subject_id");
    if (!subjectId) throw new Error("subject_id required");

    const { data, error } = await supabase
      .from("chapters")
      .select("*")
      .eq("subject_id", subjectId)
      .order("name");
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
    });
  }
}