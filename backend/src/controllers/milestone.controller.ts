import { Response } from "express";

import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

import {
  findAllMilestones,
  findMilestoneById,
  createMilestone as createMilestoneService,
  updateMilestone as updateMilestoneService,
  deleteMilestone as deleteMilestoneService,
} from "../services/milestone.service";

import { sendError } from "../middlewares/error.middleware";
/**
 * Récupère l'utilisateur authentifié depuis le JWT.
 */
function getAuthUser(req: AuthenticatedRequest) {
  return req.user;
}

/**
 * Vérifie qu'une valeur est un entier positif.
 */
function parsePositiveInt(value: unknown): number | null {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

/**
 * Vérifie que la progression est comprise entre 0 et 100.
 */
function parseProgress(value: unknown): number | null {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  if (number < 0 || number > 100) {
    return null;
  }

  return number;
}

/**
 * Convertit une valeur en Date.
 *
 * undefined => champ non fourni
 * null / ""  => suppression de la date
 * Date invalide => null
 */
function parseOptionalDate(
  value: unknown,
): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * GET /api/milestones
 *
 * Récupère les jalons.
 *
 * COORDINATOR :
 * uniquement les jalons des projets qu'il a créés.
 *
 * Les autres rôles autorisés par les routes :
 * ADMIN, DIRECTION, TUTEUR_L3, TUTEUR_M2
 * peuvent voir tous les jalons.
 */
export async function getMilestones(
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    let milestones = await findAllMilestones();

    if (user.role === "COORDINATOR") {
      milestones = milestones.filter(
        (milestone) =>
          milestone.project.createdById === user.id,
      );
    }

    return res.status(200).json({
      success: true,
      count: milestones.length,
      milestones,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des jalons.",
      error,
    );

    return sendError(res, error, "Impossible de récupérer les jalons.");
  }
}

/**
 * GET /api/milestones/:id
 *
 * Récupère un jalon par son identifiant.
 */
export async function getMilestoneById(
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Identifiant du jalon invalide.",
      });
    }

    const milestone = await findMilestoneById(id);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Jalon introuvable.",
      });
    }

    /**
     * Contrôle de propriété pour COORDINATOR.
     */
    if (
      user.role === "COORDINATOR" &&
      milestone.project.createdById !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Vous n'êtes pas autorisé à accéder à ce jalon.",
      });
    }

    return res.status(200).json({
      success: true,
      milestone,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération du jalon.",
      error,
    );

    return sendError(res, error, "Erreur interne du serveur.");
  }
}

/**
 * POST /api/milestones
 *
 * Création d'un jalon.
 *
 * Le createdById n'existe pas dans Milestone.
 * Le contrôle d'accès se fait donc via le propriétaire
 * du projet.
 */
export async function createMilestone(
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    const {
      projectId,
      title,
      description,
      dueDate,
      progress,
    } = req.body;

    /**
     * Validation projectId.
     */
    const parsedProjectId =
      parsePositiveInt(projectId);

    if (!parsedProjectId) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant du projet est invalide.",
      });
    }

    /**
     * Validation du titre.
     */
    if (
      typeof title !== "string" ||
      title.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Le titre du jalon est obligatoire.",
      });
    }

    if (title.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message:
          "Le titre du jalon ne doit pas dépasser 255 caractères.",
      });
    }

    /**
     * Validation de la date d'échéance.
     */
    const parsedDueDate =
      parseOptionalDate(dueDate);

    if (
      dueDate !== undefined &&
      parsedDueDate === null &&
      dueDate !== null &&
      dueDate !== ""
    ) {
      return res.status(400).json({
        success: false,
        message: "La date d'échéance est invalide.",
      });
    }

    /**
     * Validation de la progression.
     */
    let parsedProgress = 0;

    if (progress !== undefined) {
      const value = parseProgress(progress);

      if (value === null) {
        return res.status(400).json({
          success: false,
          message:
            "La progression doit être comprise entre 0 et 100.",
        });
      }

      parsedProgress = value;
    }

    /**
     * Vérification de l'existence du projet.
     */
    const project =
      await prismaProjectExists(parsedProjectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Projet introuvable.",
      });
    }

    /**
     * COORDINATOR :
     * uniquement ses propres projets.
     */
    if (
      user.role === "COORDINATOR" &&
      project.createdById !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Vous ne pouvez créer un jalon que dans vos propres projets.",
      });
    }

    /**
     * Création via le service.
     */
    const milestone =
      await createMilestoneService({
        projectId: parsedProjectId,
        title: title.trim(),
        description:
          typeof description === "string"
            ? description.trim() || null
            : null,
        dueDate: parsedDueDate,
        progress: parsedProgress,
      });

    return res.status(201).json({
      success: true,
      message: "Jalon créé avec succès.",
      milestone,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la création du jalon.",
      error,
    );

    return sendError(res, error, "Impossible de créer le jalon.");
  }
}

/**
 * PUT /api/milestones/:id
 *
 * Modification d'un jalon.
 */
export async function updateMilestone(
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    /**
     * Validation ID.
     */
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Identifiant du jalon invalide.",
      });
    }

    /**
     * Vérification de l'existence.
     */
    const existingMilestone =
      await findMilestoneById(id);

    if (!existingMilestone) {
      return res.status(404).json({
        success: false,
        message: "Jalon introuvable.",
      });
    }

    /**
     * COORDINATOR :
     * uniquement ses propres projets.
     */
    if (
      user.role === "COORDINATOR" &&
      existingMilestone.project.createdById !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Vous n'êtes pas autorisé à modifier ce jalon.",
      });
    }

    const {
      title,
      description,
      dueDate,
      completedAt,
      progress,
    } = req.body;

    const data: {
      title?: string;
      description?: string | null;
      dueDate?: Date | null;
      completedAt?: Date | null;
      progress?: number;
    } = {};

    /**
     * Validation du titre.
     */
    if (title !== undefined) {
      if (
        typeof title !== "string" ||
        title.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Le titre du jalon est invalide.",
        });
      }

      if (title.trim().length > 255) {
        return res.status(400).json({
          success: false,
          message:
            "Le titre du jalon ne doit pas dépasser 255 caractères.",
        });
      }

      data.title = title.trim();
    }

    /**
     * Description.
     */
    if (description !== undefined) {
      data.description =
        typeof description === "string"
          ? description.trim() || null
          : null;
    }

    /**
     * Date d'échéance.
     */
    if (dueDate !== undefined) {
      const parsedDueDate =
        parseOptionalDate(dueDate);

      if (
        parsedDueDate === null &&
        dueDate !== null &&
        dueDate !== ""
      ) {
        return res.status(400).json({
          success: false,
          message: "La date d'échéance est invalide.",
        });
      }

      data.dueDate = parsedDueDate;
    }

    /**
     * Date de réalisation.
     */
    if (completedAt !== undefined) {
      const parsedCompletedAt =
        parseOptionalDate(completedAt);

      if (
        parsedCompletedAt === null &&
        completedAt !== null &&
        completedAt !== ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La date de réalisation est invalide.",
        });
      }

      data.completedAt = parsedCompletedAt;
    }

    /**
     * Progression.
     */
    if (progress !== undefined) {
      const parsedProgress =
        parseProgress(progress);

      if (parsedProgress === null) {
        return res.status(400).json({
          success: false,
          message:
            "La progression doit être comprise entre 0 et 100.",
        });
      }

      data.progress = parsedProgress;
    }

    /**
     * Aucun champ fourni.
     */
    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucune donnée à modifier.",
      });
    }

    /**
     * Modification via le service.
     */
    const milestone =
      await updateMilestoneService(id, data);

    return res.status(200).json({
      success: true,
      message: "Jalon modifié avec succès.",
      milestone,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la modification du jalon.",
      error,
    );

    return sendError(res, error, "Impossible de modifier le jalon.");
  }
}

/**
 * DELETE /api/milestones/:id
 *
 * Suppression d'un jalon.
 */
export async function deleteMilestone(
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    /**
     * Validation ID.
     */
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Identifiant du jalon invalide.",
      });
    }

    /**
     * Vérification de l'existence.
     */
    const existingMilestone =
      await findMilestoneById(id);

    if (!existingMilestone) {
      return res.status(404).json({
        success: false,
        message: "Jalon introuvable.",
      });
    }

    /**
     * COORDINATOR :
     * uniquement ses propres projets.
     */
    if (
      user.role === "COORDINATOR" &&
      existingMilestone.project.createdById !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Vous n'êtes pas autorisé à supprimer ce jalon.",
      });
    }

    await deleteMilestoneService(id);

    return res.status(200).json({
      success: true,
      message: "Jalon supprimé avec succès.",
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la suppression du jalon.",
      error,
    );

    return sendError(res, error, "Impossible de supprimer le jalon.");
  }
}

/**
 * Vérifie l'existence d'un projet et récupère
 * son propriétaire.
 *
 * Cette vérification est nécessaire pour appliquer
 * le contrôle d'accès du COORDINATOR.
 */
async function prismaProjectExists(
  projectId: number,
) {
  return prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      createdById: true,
    },
  });
}