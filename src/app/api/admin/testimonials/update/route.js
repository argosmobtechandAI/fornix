import { supabase } from "@/lib/supabaseAdmin";

export async function PUT(req) {
  try {
    const formData = await req.formData();

    const id = formData.get("id");
    const name = formData.get("name");
    const rating = Number(formData.get("rating"));
    const message = formData.get("message");
    const status = formData.get("status") === "true";
    const course_id = formData.get("course_id") || null;
    const newImage = formData.get("profile_image");

    if (!id) {
      return Response.json({ success: false, error: "ID required" }, { status: 400 });
    }

    // Fetch existing record
    const { data: existing } = await supabase
      .from("testimonials")
      .select("*")
      .eq("id", id)
      .single();

    if (!existing) {
      return Response.json({ success: false, error: "Not found" }, { status: 404 });
    }

    let profile_image = existing.profile_image;

    // ----------- OPTIONAL NEW IMAGE UPLOAD -------------
    if (newImage && newImage.name) {
      // delete old image
      const oldPath = existing.profile_image?.split("/storage/v1/object/public/media/")[1];
      if (oldPath) {
        await supabase.storage.from("media").remove([oldPath]);
      }

      // upload new file
      const ext = newImage.name.split(".").pop();
      const fileName = `testimonial_${Date.now()}.${ext}`;
      const fileBuffer = Buffer.from(await newImage.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(`testimonials/${fileName}`, fileBuffer, {
          contentType: newImage.type,
        });

      if (uploadError) {
        return Response.json({ success: false, error: uploadError.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(`testimonials/${fileName}`);

      profile_image = urlData.publicUrl;
    }

    // Update entry
    const { data, error } = await supabase
      .from("testimonials")
      .update({
        name,
        rating,
        message,
        status,
        profile_image,
        course_id,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

    return Response.json({ success: true, testimonial: data });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
