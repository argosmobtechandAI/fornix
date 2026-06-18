import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabaseAdmin";
import { sendPushNotification } from "@/lib/pushNotifications";

export async function POST(req) {
  try {
    const { email, otp, new_password } = await req.json();

    if (!email || !otp || !new_password) {
      return Response.json(
        { success: false, error: "Email, OTP and new password are required" },
        { status: 400 }
      );
    }

    if (String(new_password).length < 6) {
      return Response.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const code = String(otp).trim();
    const nowIso = new Date().toISOString();

    // Find a valid, unused OTP record
    const { data: otpRecord, error: otpErr } = await supabase
      .from("password_reset_otps")
      .select("id, user_id, email, otp, expires_at, used_at")
      .eq("email", normalizedEmail)
      .eq("otp", code)
      .is("used_at", null)
      .gte("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (otpErr) {
      return Response.json(
        { success: false, error: otpErr.message },
        { status: 500 }
      );
    }

    if (!otpRecord) {
      return Response.json(
        { success: false, error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Ensure the user is allowed to use this flow (not admin/doctor)
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", otpRecord.user_id)
      .neq("role", "admin")
      .neq("role", "doctor")
      .maybeSingle();

    if (userErr) {
      return Response.json(
        { success: false, error: userErr.message },
        { status: 500 }
      );
    }

    if (!user) {
      return Response.json(
        { success: false, error: "User not found or not allowed" },
        { status: 400 }
      );
    }

    const password_hash = await bcrypt.hash(String(new_password), 10);

    const { error: updateErr } = await supabase
      .from("users")
      .update({ password_hash })
      .eq("id", user.id);

    if (updateErr) {
      return Response.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    // Mark OTP as used so it cannot be reused
    await supabase
      .from("password_reset_otps")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // Send push notification indicating password was successfully changed
    sendPushNotification(
      user.id,
      "Password Changed Successfully 🔒",
      "Your password has been reset. If you did not do this, please contact support immediately.",
      "profile"
    ).catch(e => console.error("Password Update Push Failed:", e));

    return Response.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
