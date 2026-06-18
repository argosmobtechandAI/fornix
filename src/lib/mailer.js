import nodemailer from "nodemailer";

export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing on the server");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendOtpEmail({ to, otp, context = "login verification" }) {
  const user = process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || user;
  const appName = process.env.APP_NAME || "Fornix";
  
  const transporter = getTransporter();

  await transporter.sendMail({
    from,
    to,
    subject: `${appName} ${context} OTP`,
    text: `Your ${appName} ${context} OTP is ${otp}. It is valid for 10 minutes. If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
        <h2>${appName} Verification</h2>
        <p>We received a request for ${context} on your account.</p>
        <p>Your one-time password (OTP) is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This code is valid for <strong>10 minutes</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
