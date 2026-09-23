import { resend, EMAIL_FROM } from "./resend";

/** Sends a 6-digit login code by email. Throws if Resend rejects the send. */
export async function sendOtpEmail(to: string, name: string, code: string) {
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: `Your Jay's Corner login code: ${code}`,
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
        <h2 style="color: #111827;">Hi ${escapeHtml(name)},</h2>
        <p style="color: #374151;">Use this code to finish logging in to Jay's Corner:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #ea580c; margin: 24px 0;">${code}</p>
        <p style="color: #6b7280; font-size: 13px;">This code expires in 10 minutes. If you didn't try to log in, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message ?? "Failed to send verification email.");
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
