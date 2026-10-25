import { logger } from "../config/logger";

/**
 * Envoi d'e-mail. Deux modes (le premier configuré est utilisé) :
 *  1) Gmail / SMTP : SMTP_USER + SMTP_PASS (mot de passe d'application) [+ SMTP_HOST, SMTP_PORT, SMTP_FROM]
 *  2) Resend       : RESEND_API_KEY + RESET_EMAIL_FROM
 */
const smtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const resendConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.RESET_EMAIL_FROM);

export function isEmailConfigured(): boolean {
  return smtpConfigured() || resendConfigured();
}

async function sendSmtp(to: string, subject: string, text: string): Promise<boolean> {
  try {
    // @ts-ignore - nodemailer : npm install nodemailer
    const nodemailer: any = await import("nodemailer");
    const create = nodemailer.createTransport ?? nodemailer.default?.createTransport;
    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = create({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: String(process.env.SMTP_PASS).replace(/\s+/g, "") },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `Ndao Hifanosika <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    return true;
  } catch (error: any) {
    logger.error(`Échec envoi e-mail SMTP : ${error?.message || error}`);
    console.error("[MAIL] Échec SMTP :", error?.message || error);
    return false;
  }
}

async function sendResend(to: string, subject: string, text: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESET_EMAIL_FROM, to: [to], subject, text }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error(`Échec envoi e-mail Resend (HTTP ${response.status}) : ${body}`);
      console.error(`[MAIL] Échec Resend (HTTP ${response.status}) : ${body}`);
      return false;
    }
    return true;
  } catch (error: any) {
    logger.error(`Échec envoi e-mail Resend : ${error?.message || error}`);
    console.error("[MAIL] Échec Resend :", error?.message || error);
    return false;
  }
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (smtpConfigured()) return sendSmtp(to, subject, text);
  if (resendConfigured()) return sendResend(to, subject, text);
  return false;
}
