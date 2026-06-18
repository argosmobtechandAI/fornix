import { supabase } from "@/lib/supabaseAdmin";

export async function PUT(req) {
  try {
    const { 
      id, 
      full_name, 
      phone, 
      email, 
      gender, 
      dob, 
      institute, 
      qualification, 
      preferred_language, 
      country_name, 
      country_id, 
      university_id 
    } = await req.json();

    if (!id) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // -----------------------------
    // FETCH EXISTING USER
    // -----------------------------
    const { data: currentUser, error: fetchErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !currentUser) {
      return Response.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // -----------------------------
    // DUPLICATE CHECKS
    // -----------------------------
    const normalizedEmail = email?.trim().toLowerCase();
    if (normalizedEmail && normalizedEmail !== currentUser.email?.toLowerCase()) {
      const { data: emailExists } = await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .neq("id", id)
        .maybeSingle();

      if (emailExists) {
        return Response.json(
          { success: false, error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    const cleanPhone = phone?.toString().trim();
    if (cleanPhone && cleanPhone !== currentUser.phone?.toString().trim()) {
      const { data: phoneExists } = await supabase
        .from("users")
        .select("id")
        .eq("phone", cleanPhone)
        .neq("id", id)
        .maybeSingle();

      if (phoneExists) {
        return Response.json(
          { success: false, error: "Phone number already in use" },
          { status: 409 }
        );
      }
    }

    // -----------------------------
    // FOREIGN KEY FIX: Convert empty strings to null
    // -----------------------------
    const validUniversityId = (university_id && university_id.trim() !== "") ? university_id : null;

    // -----------------------------
    // UPDATE DATABASE (No image handling here as requested)
    // -----------------------------
    const { data, error } = await supabase
      .from("users")
      .update({
        full_name: full_name?.trim() || currentUser.full_name,
        phone: cleanPhone || currentUser.phone,
        email: normalizedEmail || currentUser.email,
        gender: gender || currentUser.gender,
        dob: dob || currentUser.dob,
        institute: institute || currentUser.institute,
        university_id: (university_id !== undefined) ? validUniversityId : currentUser.university_id,
        qualification: qualification || currentUser.qualification,
        preferred_language: preferred_language || currentUser.preferred_language,
        country_name: country_name || currentUser.country_name,
        country_id: country_id || currentUser.country_id,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, user: data });

  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
