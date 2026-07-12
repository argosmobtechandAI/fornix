import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export const dynamic = "force-dynamic";

export async function PUT(req) {
  try {
    await ensureAdmin(req);

    const formData = await req.formData();
    const rawId = formData.get("id");
    const courseId = typeof rawId === "string" ? rawId : String(rawId || "");
    const image = formData.get("image");

    if (!courseId || courseId === "undefined" || courseId === "null") {
      return Response.json(
        { success: false, error: "Course ID is required" },
        { status: 400 }
      );
    }

    if (!image || !image.name) {
      return Response.json(
        { success: false, error: "Image file is required" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(image.type)) {
      return Response.json(
        { success: false, error: "Only JPG, PNG, WEBP or SVG images allowed" },
        { status: 422 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    // @ts-ignore
    if (image.size > maxSize) {
      return Response.json(
        { success: false, error: "Image must be less than 5MB" },
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

    let newUrl = course.image_url || null;

    // Delete old image if present and in media bucket
    if (course.image_url) {
      const marker = "/storage/v1/object/public/media/";
      const idx = course.image_url.indexOf(marker);
      if (idx !== -1) {
        const path = course.image_url.slice(idx + marker.length);
        if (path) {
          await supabase.storage.from("media").remove([path]);
        }
      }
    }

    const ext = image.name.split(".").pop();
    const fileName = `course_image_${courseId}_${Date.now()}.${ext}`;
    const fileBuffer = Buffer.from(await image.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from("media")
      .upload(`course-images/${fileName}`, fileBuffer, {
        contentType: image.type,
      });

    if (uploadErr) {
      return Response.json(
        { success: false, error: uploadErr.message || "Upload failed" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(`course-images/${fileName}`);

    newUrl = urlData.publicUrl;

    const { data, error } = await supabase
      .from("courses")
      .update({ image_url: newUrl, updated_at: new Date() })
      .eq("id", courseId)
      .select()
      .single();

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, course: data, image_url: newUrl });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
