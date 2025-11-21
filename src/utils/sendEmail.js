// utils/sendEmail.js
import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, html }) {
  // Basic safety checks
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
    console.error("SMTP host/port missing");
    throw new Error("Email not configured (SMTP host/port)");
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("SMTP_USER / SMTP_PASS missing");
    throw new Error("Email not configured (SMTP credentials)");
  }

  // Create transporter for Gmail SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,        // smtp.gmail.com
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,                      // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,      // your Gmail address
      pass: process.env.SMTP_PASS,      // 16-char app password
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

    console.log("Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("SMTP email error:", err);
    throw new Error("Failed to send email");
  }
}
