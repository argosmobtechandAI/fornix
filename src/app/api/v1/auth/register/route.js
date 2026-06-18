import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const formData = await req.formData();

    const full_name = formData.get("name");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const dob = formData.get("dob");
    const institute = formData.get("institute");
    const gender = formData.get("gender") || "male";
    const qualification = formData.get("qualification");
    const password = formData.get("password");
    const profile_picture = formData.get("profile_picture");
    const academic_year = formData.get("academic_year") || null;
    const preferred_language = formData.get("preferred_language") || "en";

    if (!full_name || !email || !password) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if email exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return Response.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    let profile_url = null;

    // --------------------------
    // CHECK IF FILE EXISTS
    // --------------------------
    if (profile_picture && profile_picture.name) {
      // console.log("Uploading file:", profile_picture.name);

      const ext = profile_picture.name.split(".").pop();
      const fileName = `profile_${Date.now()}.${ext}`;
      const fileBuffer = Buffer.from(await profile_picture.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("profile")
        .upload(fileName, fileBuffer, {
          contentType: profile_picture.type,
          upsert: false,
        });

      if (uploadError) {
        // console.log("Storage upload error:", uploadError);
        return Response.json(
          { success: false, error: uploadError.message },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage
        .from("profile")
        .getPublicUrl(fileName);

      profile_url = urlData.publicUrl;

      // console.log("Profile uploaded:", profile_url);
    } else {
      // console.log("No file received in formData");
    }

    // Create user
    const { data: user, error: createError } = await supabase
      .from("users")
      .insert([
        {
          full_name,
          email,
          phone,
          profile_picture: profile_url,
          dob,
          institute,
          qualification,
          gender,
          password_hash,
          role: "user",
          academic_year,
          preferred_language,
        },
      ])
      .select()
      .single();

    if (createError) {
      // console.log("User insert error:", createError);
      return Response.json(
        { success: false, error: createError.message },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          phone: user.phone,
          profile_picture: profile_url,
          dob: user.dob,
          institute: user.institute,
          qualification: user.qualification,
          gender: user.gender,
          role: user.role,
          academic_year: user.academic_year || null,
          preferred_language: user.preferred_language || "en",
        },
      },
      { status: 201 }
    );
  } catch (err) {
    // console.log("Catch error:", err.message);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
