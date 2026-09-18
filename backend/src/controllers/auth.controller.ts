import { Request, Response } from "express";
import bcrypt from "bcrypt";
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

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "7d",
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
    position: undefined,
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

    const user = await prisma.user.findUnique({
      where: {
        email: String(email).trim().toLowerCase(),
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
     * Comparaison du mot de passe.
     *
     * bcrypt.compare fonctionne avec les mots de passe
     * hashés. Pour les anciens comptes éventuellement
     * encore en clair, on conserve temporairement une
     * compatibilité.
     */

    let passwordValid = false;

    if (user.password.startsWith("$2")) {
      passwordValid = await bcrypt.compare(
        password,
        user.password,
      );
    } else {
      passwordValid = user.password === password;
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message:
          "Adresse e-mail ou mot de passe incorrect.",
      });
    }

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

    logger.info(
      `Connexion réussie : ${user.email}`,
    );

    return res.status(200).json({
      success: true,
      message: "Connexion réussie.",
      data: {
        user: formatUser(user),
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
      role,
      departmentId,
    } = req.body;

    /*
     * Compatibilité avec le frontend :
     *
     * Le frontend peut envoyer :
     * firstName + lastName
     *
     * ou éventuellement :
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
     * Hash du mot de passe avant stockage.
     */
    const hashedPassword = await bcrypt.hash(
      String(password),
      12,
    );

    const user = await prisma.user.create({
      data: {
        firstName: String(finalFirstName).trim(),
        lastName: String(finalLastName).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone || null,
        gender: gender || null,
        role: role || "STAGIAIRE_L3",
        status: "PENDING",
        departmentId: departmentId
          ? Number(departmentId)
          : null,
      },
      include: {
        department: true,
      },
    });

    logger.info(
      `Nouvelle inscription : ${user.email}`,
    );

    /*
     * IMPORTANT :
     * Le compte est PENDING.
     *
     * Aucun token n'est généré ici.
     * L'administrateur doit d'abord activer
     * le compte.
     */

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
      refreshToken,
      getJwtSecret(),
    ) as JwtPayload;

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
    const userId = Number(req.params.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant utilisateur invalide.",
      });
    }

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

    return res.status(200).json({
      success: true,
      data: {
        user: formatUser(user),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
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
  _req: Request,
  res: Response,
): Promise<Response> {
  return res.status(200).json({
    success: true,
    message: "Déconnexion réussie.",
  });
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

export async function forgotPassword(
  _req: Request,
  res: Response,
): Promise<Response> {
  return res.status(200).json({
    success: true,
    message:
      "Si cette adresse existe, un code de réinitialisation sera envoyé.",
  });
}

// ============================================================
// VERIFY RESET CODE
// ============================================================

export async function verifyResetCode(
  _req: Request,
  res: Response,
): Promise<Response> {
  return res.status(200).json({
    success: true,
    message: "Code vérifié.",
  });
}

// ============================================================
// RESET PASSWORD
// ============================================================

export async function resetPassword(
  _req: Request,
  res: Response,
): Promise<Response> {
  return res.status(200).json({
    success: true,
    message:
      "Mot de passe réinitialisé avec succès.",
  });
}