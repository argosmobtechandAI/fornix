import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function PUT(req, { params }) {
  try {
    const doctor = await ensureDoctor(req);
    const body = await req.json();
    const {id} = await params;
    const updates = { updated_by: doctor.sub || doctor.id || null, updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    const { data, error } = await supabase.from("topics").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, topic: data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureDoctor(req);
    const {id} = await params;
    const { error } = await supabase.from("topics").delete().eq("id", id);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}
