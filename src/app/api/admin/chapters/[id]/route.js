import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function PUT(req, { params }) {
  try {
    const admin = await ensureAdmin(req);
    const {id} = await params;
    const body = await req.json();
    const updates = { updated_by: admin.sub || admin.id || null, updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    const { data, error } = await supabase.from("chapters").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, chapter: data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureAdmin(req);
     const {id} = await params;
    const { error } = await supabase.from("chapters").delete().eq("id", id);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}
