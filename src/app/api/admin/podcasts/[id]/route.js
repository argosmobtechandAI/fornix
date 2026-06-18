import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

function extractMediaPath(publicUrl) {
  const marker = "/storage/v1/object/public/media/";
  const idx = String(publicUrl || "").indexOf(marker);
  if (idx === -1) return null;
  return String(publicUrl || "").slice(idx + marker.length);
}

export async function DELETE(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;

    if (!id || id === "undefined" || id === "null") {
      return Response.json(
        { success: false, error: "Valid podcast id is required" },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("podcasts")
      .select("id, media_url")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return Response.json(
        { success: false, error: "Podcast not found" },
        { status: 404 }
      );
    }

    const mediaPath = extractMediaPath(existing.media_url);
    if (mediaPath) {
      await supabase.storage.from("media").remove([mediaPath]);
    }

    const { error } = await supabase.from("podcasts").delete().eq("id", id);
    if (error) throw error;

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await ensureAdmin(req);
    const { id } = await params;

    if (!id || id === "undefined" || id === "null") {
      return Response.json(
        { success: false, error: "Valid podcast id is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim() || null;
    const topicsRaw = String(body.topics || "").trim();

    if (!title) {
      return Response.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }

    const topics = topicsRaw
      ? topicsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : null;

    const { data, error } = await supabase
      .from("podcasts")
      .update({
        title,
        description,
        topics,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, course_id, subject_id, title, description, topics, media_url, media_type, media_size_bytes, created_at, updated_at"
      )
      .single();

    if (error) throw error;

    return Response.json({ success: true, podcast: data }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
