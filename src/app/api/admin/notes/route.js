import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

function extractMediaPath(publicUrl) {
  // expected: .../storage/v1/object/public/media/<path>
  const marker = "/storage/v1/object/public/media/";
  const idx = String(publicUrl || "").indexOf(marker);
  if (idx === -1) return null;
  return String(publicUrl || "").slice(idx + marker.length);
}

export async function GET(req) {
  try {
    await ensureAdmin(req);
    const url = new URL(req.url);
    const course_id = url.searchParams.get("course_id");

    let q = supabase
      .from("course_notes")
      .select("id, course_id, subject_id, title, pdf_url, note_type, created_at, updated_at, courses(id, name), subjects(id, name)")
      .order("created_at", { ascending: false });

    if (course_id) q = q.eq("course_id", course_id);

    const { data, error } = await q;
    if (error) throw error;

    const notes = (data || []).map((n) => ({
      ...n,
      course: n.courses || null,
      subject: n.subjects || null,
      courses: undefined,
      subjects: undefined,
    }));

    return Response.json({ success: true, notes }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const formData = await req.formData();

    const course_id = formData.get("course_id");
    const subject_id = formData.get("subject_id");
    const title = String(formData.get("title") || "").trim();
    const note_type = String(formData.get("note_type") || "sample").trim();
    const pdf = formData.get("pdf");

    if (!course_id) {
      return Response.json({ success: false, error: "course_id is required" }, { status: 400 });
    }
    if (!subject_id) {
      return Response.json({ success: false, error: "subject_id is required" }, { status: 400 });
    }
    if (!title) {
      return Response.json({ success: false, error: "title is required" }, { status: 400 });
    }
    if (!["sample", "premium"].includes(note_type)) {
      return Response.json({ success: false, error: "note_type must be 'sample' or 'premium'" }, { status: 400 });
    }
    if (!pdf || !pdf.name) {
      return Response.json({ success: false, error: "pdf file is required" }, { status: 400 });
    }

    const ext = pdf.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") {
      return Response.json({ success: false, error: "Only PDF files are allowed" }, { status: 400 });
    }

    const fileName = `notes_${Date.now()}.pdf`;
    const path = `notes/${course_id}/${subject_id}/${fileName}`;
    const fileBuffer = Buffer.from(await pdf.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, fileBuffer, { contentType: "application/pdf" });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
    const pdf_url = urlData.publicUrl;

    const { data, error } = await supabase
      .from("course_notes")
      .insert([
        {
          course_id,
          subject_id,
          title,
          pdf_url,
          note_type,
          created_by: admin.sub || admin.id || null,
          updated_by: admin.sub || admin.id || null,
        },
      ])
      .select("id, course_id, subject_id, title, pdf_url, note_type, created_at, updated_at")
      .single();
    if (error) throw error;

    return Response.json({ success: true, note: data }, { status: 201 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}


