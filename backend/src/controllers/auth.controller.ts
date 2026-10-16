import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { isEmail, normalizePhone, sendEmail, sendSms } from "../services/delivery.service";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

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
    expiresIn: "1d",
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
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
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

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
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

      finalFirstName = nameParts[0] || "";
      finalLastName =
        nameParts.slice(1).join(" ") || "";
    }

    if (
      !finalFirstName ||
      !finalLastName ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le prénom, le nom, l'adresse e-mail et le mot de passe sont obligatoires.",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

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
        firstName: String(finalFirstName).trim(),
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

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
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

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
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

const hashCode = (userId: number, code: string) =>
  createHash("sha256")
    .update(`${userId}:${code}:${process.env.JWT_SECRET ?? ""}`)
    .digest("hex");

/** Retrouve un compte par e-mail OU numéro de téléphone. */
async function findUserByIdentifier(identifier: string) {
  if (isEmail(identifier)) {
    return prisma.user.findUnique({
      where: { email: identifier.toLowerCase() },
      select: { id: true, email: true, phone: true, status: true },
    });
  }
  const phone = normalizePhone(identifier);
  if (!phone) return null;
  const candidates = [phone, `0${phone.slice(4)}`, phone.slice(1)];
  return prisma.user.findFirst({
    where: { phone: { in: candidates } },
    select: { id: true, email: true, phone: true, status: true },
  });
}

/**
 * POST /api/auth/forgot-password  { identifier, channel?: "email" | "sms" }
 * Envoie un code à 6 chiffres (valable 10 min) par e-mail ou SMS.
 */
export async function forgotPassword(req: Request, res: Response): Promise<Response> {
  const generic = {
    success: true,
    message: "Si ce compte existe, un code de vérification vient d'être envoyé.",
  };
  try {
    const identifier = String(req.body?.identifier ?? req.body?.email ?? "").trim();
    if (!identifier || identifier.length > 254 || (!isEmail(identifier) && !normalizePhone(identifier))) {
      return res.status(400).json({ success: false, message: "Adresse e-mail ou numéro de téléphone invalide." });
    }
    const user = await findUserByIdentifier(identifier);
    if (!user || user.status !== "ACTIVE") return res.status(200).json(generic);

    const channel: "email" | "sms" =
      req.body?.channel === "sms" || (!isEmail(identifier) && req.body?.channel !== "email") ? "sms" : "email";
    if (channel === "sms" && !user.phone) {
      return res.status(400).json({ success: false, message: "Aucun numéro de téléphone n'est enregistré pour ce compte." });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashCode(user.id, code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    const text = `Votre code de réinitialisation Ndao Hifanosika est ${code}. Il expire dans 10 minutes. Ne le communiquez à personne.`;
    try {
      if (channel === "sms") await sendSms(user.phone!, text);
      else await sendEmail(user.email, "Code de réinitialisation — Ndao Hifanosika", text);
    } catch (deliveryError) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      logger.error("Échec d'envoi du code de réinitialisation.", deliveryError);
      return res.status(503).json({
        success: false,
        code: "DELIVERY_UNAVAILABLE",
        message: "L'envoi du code est indisponible. Contactez l'administrateur.",
      });
    }
    return res.status(200).json(generic);
  } catch (error) {
    logger.error("Erreur lors de la demande de réinitialisation.", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
}

/**
 * POST /api/auth/verify-reset-code  { identifier, code }
 * Code correct => renvoie un resetToken à usage unique (30 min)
 * à transmettre à POST /api/auth/reset-password { token, newPassword }.
 */
export async function verifyResetCode(req: Request, res: Response): Promise<Response> {
  const invalid = { success: false, message: "Code invalide ou expiré." };
  try {
    const identifier = String(req.body?.identifier ?? req.body?.email ?? "").trim();
    const code = String(req.body?.code ?? "").trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json(invalid);
    const user = await findUserByIdentifier(identifier);
    if (!user || user.status !== "ACTIVE") return res.status(400).json(invalid);

    const record = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!record || record.expiresAt <= new Date() || record.attempts >= 5) return res.status(400).json(invalid);
    if (record.tokenHash !== hashCode(user.id, code)) {
      await prisma.passwordResetToken.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      return res.status(400).json(invalid);
    }

    const resetToken = randomBytes(32).toString("hex");
    await prisma.$transaction([
      prisma.passwordResetToken.delete({ where: { id: record.id } }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashResetToken(resetToken), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
      }),
    ]);
    return res.status(200).json({ success: true, message: "Code vérifié.", data: { resetToken } });
  } catch (error) {
    logger.error("Erreur lors de la vérification du code.", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
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
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
}
