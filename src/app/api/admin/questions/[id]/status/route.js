import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function PUT(req, { params }) {
  try {
    const admin = await ensureAdmin(req);
    const { id } = await params;
    if (!id) throw new Error("Question ID is required");

    const body = await req.json();
    const { status } = body;

    const validStatuses = ["pending", "approved", "rejected"];
    if (!status || !validStatuses.includes(status)) {
      throw new Error("Invalid status. Must be one of: pending, approved, rejected.");
    }

    const updates = {
      status,
      status_by: admin.sub || admin.id || null,
      updated_at: new Date().toISOString(),
    };

    // ✅ Update the question status
    const { data: updated, error: uErr } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", id)
      .select("id, question_text, status, status_by, updated_at")
      .single();

    if (uErr) throw uErr;

    return new Response(
      JSON.stringify({ success: true, message: "Status updated", question: updated }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Status update error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
