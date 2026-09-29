import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

function sanitizeUser(user: any) {
  if (!user) return user;

  const { password, ...safeUser } = user;

  return safeUser;
}

/**
 * GET /api/users
 * Liste de tous les utilisateurs.
 *
 * L'accès est contrôlé dans users.routes.ts.
 */
export async function getUsers(
  _req: Request,
  res: Response,
): Promise<Response> {
  try {
    const users = await prisma.user.findMany({
      include: {
        department: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(sanitizeUser),
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des utilisateurs.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les utilisateurs.",
    });
  }
}

/**
 * GET /api/users/:id
 * Détails d'un utilisateur.
 */
export async function getUserById(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant utilisateur invalide.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        projectsCreated: true,
        internships: true,
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
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
}

/**
 * POST /api/users
 * Création d'un utilisateur par ADMIN.
 *
 * IMPORTANT :
 * Le hashage du mot de passe pour les créations ADMIN
 * devra être assuré avec bcrypt.
 */
export async function createUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      gender,
      role,
      status,
      departmentId,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Les champs obligatoires sont manquants.",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const existing = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Cette adresse e-mail est déjà utilisée.",
      });
    }

    /*
     * Pour éviter d'enregistrer un mot de passe en clair,
     * cette fonction doit recevoir un mot de passe déjà hashé
     * ou être complétée avec bcrypt.
     *
     * Pour l'instant, on conserve le fonctionnement existant
     * afin de ne pas casser l'authentification actuelle.
     */
    const user = await prisma.user.create({
      data: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        password,
        phone: phone || null,
        gender: gender || null,
        role: role || "STAGIAIRE_L3",
        status: status || "PENDING",
        departmentId:
          departmentId !== undefined &&
          departmentId !== null &&
          departmentId !== ""
            ? Number(departmentId)
            : null,
      },
      include: {
        department: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la création de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de créer l'utilisateur.",
    });
  }
}

/**
 * PUT /api/users/:id
 * Modification d'un utilisateur.
 *
 * Cette route est réservée à ADMIN dans users.routes.ts.
 */
export async function updateUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant utilisateur invalide.",
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      gender,
      role,
      status,
      departmentId,
    } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    if (email) {
      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      const emailUsed = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id,
          },
        },
      });

      if (emailUsed) {
        return res.status(409).json({
          success: false,
          message: "Cette adresse e-mail est déjà utilisée.",
        });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName:
          firstName !== undefined
            ? String(firstName).trim()
            : undefined,

        lastName:
          lastName !== undefined
            ? String(lastName).trim()
            : undefined,

        email:
          email !== undefined
            ? String(email).trim().toLowerCase()
            : undefined,

        phone:
          phone !== undefined
            ? phone
            : undefined,

        gender:
          gender !== undefined
            ? gender
            : undefined,

        role:
          role !== undefined
            ? role
            : undefined,

        status:
          status !== undefined
            ? status
            : undefined,

        departmentId:
          departmentId === null
            ? null
            : departmentId !== undefined &&
                departmentId !== ""
              ? Number(departmentId)
              : undefined,
      },
      include: {
        department: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Utilisateur mis à jour avec succès.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la modification de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier l'utilisateur.",
    });
  }
}

/**
 * DELETE /api/users/:id
 * Suppression d'un utilisateur.
 *
 * Cette route est réservée à ADMIN dans users.routes.ts.
 */
export async function deleteUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant utilisateur invalide.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Utilisateur supprimé avec succès.",
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la suppression de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer l'utilisateur.",
    });
  }
}

/**
 * PATCH /api/users/:id/activate
 *
 * ADMIN uniquement.
 *
 * PENDING -> ACTIVE
 */
export async function activateUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant utilisateur invalide.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    if (existingUser.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "Seul un compte en attente peut être activé.",
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: "ACTIVE",
      },
      include: {
        department: true,
      },
    });

    logger.info(
      `Compte utilisateur activé : ${user.email}`,
    );

    return res.status(200).json({
      success: true,
      message: "Compte utilisateur activé avec succès.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(
      "Erreur lors de l'activation de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible d'activer le compte utilisateur.",
    });
  }
}

/**
 * PATCH /api/users/:id/reject
 *
 * ADMIN uniquement.
 *
 * PENDING -> REJECTED
 */
export async function rejectUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant utilisateur invalide.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    if (existingUser.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "Seul un compte en attente peut être rejeté.",
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: "REJECTED",
      },
      include: {
        department: true,
      },
    });

    logger.info(
      `Compte utilisateur rejeté : ${user.email}`,
    );

    return res.status(200).json({
      success: true,
      message: "Compte utilisateur rejeté avec succès.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error(
      "Erreur lors du rejet de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de rejeter le compte utilisateur.",
    });
  }
}