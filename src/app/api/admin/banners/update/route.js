import { supabase } from "@/lib/supabaseAdmin";

export async function PUT(req) {
  try {
    const formData = await req.formData();

    const id = formData.get("id");
    const url = formData.get("url");
    const status = formData.get("status") === "true";
    const course_id = formData.get("course_id") || null;
    const newImage = formData.get("image");

    if (!id) {
      return Response.json({ success: false, error: "Banner ID required" }, { status: 400 });
    }

    // Get existing banner
    const { data: existing, error: findError } = await supabase
      .from("banners")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !existing) {
      return Response.json({ success: false, error: "Banner not found" }, { status: 404 });
    }

    let image_url = existing.image_url;

    // If admin uploads a new image → upload and delete old
    if (newImage && newImage.name) {
      // DELETE OLD FILE
      const oldPath = existing.image_url.split("/storage/v1/object/public/media/")[1];

      if (oldPath) {
        await supabase.storage.from("media").remove([oldPath]);
      }

      // UPLOAD NEW FILE
      const ext = newImage.name.split(".").pop();
      const fileName = `banner_${Date.now()}.${ext}`;
      const fileBuffer = Buffer.from(await newImage.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(`banners/${fileName}`, fileBuffer, {
          contentType: newImage.type,
        });

      if (uploadError) {
        return Response.json({ success: false, error: uploadError.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(`banners/${fileName}`);

      image_url = urlData.publicUrl;
    }

    // UPDATE BANNER
    const { data, error } = await supabase
      .from("banners")
      .update({
        url,
        status,
        image_url,
        course_id,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, banner: data });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
