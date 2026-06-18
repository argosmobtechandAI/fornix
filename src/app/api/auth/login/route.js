import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password)
      return Response.json(
        { success: false, error: "Missing credentials" },
        { status: 400 }
      );

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user)
      return Response.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return Response.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );

    const sessionId = globalThis.crypto.randomUUID();
    await supabase
      .from("users")
      .update({ current_session_id: sessionId })
      .eq("id", user.id);

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name,
        university_id: user.university_id || null,
        academic_year: user.academic_year || null,
        session_id: sessionId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const isProd = process.env.NODE_ENV === "production";
    const cookie = [
      `token=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${7 * 24 * 60 * 60}`,
      isProd ? "Secure" : null,
    ]
      .filter(Boolean)
      .join("; ");

    return new Response(
      JSON.stringify({
        success: true,
        token,
        role: user.role,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
