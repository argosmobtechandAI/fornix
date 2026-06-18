import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

function extractMediaPath(publicUrl) {
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
    const subject_id = url.searchParams.get("subject_id");

    let q = supabase
      .from("podcasts")
      .select(
        "id, course_id, subject_id, title, description, topics, media_url, media_type, media_size_bytes, created_at, updated_at, courses(id, name), subjects(id, name)"
      )
      .order("created_at", { ascending: false });

    if (course_id) q = q.eq("course_id", course_id);
    if (subject_id) q = q.eq("subject_id", subject_id);

    const { data, error } = await q;
    if (error) throw error;

    const podcasts = (data || []).map((p) => ({
      ...p,
      course: p.courses || null,
      subject: p.subjects || null,
      courses: undefined,
      subjects: undefined,
    }));

    return Response.json({ success: true, data: podcasts }, { status: 200 });
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
    const description = String(formData.get("description") || "").trim() || null;
    const topicsRaw = String(formData.get("topics") || "").trim();
    const media = formData.get("media");

    if (!course_id) {
      return Response.json(
        { success: false, error: "course_id is required" },
        { status: 400 }
      );
    }
    if (!subject_id) {
      return Response.json(
        { success: false, error: "subject_id is required" },
        { status: 400 }
      );
    }
    if (!title) {
      return Response.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }
    if (!media || !media.name) {
      return Response.json(
        { success: false, error: "media file is required" },
        { status: 400 }
      );
    }

    const mime = media.type || "";
    const isAudio = mime.startsWith("audio/");
    const isVideo = mime.startsWith("video/");
    if (!isAudio && !isVideo) {
      return Response.json(
        { success: false, error: "Only audio or video files are allowed" },
        { status: 400 }
      );
    }

    const media_type = isAudio ? "audio" : "video";
    // @ts-ignore
    const media_size_bytes = Number(media.size || 0);

    const ext = media.name.split(".").pop()?.toLowerCase() || (isAudio ? "audio" : "video");
    const fileName = `podcast_${Date.now()}.${ext}`;
    const path = `podcasts/${course_id}/${subject_id}/${fileName}`;
    const fileBuffer = Buffer.from(await media.arrayBuffer());

    const { error: uploadError } = await supabase
      .storage
      .from("media")
      .upload(path, fileBuffer, { contentType: mime || undefined });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
    const media_url = urlData.publicUrl;

    const topics = topicsRaw
      ? topicsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : null;

    const { data, error } = await supabase
      .from("podcasts")
      .insert([
        {
          course_id,
          subject_id,
          title,
          description,
          topics,
          media_url,
          media_type,
          media_size_bytes,
          created_by: admin.sub || admin.id || null,
          updated_by: admin.sub || admin.id || null,
        },
      ])
      .select(
        "id, course_id, subject_id, title, description, topics, media_url, media_type, media_size_bytes, created_at, updated_at"
      )
      .single();

    if (error) throw error;

    return Response.json({ success: true, podcast: data }, { status: 201 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
