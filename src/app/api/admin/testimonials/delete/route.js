import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { id } = await req.json();

    const { data: existing } = await supabase
      .from("testimonials")
      .select("*")
      .eq("id", id)
      .single();

    if (!existing) {
      return Response.json({ success: false, error: "Not found" }, { status: 404 });
    }

    // delete image
    const path = existing.image_url.split("/storage/v1/object/public/media/")[1];
    if (path) {
      await supabase.storage.from("media").remove([path]);
    }

    await supabase.from("testimonials").delete().eq("id", id);

    return Response.json({ success: true, message: "Testimonial deleted" });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
