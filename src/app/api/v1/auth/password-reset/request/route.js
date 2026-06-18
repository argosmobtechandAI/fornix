import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabaseAdmin";

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit OTP
}

async function sendOtpEmail({ to, otp }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing on the server");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const appName = process.env.APP_NAME || "Fornix";

  await transporter.sendMail({
    from,
    to,
    subject: `${appName} password reset OTP`,
    text: `Your ${appName} password reset OTP is ${otp}. It is valid for 10 minutes. If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
        <h2>${appName} Password Reset</h2>
        <p>We received a request to reset the password for your account.</p>
        <p>Your one-time password (OTP) is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This code is valid for <strong>10 minutes</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return Response.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email, but do not allow admin/doctor roles to use this flow
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, email, full_name, role")
      .eq("email", normalizedEmail)
      .neq("role", "admin")
      .neq("role", "doctor")
      .maybeSingle();

    if (userErr) {
      return Response.json(
        { success: false, error: userErr.message },
        { status: 500 }
      );
    }

    // If no user found, clearly tell the client so they can show
    // a proper message like "email not registered" on the UI.
    if (!user) {
      return Response.json(
        {
          success: false,
          error: "Email not found. You can use forgot password only for registered accounts.",
        },
        { status: 404 }
      );
    }

    const otp = generateOtp();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Optionally clean up previous unused/expired codes for this user
    await supabase
      .from("password_reset_otps")
      .delete()
      .eq("user_id", user.id)
      .is("used_at", null);

    const { error: insertErr } = await supabase
      .from("password_reset_otps")
      .insert([
        {
          user_id: user.id,
          email: normalizedEmail,
          otp,
          expires_at: expiresAt,
        },
      ]);

    if (insertErr) {
      return Response.json(
        { success: false, error: insertErr.message },
        { status: 500 }
      );
    }

    try {
      await sendOtpEmail({ to: normalizedEmail, otp });
    } catch (mailErr) {
      // If email fails, still do not leak existence of account; report generic error
      console.error("Mail Error:", mailErr);
      return Response.json(
        { success: false, error: "Failed to send OTP email" },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message:
          "If an account exists for this email, an OTP has been sent.",
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
