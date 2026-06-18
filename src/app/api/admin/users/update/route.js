import { supabase } from "@/lib/supabaseAdmin";

export async function PUT(req) {
  try {
    const { id, full_name, email, phone, role, is_active } = await req.json();

    // -----------------------------
    // BASIC REQUIRED VALIDATION
    // -----------------------------
    if (!id) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!full_name || full_name.trim().length < 2) {
      return Response.json(
        { success: false, error: "Full name is required" },
        { status: 422 }
      );
    }

    // -----------------------------
    // EMAIL VALIDATION
    // -----------------------------
    if (!email) {
      return Response.json(
        { success: false, error: "Email is required" },
        { status: 422 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return Response.json(
        { success: false, error: "Invalid email format" },
        { status: 422 }
      );
    }

    // EMAIL DUPLICATE CHECK
    const { data: emailExists } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .neq("id", id) // exclude current user
      .maybeSingle();

    if (emailExists) {
      return Response.json(
        { success: false, error: "Email already in use" },
        { status: 409 }
      );
    }

    // -----------------------------
    // PHONE VALIDATION
    // -----------------------------
    if (!phone) {
      return Response.json(
        { success: false, error: "Phone number is required" },
        { status: 422 }
      );
    }

    const phoneRegex = /^[0-9]{10}$/;

    if (!phoneRegex.test(phone)) {
      return Response.json(
        { success: false, error: "Phone must be a valid 10-digit number" },
        { status: 422 }
      );
    }

    // PHONE DUPLICATE CHECK
    const { data: phoneExists } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .neq("id", id)
      .maybeSingle();

    if (phoneExists) {
      return Response.json(
        { success: false, error: "Phone number already in use" },
        { status: 409 }
      );
    }

    // -----------------------------
    // ROLE VALIDATION
    // -----------------------------
    const validRoles = ["user", "doctor", "admin"];

    if (role && !validRoles.includes(role)) {
      return Response.json(
        { success: false, error: "Invalid role provided" },
        { status: 422 }
      );
    }

    // -----------------------------
    // ACTIVE STATUS VALIDATION
    // -----------------------------
    if (typeof is_active !== "boolean") {
      return Response.json(
        { success: false, error: "is_active must be a boolean value" },
        { status: 422 }
      );
    }

    // -----------------------------
    // UPDATE USER
    // -----------------------------
    const { data, error } = await supabase
      .from("users")
      .update({
        full_name,
        email,
        phone,
        role,
        is_active,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

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
