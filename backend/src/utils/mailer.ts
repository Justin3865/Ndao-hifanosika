import { logger } from "../config/logger";

/**
 * Envoi d'e-mail. Deux modes (le premier configuré est utilisé) :
 *  1) Gmail / SMTP : SMTP_USER + SMTP_PASS (mot de passe d'application) [+ SMTP_HOST, SMTP_PORT, SMTP_FROM]
 *  2) Resend       : RESEND_API_KEY + RESET_EMAIL_FROM
 */
/** Pièce jointe (contenu en Buffer) — optionnelle : sans elle, le comportement des envois est inchangé. */
export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

const smtpConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const resendConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.RESET_EMAIL_FROM);

export function isEmailConfigured(): boolean {
  return smtpConfigured() || resendConfigured();
}

async function sendSmtp(to: string, subject: string, text: string, attachments?: MailAttachment[]): Promise<MailResult> {
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
      ...(attachments?.length ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })) } : {}),
    });
    return { ok: true };
  } catch (error: any) {
    logger.error(`Échec envoi e-mail SMTP : ${error?.message || error}`);
    console.error("[MAIL] Échec SMTP :", error?.message || error);
    return { ok: false, error: explainMailError(error) };
  }
}

async function sendResend(to: string, subject: string, text: string, attachments?: MailAttachment[]): Promise<MailResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESET_EMAIL_FROM,
        to: [to],
        subject,
        text,
        ...(attachments?.length ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) } : {}),
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error(`Échec envoi e-mail Resend (HTTP ${response.status}) : ${body}`);
      console.error(`[MAIL] Échec Resend (HTTP ${response.status}) : ${body}`);
      return { ok: false, error: `Resend (HTTP ${response.status}) : ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (error: any) {
    logger.error(`Échec envoi e-mail Resend : ${error?.message || error}`);
    console.error("[MAIL] Échec Resend :", error?.message || error);
    return { ok: false, error: explainMailError(error) };
  }
}

/** Résultat détaillé d'un envoi : « error » explique la cause en français (affichée à l'administrateur). */
export interface MailResult {
  ok: boolean;
  error?: string;
}

/** Traduit l'erreur SMTP / réseau en cause lisible (la valeur brute reste dans les journaux du serveur). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function explainMailError(error: any): string {
  const raw = String(error?.response || error?.message || error || "").replace(/\s+/g, " ").trim();
  const code = String(error?.code || "");
  const status = Number(error?.responseCode || 0);

  if (code === "EAUTH" || status === 535) return "Identifiants SMTP refusés (SMTP_USER / SMTP_PASS : utilisez un mot de passe d'application Gmail).";
  if (status === 550 || status === 553 || /5\.1\.1|does not exist|user unknown|no such user/i.test(raw)) return "Adresse e-mail refusée : elle n'existe pas ou est mal écrite.";
  if (status === 552 || /too large|message size|size limit/i.test(raw)) return "Pièces jointes trop lourdes pour le serveur de messagerie.";
  if (status === 421 || status === 450 || status === 451 || status === 452 || /rate|limit|quota|too many/i.test(raw)) return "Limite d'envoi atteinte chez le fournisseur d'e-mail : réessayez plus tard.";
  if (["ETIMEDOUT", "ECONNECTION", "ECONNREFUSED", "ESOCKET", "EDNS", "ENOTFOUND"].includes(code)) return "Connexion au serveur de messagerie impossible (réseau, SMTP_HOST ou SMTP_PORT).";

  return raw ? `Erreur du serveur de messagerie : ${raw.slice(0, 200)}` : "Erreur inconnue du serveur de messagerie.";
}

/** Comme sendEmail, mais renvoie aussi la cause de l'échec. */
export async function sendEmailDetailed(to: string, subject: string, text: string, attachments?: MailAttachment[]): Promise<MailResult> {
  if (smtpConfigured()) return sendSmtp(to, subject, text, attachments);
  if (resendConfigured()) return sendResend(to, subject, text, attachments);
  return { ok: false, error: "E-mail non configuré sur le serveur." };
}

export async function sendEmail(to: string, subject: string, text: string, attachments?: MailAttachment[]): Promise<boolean> {
  return (await sendEmailDetailed(to, subject, text, attachments)).ok;
}
