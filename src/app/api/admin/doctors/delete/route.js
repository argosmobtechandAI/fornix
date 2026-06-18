import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function DELETE(req) {
  try {
    const admin = await ensureAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("id is required");

    // delete doctor_subjects will cascade if set, but explicit delete okay
    await supabase.from("doctor_subjects").delete().eq("doctor_id", id);

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
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
