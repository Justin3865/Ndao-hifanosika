import { Request, Response } from "express";

import { notifyUsers } from "../utils/notify";
import { deliverToUser } from "../services/delivery.service";
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

import { sendError } from "../middlewares/error.middleware";
import { getReqUser } from "../utils/dataScope";
import { prisma } from "../config/database";
import { parseIdentity } from "../utils/identity";

/** Naissance + CIN saisis par l'administrateur (champs absents ignorés) */
async function applyIdentity(user: any, body: Record<string, unknown>) {
  const identity = parseIdentity(body);
  if (identity.error || !user?.id || Object.keys(identity.data).length === 0) return user;
  return prisma.user.update({ where: { id: user.id }, data: identity.data as any, include: { department: true } });
}
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
/** Vrai si supprimer / rétrograder / désactiver cet utilisateur laisserait le système sans administrateur actif. */
async function isLastActiveAdmin(userId: number): Promise<boolean> {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });

  if (!target || target.role !== "ADMIN" || target.status !== "ACTIVE") return false;

  const others = await prisma.user.count({
    where: { role: "ADMIN", status: "ACTIVE", id: { not: userId } },
  });

  return others === 0;
}

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

    return sendError(res, error, "Impossible de récupérer les utilisateurs.");
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

    return sendError(res, error, "Erreur interne du serveur.");
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

    const identityCheck = parseIdentity(req.body);

    if (identityCheck.error) {
      return res.status(400).json({ success: false, message: identityCheck.error });
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
      user: sanitizeUser(await applyIdentity(user, req.body)),
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

    return sendError(res, error, "Impossible de créer l'utilisateur.");
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

    const requester = getReqUser(req);
    const demotes = role !== undefined && String(role).trim().toUpperCase() !== "ADMIN";
    const deactivates = status !== undefined && String(status).trim().toUpperCase() !== "ACTIVE";

    if (requester?.id === id && (demotes || deactivates)) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas modifier votre propre rôle ou statut.",
      });
    }

    if ((demotes || deactivates) && (await isLastActiveAdmin(id))) {
      return res.status(409).json({
        success: false,
        message: "Impossible de rétrograder ou désactiver le dernier administrateur actif.",
      });
    }

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

    const identityCheck = parseIdentity(req.body);

    if (identityCheck.error) {
      return res.status(400).json({ success: false, message: identityCheck.error });
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
      user: sanitizeUser(await applyIdentity(user, req.body)),
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

    return sendError(res, error, "Impossible de modifier l'utilisateur.");
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

    if (getReqUser(req)?.id === id) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas supprimer votre propre compte.",
      });
    }

    if (await isLastActiveAdmin(id)) {
      return res.status(409).json({
        success: false,
        message: "Impossible de supprimer le dernier administrateur actif.",
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

    return sendError(res, error, "Impossible de supprimer l'utilisateur.");
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

    await notifyUsers([user.id], {
      title: "Inscription acceptée",
      message: "Votre compte Ndao Hifanosika a été validé par un administrateur. Vous pouvez maintenant vous connecter.",
      type: "SUCCESS",
    });

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

    return sendError(res, error, "Impossible d'activer le compte utilisateur.");
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

    // Compte REJECTED : pas de notification interne, mais la personne est prévenue par e-mail/SMS.
    void deliverToUser(
      { email: user.email, phone: user.phone },
      "Inscription refusée",
      "Votre demande d'inscription à Ndao Hifanosika n'a pas été acceptée. Contactez l'administration pour plus d'informations.",
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

    return sendError(res, error, "Impossible de rejeter le compte utilisateur.");
  }
}