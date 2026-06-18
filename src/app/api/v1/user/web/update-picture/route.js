import { supabase } from "@/lib/supabaseAdmin";

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, profile_picture } = body;

    if (!id || !profile_picture) {
      return Response.json(
        { success: false, error: "ID and profile picture data are required" },
        { status: 400 }
      );
    }

    // Fetch existing user to get old picture for cleanup
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("profile_picture")
      .eq("id", id)
      .single();

    if (userErr || !user) {
      return Response.json({ success: false, error: "User not found" }, { status: 404 });
    }

    let finalImageUrl = profile_picture;

    // Handle Base64 Upload
    if (profile_picture.startsWith("data:image")) {
      const base64Data = profile_picture.split(",")[1];
      const mimeType = profile_picture.split(";")[0].split(":")[1];
      const extension = mimeType.split("/")[1];
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `profile_${id}_${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile")
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });

      if (uploadError) throw new Error("Storage upload failed: " + uploadError.message);

      const { data: urlData } = supabase.storage.from("profile").getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;

      // Clean up old image from storage if it exists
      if (user.profile_picture?.includes("/storage/v1/object/public/profile/")) {
        const oldPath = user.profile_picture.split("/profile/")[1];
        if (oldPath) await supabase.storage.from("profile").remove([oldPath]);
      }
    }

    // Update database with the new URL
    const { data, error } = await supabase
      .from("users")
      .update({
        profile_picture: finalImageUrl,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return Response.json({ success: true, user: data });

  } catch (err) {
    console.error("Web Image Update Error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
