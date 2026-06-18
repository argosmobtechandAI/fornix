import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabaseAdmin";
import { ensureAdmin } from "@/lib/verifyToken";

function randomPassword() {
  return Math.random().toString(36).slice(-10) + "A1!";
}

export async function POST(req) {
  try {
    const admin = await ensureAdmin(req);
    const body = await req.json();
    const { full_name, email, password, subject_ids = [] } = body;

    if (!email) throw new Error("Email is required");

    // Check existing
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) throw new Error("User with that email already exists");

    const rawPassword = password || randomPassword();
    const password_hash = await bcrypt.hash(rawPassword, 10);

    // create user
    const { data: user, error: createErr } = await supabase
      .from("users")
      .insert([
        {
          full_name,
          email,
          password_hash,
          role: "doctor",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select("*")
      .single();

    if (createErr) throw createErr;

    // assign subjects (if any)
    if (Array.isArray(subject_ids) && subject_ids.length > 0) {
      const rows = subject_ids.map((sid) => ({
        doctor_id: user.id,
        subject_id: sid,
        created_by: admin.sub || admin.id || null,
      }));
      const { error: assignErr } = await supabase
        .from("doctor_subjects")
        .insert(rows);

      if (assignErr) throw assignErr;
    }

    // Return created user and the plaintext password if caller needs it
    return new Response(
      JSON.stringify({
        success: true,
        user,
        plainPassword: password ? undefined : rawPassword,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
