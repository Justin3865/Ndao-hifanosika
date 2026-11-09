import { logger } from "../config/logger";
import { isEmailConfigured, sendEmail as sendMail } from "../utils/mailer";

/**
 * Envoi réel des messages : e-mail (Gmail SMTP ou Resend, via utils/mailer) et SMS (Twilio).
 * Variables .env : SMTP_USER, SMTP_PASS (ou RESEND_API_KEY, RESET_EMAIL_FROM),
 *                  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 */

/** 034 61 911 96 -> +261346191196 (format E.164 Madagascar). */
export function normalizePhone(raw: string): string | null {
  const digits = String(raw ?? "").replace(/[^\d+]/g, "");
  if (/^\+261\d{9}$/.test(digits)) return digits;
  if (/^261\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+261${digits.slice(1)}`;
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  return null;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!isEmailConfigured()) throw new Error("EMAIL_NOT_CONFIGURED");
  const ok = await sendMail(to, subject, text);
  if (!ok) throw new Error("EMAIL_SEND_FAILED");
}

export async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) throw new Error("SMS_NOT_CONFIGURED");
  const phone = normalizePhone(to);
  if (!phone) throw new Error("PHONE_INVALID");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, From: from, Body: body }).toString(),
  });
  if (!response.ok) throw new Error(`SMS_HTTP_${response.status}`);
}

/** Envoie par e-mail ET SMS selon les coordonnées disponibles ; n'échoue jamais. */
export async function deliverToUser(
  user: { email?: string | null; phone?: string | null },
  title: string,
  message: string,
): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (user.email && isEmailConfigured()) {
    tasks.push(sendEmail(user.email, `${title} — Ndao Hifanosika`, message));
  }
  if (user.phone && process.env.TWILIO_ACCOUNT_SID) {
    tasks.push(sendSms(user.phone, `Ndao Hifanosika : ${title}. ${message}`.slice(0, 300)));
  }
  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === "rejected") logger.error("Échec d'envoi de notification externe", r.reason);
  }
}
