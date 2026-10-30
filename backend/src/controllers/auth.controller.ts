import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { createHash, randomBytes, randomInt } from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { isSmsConfigured, normalizePhone, sendSms } from "../utils/sms";
import { isEmailConfigured, sendEmail } from "../utils/mailer";

import { sendError } from "../middlewares/error.middleware";
import { isValidEmail } from "../validators";
interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET est introuvable dans le fichier .env");
  }

  return secret;
}

function generateAccessToken(user: {
  id: number;
  email: string;
  role: string;
}): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN || "1d") as jwt.SignOptions["expiresIn"],
  });
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET est introuvable dans le fichier .env");
  return secret;
}

function generateRefreshToken(user: {
  id: number;
  email: string;
  role: string;
}): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, getRefreshSecret(), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"],
  });
}

function formatUser(user: any) {
  return {
    id: String(user.id),
    name: `${user.firstName} ${user.lastName}`.trim(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    role: user.role,
    status: user.status,
    department: user.department?.name || "",
    departmentId: user.departmentId ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

// ============================================================
// LOGIN
// ============================================================

export async function login(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "L'adresse e-mail et le mot de passe sont obligatoires.",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      include: {
        department: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Adresse e-mail ou mot de passe incorrect.",
      });
    }

    /*
     * Tous les nouveaux comptes doivent avoir
     * un mot de passe bcrypt.
     */
    const passwordValid = await bcrypt.compare(
      String(password),
      user.password,
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message:
          "Adresse e-mail ou mot de passe incorrect.",
      });
    }

    /*
     * Le compte doit être ACTIVE pour obtenir
     * un JWT.
     */
    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: `Votre compte est actuellement ${user.status.toLowerCase()}.`,
        status: user.status,
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    logger.info(`Connexion réussie : ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "Connexion réussie.",
      data: {
        user: formatUser({
          ...user,
          lastLoginAt: new Date(),
        }),
        accessToken,
        refreshToken,
        expiresIn: 86400,
      },
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la connexion.",
      error,
    );

    return sendError(res, error, "Erreur interne du serveur.");
  }
}

// ============================================================
// REGISTER
// ============================================================

export async function register(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const {
      firstName,
      lastName,
      name,
      email,
      password,
      phone,
      gender,
      departmentId,
    } = req.body;

    /*
     * Compatibilité avec :
     * firstName + lastName
     *
     * ou :
     * name
     */
    let finalFirstName = firstName;
    let finalLastName = lastName;

    if ((!finalFirstName || !finalLastName) && name) {
      const nameParts = String(name)
        .trim()
        .split(/\s+/);

      // Un seul mot = nom de famille (le prénom est facultatif)
      if (nameParts.length === 1) {
        finalFirstName = "";
        finalLastName = nameParts[0] || "";
      } else {
        finalFirstName = nameParts[0] || "";
        finalLastName =
          nameParts.slice(1).join(" ") || "";
      }
    }

    if (
      !finalLastName ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le nom, l'adresse e-mail et le mot de passe sont obligatoires (le prénom est facultatif).",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "L'adresse e-mail est invalide.",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe doit contenir au moins 8 caractères.",
      });
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Cette adresse e-mail est déjà utilisée.",
      });
    }

    /*
     * Le rôle envoyé par le frontend est volontairement
     * ignoré.
     *
     * Une inscription publique crée toujours :
     *
     * role   = STAGIAIRE_L3
     * status = PENDING
     *
     * Le rôle pourra ensuite être modifié par une personne
     * autorisée depuis le module de gestion des utilisateurs.
     */
    const hashedPassword = await bcrypt.hash(
      String(password),
      12,
    );

    const parsedDepartmentId =
      departmentId !== undefined &&
      departmentId !== null &&
      departmentId !== ""
        ? Number(departmentId)
        : null;

    if (
      parsedDepartmentId !== null &&
      !Number.isInteger(parsedDepartmentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de département invalide.",
      });
    }

    const user = await prisma.user.create({
      data: {
        firstName: String(finalFirstName ?? "").trim(),
        lastName: String(finalLastName).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone ? String(phone).trim() : null,
        gender: gender || null,

        // IMPORTANT :
        // jamais de role venant directement du frontend
        role: "STAGIAIRE_L3",

        // validation administrative obligatoire
        status: "PENDING",

        departmentId: parsedDepartmentId,
      },
      include: {
        department: true,
      },
    });

    logger.info(
      `Nouvelle inscription : ${user.email}`,
    );

    return res.status(201).json({
      success: true,
      message:
        "Inscription enregistrée. Votre compte doit être validé par un administrateur.",
      data: {
        user: formatUser(user),
        accessToken: "",
        refreshToken: "",
        expiresIn: 0,
      },
    });
  } catch (error) {
    logger.error(
      "Erreur lors de l'inscription.",
      error,
    );

    return sendError(res, error, "Erreur interne du serveur.");
  }
}

// ============================================================
// REFRESH TOKEN
// ============================================================

export async function refresh(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token manquant.",
      });
    }

    const decoded = jwt.verify(
      String(refreshToken),
      getRefreshSecret(),
    ) as JwtPayload & { exp?: number };

    const tokenHash = hashRefreshToken(String(refreshToken));
    const revokedToken = await prisma.revokedRefreshToken.findUnique({
      where: { tokenHash },
    });

    if (revokedToken && revokedToken.expiresAt > new Date()) {
      return res.status(401).json({
        success: false,
        message: "Refresh token révoqué.",
      });
    }

    if (revokedToken) {
      await prisma.revokedRefreshToken.delete({ where: { tokenHash } });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      include: {
        department: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Le compte n'est pas actif.",
      });
    }

    const accessToken =
      generateAccessToken(user);

    const newRefreshToken =
      generateRefreshToken(user);

    // Rotation à usage unique : l’ancien refresh token ne peut plus être rejoué.
    await prisma.revokedRefreshToken.create({
      data: {
        tokenHash,
        expiresAt: new Date((decoded.exp ?? Math.floor(Date.now() / 1000) + 7 * 86400) * 1000),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Token actualisé.",
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 86400,
      },
    });
  } catch (error) {
    logger.error(
      "Erreur lors du refresh token.",
      error,
    );

    return res.status(401).json({
      success: false,
      message:
        "Refresh token invalide ou expiré.",
    });
  }
}

// ============================================================
// ME
// ============================================================

export async function me(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    /*
     * Le userId doit venir du JWT.
     *
     * Il ne faut plus utiliser :
     * /auth/me/:id
     *
     * sinon un utilisateur peut tenter de consulter
     * le profil d'un autre utilisateur.
     */

    const authenticatedRequest = req as Request & {
      user?: {
        id: number;
        email: string;
        role: string;
        status?: string;
      };
    };

    if (!authenticatedRequest.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const userId = authenticatedRequest.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        department: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Le compte n'est pas actif.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: formatUser(user),
      },
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération du profil.",
      error,
    );

    return sendError(res, error, "Erreur interne du serveur.");
  }
}

// ============================================================
// LOGOUT
// ============================================================

export async function logout(
  req: Request,
  res: Response,
): Promise<Response> {
  const refreshToken = req.body?.refreshToken;

  // Réponse idempotente : le client peut nettoyer sa session même si le token est déjà invalide.
  if (typeof refreshToken === "string" && refreshToken.length > 0) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        getRefreshSecret(),
      ) as JwtPayload & { exp?: number };
      const tokenHash = hashRefreshToken(refreshToken);
      const existing = await prisma.revokedRefreshToken.findUnique({
        where: { tokenHash },
      });

      if (!existing) {
        await prisma.revokedRefreshToken.create({
          data: {
            tokenHash,
            expiresAt: new Date((decoded.exp ?? Math.floor(Date.now() / 1000) + 7 * 86400) * 1000),
          },
        });
      }
    } catch {
      // Ne révèle pas si un refresh token fourni était valide ou déjà expiré.
    }
  }

  return res.status(200).json({
    success: true,
    message: "Déconnexion réussie.",
  });
}

// ============================================================
// FORGOT PASSWORD — jeton opaque, stocké uniquement sous forme hachée
// Envoi par l'API Resend; aucun secret ni jeton n'est journalisé.
// ============================================================

const hashResetToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const hashRefreshToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function sendResetEmail(email: string, token: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESET_EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY et RESET_EMAIL_FROM doivent être configurés pour l'envoi des e-mails.");
  }
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const link = `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Réinitialisation de votre mot de passe — Ndao Hifanosika",
      text: `Une demande de réinitialisation a été effectuée. Ce lien expire dans 30 minutes : ${link}. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    }),
  });
  if (!response.ok) throw new Error(`Échec de l'envoi du courriel (HTTP ${response.status}).`);
}

// ============================================================
// RÉINITIALISATION PAR SMS — code à 6 chiffres (10 min, 5 essais)
// ============================================================

const hashSmsCode = (userId: number, code: string) =>
  createHash("sha256").update(`sms:${userId}:${code}`).digest("hex");

async function findActiveUserByPhone(rawPhone: string) {
  const wanted = normalizePhone(rawPhone);
  if (!wanted) return null;

  const candidates = await prisma.user.findMany({
    where: { phone: { not: null }, status: "ACTIVE" },
    select: { id: true, phone: true },
  });

  return candidates.find((user) => normalizePhone(user.phone) === wanted) ?? null;
}

async function forgotPasswordBySms(req: Request, res: Response, generic: object): Promise<Response> {
  const rawPhone = String(req.body?.phone || "");

  if (!normalizePhone(rawPhone)) {
    return res.status(400).json({ success: false, message: "Numéro de téléphone invalide." });
  }

  if (!isSmsConfigured()) {
    return res.status(503).json({ success: false, code: "SMS_DELIVERY_UNAVAILABLE", message: "L'envoi de SMS n'est pas configuré. Contactez l'administrateur." });
  }

  const user = await findActiveUserByPhone(rawPhone);
  // Réponse identique pour ne pas révéler l'existence d'un compte.
  if (!user) return res.status(200).json(generic);

  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, expiresAt: { gt: new Date(Date.now() - 50 * 60 * 1000) } },
  });
  if (recent >= 4) {
    return res.status(429).json({ success: false, message: "Trop de demandes. Réessayez dans une heure." });
  }

  const code = String(randomInt(100000, 1000000));

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashSmsCode(user.id, code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const sent = await sendSms(
    String(user.phone),
    `Ndao Hifanosika : votre code de verification est ${code}. Il expire dans 10 minutes. Ne le partagez jamais.`,
  );

  if (!sent) {
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash: hashSmsCode(user.id, code) } });
    return res.status(503).json({ success: false, code: "SMS_DELIVERY_UNAVAILABLE", message: "Le SMS n'a pas pu être envoyé. Réessayez plus tard." });
  }

  return res.status(200).json(generic);
}

async function verifySmsCode(req: Request, res: Response): Promise<Response> {
  const invalid = { success: false, message: "Code incorrect ou expiré." };
  const code = String(req.body?.code || "").trim();

  if (!/^\d{6}$/.test(code)) return res.status(400).json(invalid);

  const user = await findActiveUserByPhone(String(req.body?.phone || ""));
  if (!user) return res.status(400).json(invalid);

  const record = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
  });

  if (!record || record.attempts >= 5) return res.status(400).json(invalid);

  if (record.tokenHash !== hashSmsCode(user.id, code)) {
    await prisma.passwordResetToken.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return res.status(400).json(invalid);
  }

  // Code valide : on le consomme et on délivre un jeton de réinitialisation (30 min)
  const rawToken = randomBytes(32).toString("hex");

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    }),
  ]);

  return res.status(200).json({ success: true, token: rawToken, message: "Code vérifié." });
}

// ============================================================
// MOT DE PASSE OUBLIÉ — code à 6 chiffres par e-mail ou SMS
// (accepte { identifier, channel } ; l'ancien format { email } / { phone } reste valide)
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashMailCode = (userId: number, code: string) =>
  createHash("sha256").update(`mail:${userId}:${code}`).digest("hex");

async function findResetUser(identifier: string) {
  const value = identifier.trim();
  if (EMAIL_RE.test(value)) {
    return prisma.user.findFirst({
      where: { email: { equals: value, mode: "insensitive" }, status: "ACTIVE" },
      select: { id: true, email: true, phone: true },
    });
  }
  const byPhone = await findActiveUserByPhone(value);
  if (!byPhone) return null;
  return prisma.user.findUnique({ where: { id: byPhone.id }, select: { id: true, email: true, phone: true } });
}

export async function forgotPassword(req: Request, res: Response): Promise<Response> {
  const generic = { success: true, message: "Si ce compte existe, un code de vérification vient d'être envoyé." };
  try {
    const identifier = String(req.body?.identifier ?? req.body?.email ?? req.body?.phone ?? "").trim();
    const isEmail = EMAIL_RE.test(identifier);

    if (!identifier || identifier.length > 254 || (!isEmail && !normalizePhone(identifier))) {
      return res.status(400).json({ success: false, message: isEmail || !identifier ? "Adresse e-mail invalide." : "Numéro de téléphone invalide." });
    }

    const channel: "email" | "sms" = isEmail
      ? (req.body?.channel === "sms" ? "sms" : "email")
      : "sms";

    if (channel === "email" && !isEmailConfigured()) {
      return res.status(503).json({ success: false, code: "EMAIL_DELIVERY_UNAVAILABLE", message: "L'envoi d'e-mail n'est pas configuré (RESEND_API_KEY / RESET_EMAIL_FROM). Contactez l'administrateur." });
    }
    if (channel === "sms" && !isSmsConfigured()) {
      return res.status(503).json({ success: false, code: "SMS_DELIVERY_UNAVAILABLE", message: "L'envoi de SMS n'est pas configuré. Contactez l'administrateur." });
    }

    const user = await findResetUser(identifier);
    // Réponse identique : on ne révèle pas l'existence d'un compte.
    if (!user) return res.status(200).json(generic);

    const recent = await prisma.passwordResetToken.count({
      where: { userId: user.id, expiresAt: { gt: new Date(Date.now() - 50 * 60 * 1000) } },
    });
    if (recent >= 4) {
      return res.status(429).json({ success: false, message: "Trop de demandes. Réessayez dans une heure." });
    }

    const code = String(randomInt(100000, 1000000));
    const tokenHash = channel === "email" ? hashMailCode(user.id, code) : hashSmsCode(user.id, code);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    let sent = false;
    if (channel === "email") {
      sent = await sendEmail(
        String(user.email),
        "Votre code de vérification — Ndao Hifanosika",
        `Votre code de vérification est : ${code}\n\nIl expire dans 10 minutes. Ne le partagez jamais.\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      );
    } else if (user.phone) {
      sent = await sendSms(
        String(user.phone),
        `Ndao Hifanosika : votre code de verification est ${code}. Il expire dans 10 minutes. Ne le partagez jamais.`,
      );
    }

    if (!sent) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      return res.status(503).json({
        success: false,
        code: channel === "email" ? "EMAIL_DELIVERY_UNAVAILABLE" : "SMS_DELIVERY_UNAVAILABLE",
        message: channel === "email"
          ? "L'e-mail n'a pas pu être envoyé. Vérifiez la configuration Resend ou réessayez plus tard."
          : "Le SMS n'a pas pu être envoyé (aucun numéro enregistré ou service indisponible).",
      });
    }

    return res.status(200).json(generic);
  } catch (error) {
    logger.error("Erreur lors de la demande de réinitialisation.", error);
    return sendError(res, error, "Erreur interne du serveur.");
  }
}

export async function verifyResetCode(req: Request, res: Response): Promise<Response> {
  try {
    const identifier = String(req.body?.identifier ?? req.body?.email ?? req.body?.phone ?? "").trim();
    const code = String(req.body?.code ?? "").trim();

    if (identifier && code) {
      const invalid = { success: false, message: "Code incorrect ou expiré." };
      if (!/^\d{6}$/.test(code)) return res.status(400).json(invalid);

      const user = await findResetUser(identifier);
      if (!user) return res.status(400).json(invalid);

      const record = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: "desc" },
      });
      if (!record || record.attempts >= 5) return res.status(400).json(invalid);

      if (record.tokenHash !== hashMailCode(user.id, code) && record.tokenHash !== hashSmsCode(user.id, code)) {
        await prisma.passwordResetToken.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
        return res.status(400).json(invalid);
      }

      const rawToken = randomBytes(32).toString("hex");
      await prisma.$transaction([
        prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
        prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: hashResetToken(rawToken), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
        }),
      ]);

      return res.status(200).json({ success: true, token: rawToken, data: { resetToken: rawToken }, message: "Code vérifié." });
    }

    // Ancien format : vérification d'un jeton de lien
    const token = String(req.body?.token || "");
    if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ success: false, message: "Code incorrect ou expiré." });
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
    if (!record || record.usedAt || record.expiresAt <= new Date() || record.attempts >= 5) {
      return res.status(400).json({ success: false, message: "Lien de réinitialisation invalide ou expiré." });
    }
    return res.status(200).json({ success: true, message: "Lien de réinitialisation valide." });
  } catch (error) {
    logger.error("Erreur lors de la vérification du code de réinitialisation.", error);
    return sendError(res, error, "Erreur interne du serveur.");
  }
}

export async function resetPassword(req: Request, res: Response): Promise<Response> {
  try {
    const token = String(req.body?.token || "");
    const newPassword = String(req.body?.newPassword || "");
    if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ success: false, message: "Lien de réinitialisation invalide ou expiré." });
    if (newPassword.length < 12 || newPassword.length > 128) return res.status(400).json({ success: false, message: "Le mot de passe doit contenir entre 12 et 128 caractères." });
    const tokenHash = hashResetToken(token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt <= new Date() || record.attempts >= 5) {
      if (record && !record.usedAt) await prisma.passwordResetToken.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      return res.status(400).json({ success: false, message: "Lien de réinitialisation invalide ou expiré." });
    }
    const password = await bcrypt.hash(newPassword, 12);
    // Transaction atomique : changement du mot de passe et consommation du jeton.
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.passwordResetToken.updateMany({ where: { userId: record.userId, id: { not: record.id }, usedAt: null }, data: { usedAt: new Date() } }),
    ]);
    return res.status(200).json({ success: true, message: "Mot de passe réinitialisé avec succès. Vous pouvez vous connecter." });
  } catch (error) {
    logger.error("Erreur lors de la réinitialisation du mot de passe.", error);
    return sendError(res, error, "Erreur interne du serveur.");
  }
}
