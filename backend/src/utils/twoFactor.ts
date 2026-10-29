import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";

// Tolérance ±30 s (décalage d'horloge du téléphone)
authenticator.options = { window: 1 };

const ISSUER = "Ndao Hifanosika";

/** Clé AES-256 : 64 caractères hexadécimaux dans TWO_FACTOR_KEY (.env). */
export function twoFactorKey(): Buffer {
  const hex = process.env.TWO_FACTOR_KEY || "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("TWO_FACTOR_KEY invalide : 64 caractères hexadécimaux requis.");
  }
  return Buffer.from(hex, "hex");
}

/** Le secret TOTP n'est jamais stocké en clair en base. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", twoFactorKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(payload: string): string {
  const [iv, tag, enc] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", twoFactorKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export const generateSecret = () => authenticator.generateSecret();

export const buildOtpauthUrl = (accountName: string, secret: string) =>
  authenticator.keyuri(accountName, ISSUER, secret);

export const buildQrDataUrl = (otpauthUrl: string) =>
  QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });

export function verifyCode(secret: string, code: string): boolean {
  const clean = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  return authenticator.check(clean, secret);
}

/* ---------- Codes de secours (usage unique) ---------- */
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const normalize = (c: string) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function generateBackupCodes(count = 8): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 car.
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { plain, hashed: plain.map((c) => sha(normalize(c))) };
}

/** Renvoie la nouvelle liste (code retiré) ou null si le code est invalide. */
export function consumeBackupCode(hashedList: string[], code: string): string[] | null {
  const hash = sha(normalize(code));
  const i = hashedList.indexOf(hash);
  return i === -1 ? null : hashedList.filter((_, idx) => idx !== i);
}

/** Vérifie un code TOTP, sinon un code de secours. */
export function checkSecondFactor(
  user: { twoFactorSecret: string | null; twoFactorBackupCodes: string[] | null },
  code: string,
): { valid: boolean; remainingBackup?: string[] } {
  if (!user.twoFactorSecret) return { valid: false };
  if (verifyCode(decryptSecret(user.twoFactorSecret), code)) return { valid: true };
  const left = consumeBackupCode(user.twoFactorBackupCodes ?? [], code);
  return left ? { valid: true, remainingBackup: left } : { valid: false };
}
