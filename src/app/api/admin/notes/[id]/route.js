import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

function extractMediaPath(publicUrl) {
  const marker = "/storage/v1/object/public/media/";
  const idx = String(publicUrl || "").indexOf(marker);
  if (idx === -1) return null;
  return String(publicUrl || "").slice(idx + marker.length);
}

export async function PUT(req, { params }) {
  try {
    const admin = await ensureAdmin(req);
    const { id } = await params;
    if (!id) return Response.json({ success: false, error: "id required" }, { status: 400 });

    const formData = await req.formData();
    const title = formData.get("title");
    const course_id = formData.get("course_id");
    const subject_id = formData.get("subject_id");
    const chapter_id = formData.get("chapter_id"); // may be null/empty to unset
    const note_type = formData.get("note_type");
    const content = formData.get("content");
    const pdf = formData.get("pdf");

    const { data: existing, error: eErr } = await supabase
      .from("course_notes")
      .select("id, pdf_url, course_id, subject_id, chapter_id")
      .eq("id", id)
      .single();
    if (eErr) throw eErr;

    const updates = {
      updated_by: admin.sub || admin.id || null,
      updated_at: new Date().toISOString(),
    };
    if (title !== null && title !== undefined) {
      const t = String(title || "").trim();
      if (!t) return Response.json({ success: false, error: "title cannot be empty" }, { status: 400 });
      updates.title = t;
    }
    if (course_id !== null && course_id !== undefined) updates.course_id = course_id;
    if (subject_id !== null && subject_id !== undefined) updates.subject_id = subject_id;
    // chapter_id: empty string means "clear it", valid UUID sets it
    if (chapter_id !== null && chapter_id !== undefined) {
      updates.chapter_id = chapter_id === "" ? null : chapter_id;
    }
    if (note_type !== null && note_type !== undefined) {
      if (!["sample", "premium"].includes(note_type)) {
        return Response.json({ success: false, error: "note_type must be 'sample' or 'premium'" }, { status: 400 });
      }
      updates.note_type = note_type;
    }
    if (content !== null && content !== undefined) {
      updates.content = String(content);
    }

    // Replace PDF if provided
    if (pdf && pdf.name) {
      const ext = pdf.name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf") {
        return Response.json({ success: false, error: "Only PDF files are allowed" }, { status: 400 });
      }

      const fileName = `notes_${Date.now()}.pdf`;
      const path = `notes/${course_id || existing?.course_id || "unknown"}/${subject_id || existing?.subject_id || "unknown"}/${fileName}`;
      const fileBuffer = Buffer.from(await pdf.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, fileBuffer, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      updates.pdf_url = urlData.publicUrl;

      // cleanup old pdf if it was in media bucket
      const oldPath = extractMediaPath(existing?.pdf_url);
      if (oldPath) {
        await supabase.storage.from("media").remove([oldPath]);
      }
    }

    const { data, error } = await supabase
      .from("course_notes")
      .update(updates)
      .eq("id", id)
      .select("id, course_id, subject_id, title, content, pdf_url, note_type, created_at, updated_at")
      .single();
    if (error) throw error;

    return Response.json({ success: true, note: data }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;
    if (!id) return Response.json({ success: false, error: "id required" }, { status: 400 });

    const { data: existing, error: eErr } = await supabase
      .from("course_notes")
      .select("id, pdf_url")
      .eq("id", id)
      .single();
    if (eErr) throw eErr;

    const { error } = await supabase.from("course_notes").delete().eq("id", id);
    if (error) throw error;

    const oldPath = extractMediaPath(existing?.pdf_url);
    if (oldPath) {
      await supabase.storage.from("media").remove([oldPath]);
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}



