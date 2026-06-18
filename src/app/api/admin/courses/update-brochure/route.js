import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

// Required: prevents Next.js App Router from statically pre-rendering this route
export const dynamic = "force-dynamic";

// Increase body size limit for this route to support large PDF brochure uploads (up to 25MB)
// This is the correct App Router way to override the default 4MB limit per route
export const maxRequestBodySize = "25mb";

export async function PUT(req) {
  try {
    await ensureAdmin(req);

    const formData = await req.formData();
    const rawId = formData.get("id");
    const courseId = typeof rawId === "string" ? rawId : String(rawId || "");
    const brochure = formData.get("brochure");

    if (!courseId || courseId === "undefined" || courseId === "null") {
      return Response.json(
        { success: false, error: "Course ID is required" },
        { status: 400 }
      );
    }

    if (!brochure || !brochure.name) {
      return Response.json(
        { success: false, error: "Brochure PDF is required" },
        { status: 400 }
      );
    }

    if (brochure.type !== "application/pdf") {
      return Response.json(
        { success: false, error: "Only PDF files are allowed for brochures" },
        { status: 422 }
      );
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (brochure.size > maxSize) {
      return Response.json(
        { success: false, error: "Brochure PDF must be less than 20MB" },
        { status: 422 }
      );
    }

    // Fetch existing course
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseErr || !course) {
      return Response.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }

    // Delete old brochure if present
    if (course.brochure_url) {
      const marker = "/storage/v1/object/public/media/";
      const idx = course.brochure_url.indexOf(marker);
      if (idx !== -1) {
        const path = course.brochure_url.slice(idx + marker.length);
        if (path) {
          await supabase.storage.from("media").remove([path]);
        }
      }
    }

    const fileName = `brochure_${courseId}_${Date.now()}.pdf`;
    const fileBuffer = Buffer.from(await brochure.arrayBuffer());

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("media")
      .upload(`course-brochures/${fileName}`, fileBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Supabase brochure upload error:", uploadErr);
      return Response.json(
        { success: false, error: `Brochure upload failed: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(`course-brochures/${fileName}`);

    const brochureUrl = urlData.publicUrl;

    const { data, error } = await supabase
      .from("courses")
      .update({ brochure_url: brochureUrl, updated_at: new Date() })
      .eq("id", courseId)
      .select()
      .single();

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, course: data, brochure_url: brochureUrl });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove brochure from a course
export async function DELETE(req) {
  try {
    await ensureAdmin(req);
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("id");

    if (!courseId) {
      return Response.json(
        { success: false, error: "Course ID is required" },
        { status: 400 }
      );
    }

    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("brochure_url")
      .eq("id", courseId)
      .single();

    if (courseErr || !course) {
      return Response.json({ success: false, error: "Course not found" }, { status: 404 });
    }

    if (course.brochure_url) {
      const marker = "/storage/v1/object/public/media/";
      const idx = course.brochure_url.indexOf(marker);
      if (idx !== -1) {
        const path = course.brochure_url.slice(idx + marker.length);
        if (path) await supabase.storage.from("media").remove([path]);
      }
    }

    const { error } = await supabase
      .from("courses")
      .update({ brochure_url: null, updated_at: new Date() })
      .eq("id", courseId);

    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });
    return Response.json({ success: true, message: "Brochure removed successfully" });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
