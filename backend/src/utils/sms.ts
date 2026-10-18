import { logger } from "../config/logger";

/**
 * Envoi de SMS via Twilio (REST, sans dépendance).
 * Variables : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 * (numéro Twilio ou identifiant d'expéditeur alphanumérique).
 */
export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM,
  );
}

/** "034 12 345 67" -> "+261341234567" ; renvoie null si invalide. */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;

  const cleaned = String(raw).replace(/[\s.\-()]/g, "");

  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned;
  if (/^00\d{8,15}$/.test(cleaned)) return `+${cleaned.slice(2)}`;
  if (/^261\d{9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0\d{9}$/.test(cleaned)) return `+261${cleaned.slice(1)}`;

  return null;
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!isSmsConfigured()) return false;

  const phone = normalizePhone(to);
  if (!phone) return false;

  try {
    const sid = process.env.TWILIO_ACCOUNT_SID as string;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: process.env.TWILIO_FROM as string,
          Body: body.slice(0, 320),
        }).toString(),
      },
    );

    if (!response.ok) {
      logger.error(`Échec envoi SMS (HTTP ${response.status})`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Échec envoi SMS", error);
    return false;
  }
}
