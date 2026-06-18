import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function GET(req, { params }) {
  try {
    await ensureDoctor(req);
    const {id} = await params;
    const { data, error } = await supabase.from("subjects").select("*").eq("id", id).single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, subject: data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}

export async function PUT(req, { params }) {
  try {
    const doctor = await ensureDoctor(req);
    const {id} = await params;
    const body = await req.json();
    const { name, description, is_active /*if any*/ } = body;
    const updates = { updated_by: doctor.sub || doctor.id || null, updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const { data, error } = await supabase.from("subjects").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, subject: data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureDoctor(req);
    const {id} = await params;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}
