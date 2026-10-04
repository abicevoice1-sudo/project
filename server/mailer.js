// ─── Mail adapter — SMTP via nodemailer when configured, console otherwise ───
// cPanel ships SMTP (create the mailbox in cPanel → Email Accounts, then set
// SMTP_* in .env). Without SMTP_* the exact link is printed to the server log
// so local development and the e2e suite can still complete every flow.
import nodemailer from 'nodemailer';

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

export async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    // Dev/e2e path: the message itself is the artifact tests parse.
    console.log(`[mail:dev] to=${to} subject="${subject}"`);
    console.log(`[mail:dev] ${text}`);
    return { dev: true };
  }
  return transporter.sendMail({
    from: process.env.MAIL_FROM || 'Shia Rishta <no-reply@shiarishta.com>',
    to,
    subject,
    text,
    html: html || `<p>${text.replace(/\n/g, '<br>')}</p>`,
  });
}
