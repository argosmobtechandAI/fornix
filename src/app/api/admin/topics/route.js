import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const { chapter_id, name, description = "", content = "", parent_id = null } = await req.json();
    if (!chapter_id || !name) throw new Error("chapter_id and name required");
    const { data, error } = await supabase.from("topics").insert([{
      chapter_id, name, description, content, parent_id,
      created_by: admin.sub || admin.id || null,
      updated_by: admin.sub || admin.id || null,
    }]).select().single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, topic: data }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}
export async function GET(req) {
  try {
    await ensureAdmin(req);
    const url = new URL(req.url);
    const chapterId = url.searchParams.get("chapter_id");
    if (!chapterId) throw new Error("chapter_id required");

    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .eq("chapter_id", chapterId)
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