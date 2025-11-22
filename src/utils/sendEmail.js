// src/utils/sendEmail.js
import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, html }) {
  // If SMTP is not configured, just log and skip email
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.warn(
      "[EMAIL] SMTP env vars missing – skipping email to:",
      to,
      "subject:",
      subject
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // e.g. smtp.gmail.com
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from =
    process.env.MAIL_FROM ||
    `Forge India Connect <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log("[EMAIL] Sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("[EMAIL] SMTP error:", err);
    // Do NOT throw – let the API still respond 200 if DB work succeeded
  }
}
