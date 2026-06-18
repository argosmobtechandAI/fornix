import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return Response.json(
        { success: false, error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const code = String(otp).trim();

    const nowIso = new Date().toISOString();

    const { data: record, error } = await supabase
      .from("password_reset_otps")
      .select("id, user_id, email, otp, expires_at, used_at")
      .eq("email", normalizedEmail)
      .eq("otp", code)
      .is("used_at", null)
      .gte("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!record) {
      return Response.json(
        { success: false, error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Mark as verified (but still allow using it once to reset the password)
    await supabase
      .from("password_reset_otps")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", record.id);

    return Response.json(
      { success: true, message: "OTP verified successfully" },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
