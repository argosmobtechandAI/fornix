import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const image = formData.get("image");
    const url = formData.get("url");
    const status = formData.get("status") === "true";
    const course_id = formData.get("course_id") || null;

    if (!image) {
      return Response.json(
        { success: false, error: "Banner image required" },
        { status: 400 }
      );
    }

    const ext = image.name.split(".").pop();
    const fileName = `banner_${Date.now()}.${ext}`;
    const fileBuffer = Buffer.from(await image.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(`banners/${fileName}`, fileBuffer, {
        contentType: image.type,
      });

    if (uploadError) {
      return Response.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(`banners/${fileName}`);

    const image_url = urlData.publicUrl;

    const { data, error } = await supabase
      .from("banners")
      .insert([{ image_url, url, status, course_id }])
      .select()
      .single();

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, banner: data }, { status: 201 });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
