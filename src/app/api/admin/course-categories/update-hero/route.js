import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

// Required: prevents Next.js App Router from statically pre-rendering this route
export const dynamic = "force-dynamic";

export async function PUT(req) {
  try {
    await ensureAdmin(req);

    const formData = await req.formData();
    const rawId = formData.get("id");
    const categoryId = typeof rawId === "string" ? rawId : String(rawId || "");
    const image = formData.get("image");

    if (!categoryId || categoryId === "undefined" || categoryId === "null") {
      return Response.json(
        { success: false, error: "Category ID is required" },
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

    // Fetch existing category
    const { data: category, error: catErr } = await supabase
      .from("course_categories")
      .select("*")
      .eq("id", categoryId)
      .single();

    if (catErr || !category) {
      return Response.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    let newUrl = category.hero_image || null;

    // Delete old image if present and in media bucket
    if (category.hero_image) {
      const marker = "/storage/v1/object/public/media/";
      const idx = category.hero_image.indexOf(marker);
      if (idx !== -1) {
        const path = category.hero_image.slice(idx + marker.length);
        if (path) {
          await supabase.storage.from("media").remove([path]);
        }
      }
    }

    const ext = image.name.split(".").pop();
    const fileName = `category_hero_${categoryId}_${Date.now()}.${ext}`;
    const fileBuffer = Buffer.from(await image.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from("media")
      .upload(`category-heroes/${fileName}`, fileBuffer, {
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
      .getPublicUrl(`category-heroes/${fileName}`);

    newUrl = urlData.publicUrl;

    const { data, error } = await supabase
      .from("course_categories")
      .update({ hero_image: newUrl, updated_at: new Date() })
      .eq("id", categoryId)
      .select()
      .single();

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, category: data, hero_image: newUrl });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
