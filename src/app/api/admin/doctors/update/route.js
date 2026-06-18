import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function PUT(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();
    const { id, full_name, email, password, is_active, subject_ids = [] } = body;

    if (!id) throw new Error("Doctor id required");

    // update user fields (password optional)
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (is_active !== undefined) updates.is_active = is_active;
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }
    updates.updated_by = admin.sub || admin.id || null;
    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updErr } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (updErr) throw updErr;

    // Replace doctor_subjects assignments: easiest way is to delete existing and insert new
    const { error: delErr } = await supabase
      .from("doctor_subjects")
      .delete()
      .eq("doctor_id", id);

    if (delErr) throw delErr;

    if (Array.isArray(subject_ids) && subject_ids.length > 0) {
      const rows = subject_ids.map((sid) => ({
        doctor_id: id,
        subject_id: sid,
        created_by: admin.sub || admin.id || null,
        updated_by: admin.sub || admin.id || null,
      }));
      const { error: insertErr } = await supabase
        .from("doctor_subjects")
        .insert(rows);
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({ success: true, user: updated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
