import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Authentification à deux facteurs TOTP (RFC 6238), compatible Google Authenticator, Microsoft
 * Authenticator, Authy, FreeOTP… Aucune dépendance externe.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const STEP_SECONDS = 30;
export const DIGITS = 6;

/* ----------------------------- Base32 (RFC 4648) ----------------------------- */

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];

  return output;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Clé Base32 invalide");

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export const generateSecret = (bytes = 20): string => base32Encode(randomBytes(bytes));

/* ----------------------------- TOTP ----------------------------- */

export function hotp(key: Buffer, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

export const currentStep = (now = Date.now()): number => Math.floor(now / 1000 / STEP_SECONDS);

const safeEqual = (a: string, b: string): boolean =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Code à 6 chiffres saisi par l'utilisateur, sans espaces ni tirets. */
export const cleanCode = (code: unknown): string => String(code ?? "").replace(/[\s-]/g, "");

/**
 * Vérifie un code TOTP avec une tolérance d'une période (± 30 s, décalage d'horloge du téléphone).
 * `minStep` interdit de rejouer un code déjà utilisé. Retourne le pas validé, sinon null.
 */
export function verifyTotp(
  secret: string,
  code: unknown,
  options: { window?: number; now?: number; minStep?: number | null } = {},
): number | null {
  const clean = cleanCode(code);
  if (!/^\d{6}$/.test(clean)) return null;

  const { window = 1, now = Date.now(), minStep = null } = options;
  const key = base32Decode(secret);
  const step = currentStep(now);

  for (let delta = -window; delta <= window; delta += 1) {
    const candidate = step + delta;
    if (minStep !== null && candidate <= minStep) continue;
    if (safeEqual(hotp(key, candidate), clean)) return candidate;
  }

  return null;
}

export function otpauthUrl(params: { secret: string; account: string; issuer: string }): string {
  const label = `${encodeURIComponent(params.issuer)}:${encodeURIComponent(params.account)}`;
  // encodeURIComponent (et non URLSearchParams) : « %20 » pour l'espace, « + » s'afficherait tel quel dans l'application
  const query = [
    ["secret", params.secret],
    ["issuer", params.issuer],
    ["algorithm", "SHA1"],
    ["digits", String(DIGITS)],
    ["period", String(STEP_SECONDS)],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return `otpauth://totp/${label}?${query}`;
}

/* ----------------------------- Chiffrement de la clé (AES-256-GCM) ----------------------------- */

function encryptionKey(): Buffer {
  const secret = process.env.TWO_FACTOR_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error("TWO_FACTOR_KEY ou JWT_SECRET est requis pour protéger les clés 2FA.");

  return createHash("sha256").update(`ndao-2fa:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(token: string): string {
  const [version, iv, tag, data] = token.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Clé 2FA illisible");

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

/* ----------------------------- Codes de secours ----------------------------- */

export const BACKUP_CODE_COUNT = 8;

/** Codes à usage unique, au format XXXX-XXXX (hexadécimal). */
export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(4).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}

export const normalizeBackupCode = (code: unknown): string =>
  String(code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const looksLikeBackupCode = (code: unknown): boolean => /^[A-F0-9]{8}$/.test(normalizeBackupCode(code));

export const hashBackupCode = (code: unknown): string =>
  createHash("sha256").update(`ndao-backup:${normalizeBackupCode(code)}`).digest("hex");
