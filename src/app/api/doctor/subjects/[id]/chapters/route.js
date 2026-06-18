import { supabase } from "@/lib/supabaseAdmin";
import { ensureDoctor } from "@/lib/verifyToken";

export async function GET(req, { params }) {
  try {
    await ensureDoctor(req);
    const { id } = await params;

    // Get subject
    const { data: subject } = await supabase
      .from("subjects")
      .select("*")
      .eq("id", id)
      .single();

    if (!subject) {
      return Response.json({ success: false, error: "Subject not found" }, { status: 404 });
    }

    // Get chapters
    const { data: chapters, error } = await supabase
      .from("chapters")
      .select("*")
      .eq("subject_id", id)
      .order("name", { ascending: true });

    if (error) throw error;

    return Response.json({
      success: true,
      subject,
      chapters
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
