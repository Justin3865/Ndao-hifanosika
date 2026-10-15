import { Request, Response } from "express";

import { logger } from "../config/logger";

import {
  findAllUsers,
  findUserById,
  createUser as createUserService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
  activateUser as activateUserService,
  rejectUser as rejectUserService,
  isValidUserRole,
  isValidUserStatus,
} from "../services/user.service";

function sanitizeUser(user: any) {
  if (!user) {
    return user;
  }

  const {
    password,
    ...safeUser
  } = user;

  return safeUser;
}

/**
 * GET /api/users
 */
export async function getUsers(
  _req: Request,
  res: Response,
): Promise<Response> {
  try {
    const users =
      await findAllUsers();

    return res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(
        sanitizeUser,
      ),
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des utilisateurs.",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les utilisateurs.",
    });
  }
}

/**
 * GET /api/users/:id
 */
export async function getUserById(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(
      req.params.id,
    );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant utilisateur invalide.",
      });
    }

    const user =
      await findUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable.",
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
      message:
        "Erreur interne du serveur.",
    });
  }
}

/**
 * POST /api/users
 *
 * ADMIN uniquement.
 *
 * Contrairement à /auth/register,
 * l'ADMIN peut choisir le rôle.
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

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Les champs obligatoires sont manquants.",
      });
    }

    if (
      String(password).length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le mot de passe doit contenir au moins 8 caractères.",
      });
    }

    const normalizedRole = (
      role ?? "STAGIAIRE_L3"
    )
      .toString()
      .trim()
      .toUpperCase();

    const normalizedStatus = (
      status ?? "PENDING"
    )
      .toString()
      .trim()
      .toUpperCase();

    if (
      !isValidUserRole(
        normalizedRole,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rôle utilisateur invalide.",
      });
    }

    if (
      !isValidUserStatus(
        normalizedStatus,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut utilisateur invalide.",
      });
    }

    let parsedDepartmentId:
      | number
      | null = null;

    if (
      departmentId !== undefined &&
      departmentId !== null &&
      departmentId !== ""
    ) {
      parsedDepartmentId =
        Number(departmentId);

      if (
        !Number.isInteger(
          parsedDepartmentId,
        ) ||
        parsedDepartmentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Identifiant de département invalide.",
        });
      }
    }

    const user =
      await createUserService({
        firstName: String(
          firstName,
        ),
        lastName: String(
          lastName,
        ),
        email: String(email),
        password: String(password),
        phone:
          phone !== undefined
            ? String(phone)
            : null,
        gender,
        role: normalizedRole,
        status: normalizedStatus,
        departmentId:
          parsedDepartmentId,
      });

    return res.status(201).json({
      success: true,
      message:
        "Utilisateur créé avec succès.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "EMAIL_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Cette adresse e-mail est déjà utilisée.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Un administrateur existe déjà. Un seul ADMIN est autorisé.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "INVALID_USER_ROLE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rôle utilisateur invalide.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "INVALID_USER_STATUS"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut utilisateur invalide.",
      });
    }

    logger.error(
      "Erreur lors de la création de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de créer l'utilisateur.",
    });
  }
}

/**
 * PUT /api/users/:id
 *
 * ADMIN uniquement.
 */
export async function updateUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(
      req.params.id,
    );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant utilisateur invalide.",
      });
    }

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

    if (
      role !== undefined &&
      !isValidUserRole(
        String(role)
          .trim()
          .toUpperCase(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rôle utilisateur invalide.",
      });
    }

    if (
      status !== undefined &&
      !isValidUserStatus(
        String(status)
          .trim()
          .toUpperCase(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut utilisateur invalide.",
      });
    }

    if (
      password !== undefined &&
      String(password).length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le mot de passe doit contenir au moins 8 caractères.",
      });
    }

    let parsedDepartmentId:
      | number
      | null
      | undefined = undefined;

    if (
      departmentId === null ||
      departmentId === ""
    ) {
      parsedDepartmentId = null;
    } else if (
      departmentId !== undefined
    ) {
      parsedDepartmentId =
        Number(departmentId);

      if (
        !Number.isInteger(
          parsedDepartmentId,
        ) ||
        parsedDepartmentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Identifiant de département invalide.",
        });
      }
    }

    const user =
      await updateUserService(
        id,
        {
          firstName:
            firstName !== undefined
              ? String(firstName)
              : undefined,

          lastName:
            lastName !== undefined
              ? String(lastName)
              : undefined,

          email:
            email !== undefined
              ? String(email)
              : undefined,

          password:
            password !== undefined
              ? String(password)
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
              ? String(role)
              : undefined,

          status:
            status !== undefined
              ? String(status)
              : undefined,

          departmentId:
            parsedDepartmentId,
        },
      );

    return res.status(200).json({
      success: true,
      message:
        "Utilisateur mis à jour avec succès.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "USER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "EMAIL_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Cette adresse e-mail est déjà utilisée.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Un administrateur existe déjà. Un seul ADMIN est autorisé.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "INVALID_USER_ROLE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rôle utilisateur invalide.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "INVALID_USER_STATUS"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut utilisateur invalide.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "PASSWORD_TOO_SHORT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le mot de passe doit contenir au moins 8 caractères.",
      });
    }

    logger.error(
      "Erreur lors de la modification de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de modifier l'utilisateur.",
    });
  }
}

/**
 * DELETE /api/users/:id
 *
 * ADMIN uniquement.
 */
export async function deleteUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(
      req.params.id,
    );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant utilisateur invalide.",
      });
    }

    await deleteUserService(id);

    return res.status(200).json({
      success: true,
      message:
        "Utilisateur supprimé avec succès.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "USER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable.",
      });
    }

    logger.error(
      "Erreur lors de la suppression de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de supprimer l'utilisateur.",
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
    const id = Number(
      req.params.id,
    );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant utilisateur invalide.",
      });
    }

    const user =
      await activateUserService(id);

    logger.info(
      `Compte utilisateur activé : ${user.email}`,
    );

    return res.status(200).json({
      success: true,
      message:
        "Compte utilisateur activé avec succès.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "USER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "USER_NOT_PENDING"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Seul un compte en attente peut être activé.",
      });
    }

    logger.error(
      "Erreur lors de l'activation de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible d'activer le compte utilisateur.",
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
    const id = Number(
      req.params.id,
    );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant utilisateur invalide.",
      });
    }

    const user =
      await rejectUserService(id);

    logger.info(
      `Compte utilisateur rejeté : ${user.email}`,
    );

    return res.status(200).json({
      success: true,
      message:
        "Compte utilisateur rejeté avec succès.",
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "USER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "USER_NOT_PENDING"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Seul un compte en attente peut être rejeté.",
      });
    }

    logger.error(
      "Erreur lors du rejet de l'utilisateur.",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de rejeter le compte utilisateur.",
    });
  }
}