import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function POST(req) {
  try {
    const doctor = await ensureDoctor(req);
    const { subject_id, name, description = "" } = await req.json();
    if (!subject_id || !name) throw new Error("subject_id and name required");
    const { data, error } = await supabase
      .from("chapters")
      .insert([{
        subject_id,
        name,
        description,
        created_by: doctor.sub || doctor.id || null,
        updated_by: doctor.sub || doctor.id || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, chapter: data }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
  }
}
