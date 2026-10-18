import { logger } from "../config/logger";

/** Envoi d'e-mail via l'API Resend (RESEND_API_KEY + RESET_EMAIL_FROM). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESET_EMAIL_FROM);
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESET_EMAIL_FROM,
        to: [to],
        subject,
        text,
      }),
    });

    if (!response.ok) {
      logger.error(`Échec envoi e-mail (HTTP ${response.status})`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Échec envoi e-mail", error);
    return false;
  }
}
