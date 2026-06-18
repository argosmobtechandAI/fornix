import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

// Allow large form-data bodies for image uploads
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await ensureAdmin(req);

    const formData = await req.formData();
    const file = formData.get("image");
    const blogId = formData.get("blog_id") || null; // optional: used for naming

    if (!file || !file.name) {
      return NextResponse.json(
        { success: false, error: "Image file is required" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only JPG, PNG, WebP, or GIF images are allowed" },
        { status: 422 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "Image must be less than 10MB" },
        { status: 422 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const suffix = blogId ? `blog_${blogId}` : `blog_new`;
    const fileName = `blogs/${suffix}_${Date.now()}.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase storage (using "media" bucket for consistency)
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase blog image upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Image upload failed: " + uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: fileName,
    });
  } catch (err) {
    console.error("Blog image upload error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
