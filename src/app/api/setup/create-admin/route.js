import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST() {
  try {
    const email = "admin@gmail.com";
    const password = "Admin@123";
    const full_name = "Super Admin";
    const role = "admin";

    // check if admin already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing)
      return Response.json({ success: false, message: "Admin already exists" });

    const hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert([{ full_name, email, password_hash: hash, role }])
      .select("*")
      .single();

    if (error) throw error;

    return Response.json({
      success: true,
      message: "Admin created successfully",
      user: data,
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
