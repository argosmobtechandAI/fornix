import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await ensureAdmin(req);

    const formData = await req.formData();
    const file = formData.get("file");
    const fileType = formData.get("type"); // 'image' or 'document'

    if (!file || !file.name) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded" },
        { status: 400 }
      );
    }

    // Strict 4.5MB size limit check (4.5 * 1024 * 1024 = 4718592 bytes)
    const MAX_SIZE = 4.5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds the 4.5MB limit. Your file size is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` },
        { status: 422 }
      );
    }

    // Type validation
    if (fileType === "image") {
      const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedImageTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: "Only JPG, PNG, WebP, or GIF images are allowed" },
          { status: 422 }
        );
      }
    } else if (fileType === "document") {
      const allowedDocTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain"
      ];
      if (!allowedDocTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: "Only PDF, Word, Excel, or Text files are allowed for documents" },
          { status: 422 }
        );
      }
    }

    // Format safe file name
    const sanitizedCleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const ext = sanitizedCleanName.split(".").pop() || "";
    const folder = fileType === "image" ? "images" : "documents";
    const fileName = `bulk-messages/${folder}/${Date.now()}_${sanitizedCleanName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase storage 'media' bucket
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "File upload failed: " + uploadError.message },
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
      name: file.name
    });
  } catch (err) {
    console.error("Attachment upload error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unexpected upload error" },
      { status: 500 }
    );
  }
}
