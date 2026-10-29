import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { isEnabled, lockedMinutes, recordFailure, clearFailures, verifyCode } from "../services/twoFactor.service";

/**
 * Deuxième étape de connexion (POST /api/auth/login).
 *
 * Placé AVANT le contrôleur de connexion : si le compte a activé l'authentification à deux facteurs
 * ET que le mot de passe est correct, il réclame le code de l'application d'authentification.
 * Dans tous les autres cas, il laisse passer : le contrôleur existant répond comme avant
 * (aucune fuite d'information : sans bon mot de passe, on ne révèle jamais l'état de la 2FA).
 *
 *   1) mot de passe seul        -> 200 { requiresTwoFactor: true }
 *   2) mot de passe + code      -> poursuite normale de la connexion si le code est valide
 *   3) code faux                -> 401 { twoFactorInvalid: true }  /  trop d'essais -> 429
 */
export async function twoFactorGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !password) return next();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") return next();
    if (!(await isEnabled(user.id))) return next();
    if (!(await bcrypt.compare(password, user.password))) return next();

    const code = String(req.body?.twoFactorCode ?? "").trim();

    if (!code) {
      res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        message: "Saisissez le code à 6 chiffres de votre application d'authentification.",
      });
      return;
    }

    const locked = lockedMinutes(user.id);

    if (locked) {
      res.status(429).json({
        success: false,
        twoFactorInvalid: true,
        message: `Trop d'essais. Réessayez dans ${locked} minute(s).`,
      });
      return;
    }

    const method = await verifyCode(user.id, code);

    if (!method) {
      recordFailure(user.id);

      res.status(401).json({
        success: false,
        twoFactorInvalid: true,
        message: "Code de vérification incorrect.",
      });
      return;
    }

    clearFailures(user.id);
    if (method === "backup") logger.info(`Connexion avec un code de secours : ${email}`);

    // Le contrôleur ne connaît pas ce champ : il ne le loggue ni ne le stocke
    delete req.body.twoFactorCode;
    next();
  } catch (error) {
    next(error);
  }
}
