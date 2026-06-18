import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

// GET /api/admin/experts - List all experts
export async function GET(req) {
  try {
    const { data, error } = await supabase
      .from("cms_experts")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) throw error;

    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("Experts GET error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/admin/experts - Create a new expert with optional image upload
export async function POST(req) {
  try {
    await ensureAdmin(req);
    const body = await req.json();
    const { name, role, description, image_url, order_index } = body;

    if (!name || !role) {
      return Response.json({ success: false, error: "Name and Role are required" }, { status: 400 });
    }

    let finalImageUrl = image_url || "";

    // If image_url is a base64 encoded string, upload to Supabase storage bucket "profile"
    if (finalImageUrl.startsWith("data:image")) {
      const base64Data = finalImageUrl.split(",")[1];
      const mimeType = finalImageUrl.split(";")[0].split(":")[1];
      const extension = mimeType.split("/")[1];
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `experts/expert_${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile")
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });

      if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);

      const { data: urlData } = supabase.storage.from("profile").getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("cms_experts")
      .insert({
        name,
        role,
        description: description || "",
        image_url: finalImageUrl,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("Experts POST error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT /api/admin/experts - Update an expert (handles image update & old cleanup)
export async function PUT(req) {
  try {
    await ensureAdmin(req);
    const body = await req.json();
    const { id, name, role, description, image_url, order_index } = body;

    if (!id || !name || !role) {
      return Response.json({ success: false, error: "ID, Name and Role are required" }, { status: 400 });
    }

    // Fetch existing record to get old image path
    const { data: existing, error: fetchErr } = await supabase
      .from("cms_experts")
      .select("image_url")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;

    let finalImageUrl = image_url;

    // Handle base64 upload
    if (image_url && image_url.startsWith("data:image")) {
      const base64Data = image_url.split(",")[1];
      const mimeType = image_url.split(";")[0].split(":")[1];
      const extension = mimeType.split("/")[1];
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `experts/expert_${id}_${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile")
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });

      if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);

      const { data: urlData } = supabase.storage.from("profile").getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;

      // Clean up old image if it exists in our storage folder
      if (existing.image_url && existing.image_url.includes("/storage/v1/object/public/profile/experts/")) {
        const oldPath = existing.image_url.split("/profile/")[1];
        if (oldPath) await supabase.storage.from("profile").remove([oldPath]);
      }
    }

    const { data, error } = await supabase
      .from("cms_experts")
      .update({
        name,
        role,
        description: description || "",
        image_url: finalImageUrl,
        order_index: order_index || 0,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("Experts PUT error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/experts - Delete an expert and clean up image asset
export async function DELETE(req) {
  try {
    await ensureAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    // Fetch existing to delete storage file
    const { data: existing, error: fetchErr } = await supabase
      .from("cms_experts")
      .select("image_url")
      .eq("id", id)
      .single();

    if (fetchErr && fetchErr.code !== "PGRST116") { // Ignore if already not found
      throw fetchErr;
    }

    if (existing && existing.image_url && existing.image_url.includes("/storage/v1/object/public/profile/experts/")) {
      const oldPath = existing.image_url.split("/profile/")[1];
      if (oldPath) await supabase.storage.from("profile").remove([oldPath]);
    }

    const { error: deleteErr } = await supabase
      .from("cms_experts")
      .delete()
      .eq("id", id);

    if (deleteErr) throw deleteErr;

    return Response.json({ success: true, message: "Expert deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("Experts DELETE error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
