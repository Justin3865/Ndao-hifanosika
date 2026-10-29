import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { sendError } from "../middlewares/error.middleware";
import * as twoFactor from "../services/twoFactor.service";
import { getReqUser } from "../utils/dataScope";
import { db } from "../utils/db";

/**
 * Paramètres du compte (page « Paramètres ») : notifications, rappels, session, apparence,
 * et authentification à deux facteurs. Chaque utilisateur ne lit / ne modifie que les siens.
 */

const THEMES = ["Clair", "Sombre", "Système"];
const TIMEOUTS = [15, 30, 60, 120];
const BOOLEANS = ["emailNotifications", "pushNotifications", "evaluationReminders", "projectReminders", "reportReminders", "compactMode"] as const;

interface Preference {
  emailNotifications: boolean;
  pushNotifications: boolean;
  evaluationReminders: boolean;
  projectReminders: boolean;
  reportReminders: boolean;
  sessionTimeout: number;
  theme: string;
  compactMode: boolean;
}

const DEFAULTS: Preference = {
  emailNotifications: true,
  pushNotifications: true,
  evaluationReminders: true,
  projectReminders: true,
  reportReminders: true,
  sessionTimeout: 30,
  theme: "Système",
  compactMode: false,
};

function unauthorized(res: Response): void {
  res.status(401).json({ success: false, message: "Utilisateur non authentifié" });
}

const toDto = (pref: Preference, twoFactorAuth: boolean) => ({
  emailNotifications: pref.emailNotifications,
  pushNotifications: pref.pushNotifications,
  evaluationReminders: pref.evaluationReminders,
  projectReminders: pref.projectReminders,
  reportReminders: pref.reportReminders,
  twoFactorAuth,
  sessionTimeout: String(pref.sessionTimeout),
  theme: pref.theme,
  compactMode: pref.compactMode,
});

async function load(userId: number): Promise<Preference> {
  const saved = (await db.userPreference.findUnique({ where: { userId } })) as Preference | null;
  if (saved) return saved;

  // Premier accès : on reprend la préférence e-mail déjà utilisée par le système de notifications
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notifyEmail: true } });
  return { ...DEFAULTS, emailNotifications: user?.notifyEmail ?? true };
}

/* ----------------------------- Préférences ----------------------------- */

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const [pref, enabled] = await Promise.all([load(user.id), twoFactor.isEnabled(user.id)]);

    res.json({ success: true, data: toDto(pref, enabled) });
  } catch (error) {
    logger.error("Erreur lecture paramètres", error);
    sendError(res, error, "Erreur lors de la lecture des paramètres");
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const body = req.body ?? {};
    const data: Partial<Preference> = {};

    for (const key of BOOLEANS) {
      if (body[key] === undefined) continue;
      if (typeof body[key] !== "boolean") {
        res.status(400).json({ success: false, message: `Valeur invalide pour « ${key} »` });
        return;
      }
      data[key] = body[key];
    }

    if (body.sessionTimeout !== undefined) {
      const minutes = Number(body.sessionTimeout);

      if (!TIMEOUTS.includes(minutes)) {
        res.status(400).json({ success: false, message: "Durée de session invalide (15, 30, 60 ou 120 minutes)" });
        return;
      }
      data.sessionTimeout = minutes;
    }

    if (body.theme !== undefined) {
      if (!THEMES.includes(String(body.theme))) {
        res.status(400).json({ success: false, message: "Thème invalide" });
        return;
      }
      data.theme = String(body.theme);
    }

    const current = await load(user.id);

    await db.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...current, ...data },
      update: data,
    });

    // Le système de notifications lit User.notifyEmail pour décider d'envoyer un e-mail
    if (data.emailNotifications !== undefined) {
      await prisma.user.update({ where: { id: user.id }, data: { notifyEmail: data.emailNotifications } });
    }

    const [pref, enabled] = await Promise.all([load(user.id), twoFactor.isEnabled(user.id)]);

    res.json({ success: true, message: "Paramètres enregistrés", data: toDto(pref, enabled) });
  } catch (error) {
    logger.error("Erreur enregistrement paramètres", error);
    sendError(res, error, "Erreur lors de l'enregistrement des paramètres");
  }
}

/* ----------------------------- Authentification à deux facteurs ----------------------------- */

function fail(res: Response, error: unknown, fallback: string): void {
  if (error instanceof twoFactor.TwoFactorError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }

  logger.error(fallback, error);
  sendError(res, error, fallback);
}

export async function twoFactorStatus(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    res.json({ success: true, data: await twoFactor.getStatus(user.id) });
  } catch (error) {
    fail(res, error, "Erreur lors de la lecture de l'état 2FA");
  }
}

/** Étape 1 : génère la clé et le QR code à scanner. */
export async function twoFactorSetup(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });

    res.json({ success: true, data: await twoFactor.beginSetup(user.id, account?.email ?? `user-${user.id}`) });
  } catch (error) {
    fail(res, error, "Erreur lors de la préparation de l'authentification à deux facteurs");
  }
}

/** Étape 2 : confirme avec le premier code ; renvoie les codes de secours (une seule fois). */
export async function twoFactorEnable(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const backupCodes = await twoFactor.confirmSetup(user.id, req.body?.code);

    res.json({ success: true, message: "Authentification à deux facteurs activée", data: { backupCodes } });
  } catch (error) {
    fail(res, error, "Erreur lors de l'activation");
  }
}

/** Opérations sensibles : mot de passe ET code actuel (application ou code de secours). */
async function reauthenticate(userId: number, body: { password?: unknown; code?: unknown }): Promise<void> {
  const account = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  const password = String(body?.password ?? "");

  if (!account || !password || !(await bcrypt.compare(password, account.password))) {
    throw new twoFactor.TwoFactorError("Mot de passe incorrect.", 401);
  }

  await twoFactor.assertCode(userId, body?.code);
}

export async function twoFactorDisable(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    await reauthenticate(user.id, req.body);
    await twoFactor.disable(user.id);

    res.json({ success: true, message: "Authentification à deux facteurs désactivée" });
  } catch (error) {
    fail(res, error, "Erreur lors de la désactivation");
  }
}

export async function twoFactorBackupCodes(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    await reauthenticate(user.id, req.body);

    res.json({ success: true, data: { backupCodes: await twoFactor.regenerateBackupCodes(user.id) } });
  } catch (error) {
    fail(res, error, "Erreur lors de la génération des codes de secours");
  }
}
