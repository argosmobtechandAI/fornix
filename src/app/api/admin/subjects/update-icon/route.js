import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function PUT(req) {
  try {
    await ensureAdmin(req);

    const formData = await req.formData();
    const subjectId = formData.get("id");
    const icon = formData.get("icon");

    if (!subjectId) {
      return Response.json(
        { success: false, error: "Subject ID is required" },
        { status: 400 }
      );
    }

    if (!icon || !icon.name) {
      return Response.json(
        { success: false, error: "Icon image is required" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(icon.type)) {
      return Response.json(
        { success: false, error: "Only JPG, PNG, WEBP or SVG images allowed" },
        { status: 422 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    // @ts-ignore - size exists on File in runtime
    if (icon.size > maxSize) {
      return Response.json(
        { success: false, error: "Icon image must be less than 5MB" },
        { status: 422 }
      );
    }

    // Fetch existing subject
    const { data: subject, error: subjectErr } = await supabase
      .from("subjects")
      .select("*")
      .eq("id", subjectId)
      .single();

    if (subjectErr || !subject) {
      return Response.json(
        { success: false, error: "Subject not found" },
        { status: 404 }
      );
    }

    let newUrl = subject.icon_url || null;

    // Delete old icon if present and in media bucket
    if (subject.icon_url) {
      const marker = "/storage/v1/object/public/media/";
      const idx = subject.icon_url.indexOf(marker);
      if (idx !== -1) {
        const path = subject.icon_url.slice(idx + marker.length);
        if (path) {
          await supabase.storage.from("media").remove([path]);
        }
      }
    }

    const ext = icon.name.split(".").pop();
    const fileName = `subject_${subjectId}_${Date.now()}.${ext}`;
    const fileBuffer = Buffer.from(await icon.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from("media")
      .upload(`subject-icons/${fileName}`, fileBuffer, {
        contentType: icon.type,
      });

    if (uploadErr) {
      return Response.json(
        { success: false, error: uploadErr.message || "Icon upload failed" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(`subject-icons/${fileName}`);

    newUrl = urlData.publicUrl;

    const { data, error } = await supabase
      .from("subjects")
      .update({ icon_url: newUrl, updated_at: new Date() })
      .eq("id", subjectId)
      .select()
      .single();

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, subject: data, icon_url: newUrl });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
