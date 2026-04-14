import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_HOST) {
    console.log('[MAIL DEV MODE]', { to, subject, html });
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html
    });
  } catch (error) {
    error.statusCode = 503;
    error.publicMessage = 'Email service unavailable. Please try again later.';
    throw error;
  }
}
