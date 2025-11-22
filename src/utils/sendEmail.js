// src/utils/sendEmail.js
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = process.env;

// Create transporter once at startup
let transporter = null;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.error(
    "❌ SMTP configuration missing. Emails will NOT be sent.",
    {
      SMTP_HOST: !!SMTP_HOST,
      SMTP_PORT: !!SMTP_PORT,
      SMTP_USER: !!SMTP_USER,
      SMTP_PASS: !!SMTP_PASS,
    }
  );
} else {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,                    // e.g. "smtp.gmail.com"
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,  // true for 465, false for 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,                  // Gmail app password or SMTP key
    },
  });
}

export async function sendEmail({ to, subject, html }) {
  if (!to) {
    throw new Error("Missing 'to' in sendEmail");
  }

  if (!transporter) {
    console.error("❌ Email transporter not initialized.");
    throw new Error("Email not configured on server");
  }

  const from =
    MAIL_FROM || `Forge India Connect <${SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ SMTP email error:", err);
    throw new Error("Failed to send email");
  }
}
