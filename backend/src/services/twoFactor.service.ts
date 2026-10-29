import { db } from "../utils/db";
import {
  BACKUP_CODE_COUNT,
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateSecret,
  hashBackupCode,
  looksLikeBackupCode,
  otpauthUrl,
  verifyTotp,
} from "../utils/totp";

/**
 * Authentification à deux facteurs : activation, vérification à la connexion, codes de secours.
 * Table UserTwoFactor (une ligne par utilisateur). La clé TOTP est chiffrée (AES-256-GCM).
 */

export const ISSUER = process.env.TWO_FACTOR_ISSUER || "Ndao Hifanosika";

interface TwoFactorRow {
  userId: number;
  secret: string;
  enabled: boolean;
  enabledAt: Date | null;
  backupCodes: string[] | null;
  lastUsedStep: number | null;
}

/* ----------------------------- Verrouillage anti force brute ----------------------------- */

const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;
const failures = new Map<number, { count: number; last: number; until: number }>();

/** Minutes restantes si le compte est temporairement verrouillé, sinon 0. */
export function lockedMinutes(userId: number): number {
  const entry = failures.get(userId);
  if (!entry || entry.until <= Date.now()) return 0;

  return Math.ceil((entry.until - Date.now()) / 60_000);
}

export function recordFailure(userId: number): void {
  const now = Date.now();
  const entry = failures.get(userId);
  const count = (entry && now - entry.last < LOCK_MS ? entry.count : 0) + 1;

  failures.set(userId, { count, last: now, until: count >= MAX_FAILURES ? now + LOCK_MS : 0 });
}

export function clearFailures(userId: number): void {
  failures.delete(userId);
}

/* ----------------------------- Lecture ----------------------------- */

const find = async (userId: number): Promise<TwoFactorRow | null> =>
  (await db.userTwoFactor.findUnique({ where: { userId } })) as TwoFactorRow | null;

export async function isEnabled(userId: number): Promise<boolean> {
  return !!(await find(userId))?.enabled;
}

export async function getStatus(userId: number) {
  const row = await find(userId);

  return {
    enabled: !!row?.enabled,
    enabledAt: row?.enabledAt ?? null,
    backupCodesLeft: row?.enabled ? (row.backupCodes?.length ?? 0) : 0,
    pendingSetup: !!row && !row.enabled,
  };
}

/* ----------------------------- Activation ----------------------------- */

async function qrDataUrl(text: string): Promise<string | null> {
  try {
    // Paquet facultatif : npm i qrcode — sans lui, l'utilisateur saisit la clé à la main
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const QRCode = require("qrcode");
    return (await QRCode.toDataURL(text, { margin: 1, width: 240, errorCorrectionLevel: "M" })) as string;
  } catch {
    return null;
  }
}

export class TwoFactorError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Génère une nouvelle clé (non active tant que le premier code n'est pas confirmé). */
export async function beginSetup(userId: number, account: string) {
  const row = await find(userId);
  if (row?.enabled) throw new TwoFactorError("L'authentification à deux facteurs est déjà activée.", 409);

  const secret = generateSecret();

  await db.userTwoFactor.upsert({
    where: { userId },
    create: { userId, secret: encryptSecret(secret), enabled: false, backupCodes: [] },
    update: { secret: encryptSecret(secret), enabled: false, backupCodes: [], lastUsedStep: null, enabledAt: null },
  });

  const url = otpauthUrl({ secret, account, issuer: ISSUER });

  return {
    secret,
    otpauthUrl: url,
    qrDataUrl: await qrDataUrl(url),
    issuer: ISSUER,
    account,
  };
}

/** Confirme l'application avec le premier code, puis délivre les codes de secours (affichés une seule fois). */
export async function confirmSetup(userId: number, code: unknown): Promise<string[]> {
  const row = await find(userId);

  if (!row) throw new TwoFactorError("Commencez par générer une clé.", 400);
  if (row.enabled) throw new TwoFactorError("L'authentification à deux facteurs est déjà activée.", 409);

  const locked = lockedMinutes(userId);
  if (locked) throw new TwoFactorError(`Trop d'essais. Réessayez dans ${locked} minute(s).`, 429);

  const step = verifyTotp(decryptSecret(row.secret), code);

  if (step === null) {
    recordFailure(userId);
    throw new TwoFactorError("Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.", 400);
  }

  clearFailures(userId);

  const codes = generateBackupCodes();

  await db.userTwoFactor.update({
    where: { userId },
    data: { enabled: true, enabledAt: new Date(), lastUsedStep: step, backupCodes: codes.map(hashBackupCode) },
  });

  return codes;
}

/* ----------------------------- Vérification (connexion, désactivation) ----------------------------- */

/** Code TOTP valide, ou code de secours (consommé). */
export async function verifyCode(userId: number, code: unknown): Promise<"totp" | "backup" | null> {
  const row = await find(userId);
  if (!row?.enabled) return null;

  if (looksLikeBackupCode(code)) {
    const hash = hashBackupCode(code);
    const list = row.backupCodes ?? [];

    if (!list.includes(hash)) return null;

    await db.userTwoFactor.update({ where: { userId }, data: { backupCodes: list.filter((item) => item !== hash) } });
    return "backup";
  }

  const step = verifyTotp(decryptSecret(row.secret), code, { minStep: row.lastUsedStep });
  if (step === null) return null;

  await db.userTwoFactor.update({ where: { userId }, data: { lastUsedStep: step } });
  return "totp";
}

/** Vérifie avec verrouillage : lève une erreur claire si le code est faux ou le compte verrouillé. */
export async function assertCode(userId: number, code: unknown): Promise<"totp" | "backup"> {
  const locked = lockedMinutes(userId);
  if (locked) throw new TwoFactorError(`Trop d'essais. Réessayez dans ${locked} minute(s).`, 429);

  const method = await verifyCode(userId, code);

  if (!method) {
    recordFailure(userId);
    throw new TwoFactorError("Code de vérification incorrect.", 401);
  }

  clearFailures(userId);
  return method;
}

export async function disable(userId: number): Promise<void> {
  await db.userTwoFactor.deleteMany({ where: { userId } });
}

export async function regenerateBackupCodes(userId: number): Promise<string[]> {
  const codes = generateBackupCodes(BACKUP_CODE_COUNT);

  await db.userTwoFactor.update({ where: { userId }, data: { backupCodes: codes.map(hashBackupCode) } });
  return codes;
}
