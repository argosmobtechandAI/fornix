import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const formData = await req.formData();

    const profile_image = formData.get("profile_image");
    const name = formData.get("name");
    const rating = Number(formData.get("rating"));
    const message = formData.get("message");
    const status = formData.get("status") === "true";
    const course_id = formData.get("course_id") || null;

    let profile_url = null;

    if (profile_image && profile_image.name) {
      const ext = profile_image.name.split(".").pop();
      const fileName = `testimonial_${Date.now()}.${ext}`;
      const fileBuffer = Buffer.from(await profile_image.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(`testimonials/${fileName}`, fileBuffer, {
          contentType: profile_image.type,
        });

      if (uploadError) {
        return Response.json(
          { success: false, error: uploadError.message },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(`testimonials/${fileName}`);

      profile_url = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("testimonials")
      .insert([{ profile_image: profile_url, name, rating, message, status, course_id }])
      .select()
      .single();

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, testimonial: data }, { status: 201 });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
