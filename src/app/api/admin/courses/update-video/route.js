import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export async function PUT(req) {
  try {
    await ensureAdmin(req);

    const formData = await req.formData();
    const rawId = formData.get("id");
    const courseId = typeof rawId === "string" ? rawId : String(rawId || "");
    const video = formData.get("video");

    if (!courseId || courseId === "undefined" || courseId === "null") {
      return Response.json(
        { success: false, error: "Course ID is required" },
        { status: 400 }
      );
    }

    if (!video || !video.name) {
      return Response.json(
        { success: false, error: "Video file is required" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-matroska",
    ];
    if (!allowedTypes.includes(video.type)) {
      return Response.json(
        { success: false, error: "Only MP4, WebM, OGG, MOV or MKV videos allowed" },
        { status: 422 }
      );
    }

    const maxSize = 500 * 1024 * 1024; // 500MB
    // @ts-ignore - size exists on File in runtime
    if (video.size > maxSize) {
      return Response.json(
        { success: false, error: "Video must be less than 500MB" },
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

    let newUrl = course.tutorial_video_url || null;

    // Delete old video if present and in media bucket
    if (course.tutorial_video_url) {
      const marker = "/storage/v1/object/public/media/";
      const idx = course.tutorial_video_url.indexOf(marker);
      if (idx !== -1) {
        const path = course.tutorial_video_url.slice(idx + marker.length);
        if (path) {
          await supabase.storage.from("media").remove([path]);
        }
      }
    }

    const ext = video.name.split(".").pop();
    const fileName = `course_${courseId}_${Date.now()}.${ext}`;
    const fileBuffer = Buffer.from(await video.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from("media")
      .upload(`course-videos/${fileName}`, fileBuffer, {
        contentType: video.type,
      });

    if (uploadErr) {
      return Response.json(
        { success: false, error: uploadErr.message || "Video upload failed" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(`course-videos/${fileName}`);

    newUrl = urlData.publicUrl;

    const { data, error } = await supabase
      .from("courses")
      .update({ tutorial_video_url: newUrl, updated_at: new Date() })
      .eq("id", courseId)
      .select()
      .single();

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, course: data, tutorial_video_url: newUrl });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
