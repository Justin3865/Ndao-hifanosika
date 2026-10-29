import { Router, type RequestHandler } from "express";
import { prisma } from "../config/database";
import { twoFactorLimiter } from "../middleware/twoFactorGate";
import { fail, h, ok, reqUserId } from "../utils/http";
import {
  buildOtpauthUrl, buildQrDataUrl, checkSecondFactor, decryptSecret, encryptSecret,
  generateBackupCodes, generateSecret, verifyCode,
} from "../utils/twoFactor";

async function audit(req: any, userId: number, action: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId, action, entity: "User", entityId: userId,
        ipAddress: req.ip, userAgent: String(req.headers?.["user-agent"] ?? "").slice(0, 250),
      },
    });
  } catch { /* l'audit ne doit jamais bloquer */ }
}

const USER_2FA = { id: true, email: true, twoFactorEnabled: true, twoFactorSecret: true, twoFactorBackupCodes: true } as const;

/** Monter avec : app.use("/api/security", securityRouter(authenticate)) */
export function securityRouter(authenticate: RequestHandler): Router {
  const router = Router();

  router.get("/2fa/status", authenticate, h(async (req, res) => {
    const u = await prisma.user.findUnique({ where: { id: reqUserId(req) }, select: USER_2FA });
    if (!u) return fail(res, 404, "Utilisateur introuvable.");
    ok(res, { enabled: u.twoFactorEnabled, backupCodesLeft: u.twoFactorBackupCodes?.length ?? 0 });
  }));

  // 1) Préparer : secret + QR (pas encore actif)
  router.post("/2fa/setup", authenticate, h(async (req, res) => {
    const u = await prisma.user.findUnique({ where: { id: reqUserId(req) }, select: USER_2FA });
    if (!u) return fail(res, 404, "Utilisateur introuvable.");
    if (u.twoFactorEnabled) return fail(res, 400, "L'authentification à deux facteurs est déjà active.");

    const secret = generateSecret();
    await prisma.user.update({ where: { id: u.id }, data: { twoFactorSecret: encryptSecret(secret) } });
    ok(res, { qr: await buildQrDataUrl(buildOtpauthUrl(u.email, secret)), secret });
  }));

  // 2) Activer : confirme avec un premier code
  router.post("/2fa/enable", authenticate, twoFactorLimiter, h(async (req, res) => {
    const u = await prisma.user.findUnique({ where: { id: reqUserId(req) }, select: USER_2FA });
    if (!u?.twoFactorSecret) return fail(res, 400, "Lancez d'abord la configuration.");
    if (u.twoFactorEnabled) return fail(res, 400, "Déjà actif.");
    if (!verifyCode(decryptSecret(u.twoFactorSecret), String(req.body?.code ?? ""))) {
      return fail(res, 400, "Code invalide. Vérifiez l'heure de votre téléphone.");
    }
    const { plain, hashed } = generateBackupCodes();
    await prisma.user.update({ where: { id: u.id }, data: { twoFactorEnabled: true, twoFactorBackupCodes: hashed } });
    await audit(req, u.id, "2FA_ENABLED");
    ok(res, { backupCodes: plain }); // affichés une seule fois
  }));

  // Désactiver : exige un code valide
  router.post("/2fa/disable", authenticate, twoFactorLimiter, h(async (req, res) => {
    const u = await prisma.user.findUnique({ where: { id: reqUserId(req) }, select: USER_2FA });
    if (!u?.twoFactorEnabled) return fail(res, 400, "Non activé.");
    if (!checkSecondFactor(u, String(req.body?.code ?? "")).valid) return fail(res, 400, "Code invalide.");
    await prisma.user.update({
      where: { id: u.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
    });
    await audit(req, u.id, "2FA_DISABLED");
    ok(res, { enabled: false });
  }));

  // Régénérer les codes de secours : exige un code valide (les anciens sont invalidés)
  router.post("/2fa/backup-codes", authenticate, twoFactorLimiter, h(async (req, res) => {
    const u = await prisma.user.findUnique({ where: { id: reqUserId(req) }, select: USER_2FA });
    if (!u?.twoFactorEnabled) return fail(res, 400, "Non activé.");
    if (!checkSecondFactor(u, String(req.body?.code ?? "")).valid) return fail(res, 400, "Code invalide.");
    const { plain, hashed } = generateBackupCodes();
    await prisma.user.update({ where: { id: u.id }, data: { twoFactorBackupCodes: hashed } });
    await audit(req, u.id, "2FA_BACKUP_CODES_REGENERATED");
    ok(res, { backupCodes: plain });
  }));

  return router;
}
