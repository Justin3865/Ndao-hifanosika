import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

function getAuthUser(req: Request) {
  return (req as AuthenticatedRequest).user;
}

function parsePositiveInt(value: unknown): number | null {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function parseOptionalNumber(
  value: unknown,
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

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

const ACTIVITY_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

function isValidActivityStatus(
  value: unknown,
): value is (typeof ACTIVITY_STATUSES)[number] {
  return (
    typeof value === "string" &&
    ACTIVITY_STATUSES.includes(
      value as (typeof ACTIVITY_STATUSES)[number],
    )
  );
}

/**
 * GET /api/activities
 *
 * Consultation des activités.
 */
export async function getActivities(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    /*
     * Pour COORDINATOR, on ne retourne que les activités
     * appartenant à ses propres projets.
     */
    const where =
      user.role === "COORDINATOR"
        ? {
            project: {
              createdById: user.id,
            },
          }
        : undefined;

    const activities = await prisma.activity.findMany({
      where,

      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            createdById: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: activities.length,
      activities,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des activités.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les activités.",
    });
  }
}

/**
 * GET /api/activities/:id
 */
export async function getActivityById(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Identifiant d'activité invalide.",
      });
    }

    const activity = await prisma.activity.findUnique({
      where: {
        id,
      },

      include: {
        project: true,

        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activité introuvable.",
      });
    }

    /*
     * Isolation des données du COORDINATOR.
     */
    if (
      user.role === "COORDINATOR" &&
      activity.project.createdById !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé à cette activité.",
      });
    }

    return res.status(200).json({
      success: true,
      activity,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération de l'activité.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
}

/**
 * POST /api/activities
 */
export async function createActivity(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const {
      projectId,
      title,
      description,
      location,
      startDate,
      endDate,
      status,
      budget,
    } = req.body;

    const parsedProjectId =
      parsePositiveInt(projectId);

    if (!parsedProjectId) {
      return res.status(400).json({
        success: false,
        message: "Le projet est obligatoire.",
      });
    }

    if (
      typeof title !== "string" ||
      title.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Le titre de l'activité est obligatoire.",
      });
    }

    /*
     * Vérification du projet.
     */
    const project = await prisma.project.findUnique({
      where: {
        id: parsedProjectId,
      },

      select: {
        id: true,
        createdById: true,
      },
    });

    if (!project) {
      return res.status(400).json({
        success: false,
        message: "Projet introuvable.",
      });
    }

    /*
     * COORDINATOR ne peut créer une activité
     * que dans ses propres projets.
     */
    if (
      user.role === "COORDINATOR" &&
      project.createdById !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Vous ne pouvez pas créer une activité dans ce projet.",
      });
    }

    if (
      status !== undefined &&
      !isValidActivityStatus(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Statut d'activité invalide.",
      });
    }

    const parsedStartDate =
      parseOptionalDate(startDate);

    const parsedEndDate =
      parseOptionalDate(endDate);

    if (
      startDate !== undefined &&
      startDate !== null &&
      startDate !== "" &&
      parsedStartDate === null
    ) {
      return res.status(400).json({
        success: false,
        message: "La date de début est invalide.",
      });
    }

    if (
      endDate !== undefined &&
      endDate !== null &&
      endDate !== "" &&
      parsedEndDate === null
    ) {
      return res.status(400).json({
        success: false,
        message: "La date de fin est invalide.",
      });
    }

    if (
      parsedStartDate &&
      parsedEndDate &&
      parsedEndDate < parsedStartDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La date de fin ne peut pas être antérieure à la date de début.",
      });
    }

    const parsedBudget =
      parseOptionalNumber(budget);

    if (
      budget !== undefined &&
      parsedBudget === null &&
      budget !== null &&
      budget !== ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Le budget est invalide.",
      });
    }

    const activity = await prisma.activity.create({
      data: {
        projectId: parsedProjectId,

        title: title.trim(),

        description:
          typeof description === "string"
            ? description.trim() || null
            : null,

        location:
          typeof location === "string"
            ? location.trim() || null
            : null,

        startDate: parsedStartDate ?? null,
        endDate: parsedEndDate ?? null,

        status: status ?? "PLANNED",

        budget: parsedBudget ?? null,

        /*
         * IMPORTANT :
         * Le créateur est obligatoirement celui du JWT.
         *
         * Le frontend ne peut donc pas créer une activité
         * au nom d'un autre utilisateur.
         */
        createdById: user.id,
      },

      include: {
        project: true,

        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Activité créée avec succès.",
      activity,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la création de l'activité.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de créer l'activité.",
    });
  }
}

/**
 * PUT /api/activities/:id
 */
export async function updateActivity(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Identifiant d'activité invalide.",
      });
    }

    const existingActivity =
      await prisma.activity.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          projectId: true,
          createdById: true,

          project: {
            select: {
              createdById: true,
            },
          },
        },
      });

    if (!existingActivity) {
      return res.status(404).json({
        success: false,
        message: "Activité introuvable.",
      });
    }

    /*
     * COORDINATOR :
     * il ne peut modifier qu'une activité
     * appartenant à ses propres projets.
     */
    if (
      user.role === "COORDINATOR" &&
      existingActivity.project.createdById !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Vous ne pouvez pas modifier cette activité.",
      });
    }

    const {
      projectId,
      title,
      description,
      location,
      startDate,
      endDate,
      status,
      budget,
    } = req.body;

    const data: any = {};

    /*
     * Changement de projet éventuel.
     */
    if (projectId !== undefined) {
      const parsedProjectId =
        parsePositiveInt(projectId);

      if (!parsedProjectId) {
        return res.status(400).json({
          success: false,
          message: "Identifiant de projet invalide.",
        });
      }

      const project = await prisma.project.findUnique({
        where: {
          id: parsedProjectId,
        },

        select: {
          id: true,
          createdById: true,
        },
      });

      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Projet introuvable.",
        });
      }

      if (
        user.role === "COORDINATOR" &&
        project.createdById !== user.id
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Vous ne pouvez pas déplacer cette activité vers ce projet.",
        });
      }

      data.projectId = parsedProjectId;
    }

    if (title !== undefined) {
      if (
        typeof title !== "string" ||
        title.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Le titre de l'activité est invalide.",
        });
      }

      data.title = title.trim();
    }

    if (description !== undefined) {
      data.description =
        typeof description === "string"
          ? description.trim() || null
          : null;
    }

    if (location !== undefined) {
      data.location =
        typeof location === "string"
          ? location.trim() || null
          : null;
    }

    const parsedStartDate =
      parseOptionalDate(startDate);

    const parsedEndDate =
      parseOptionalDate(endDate);

    if (
      startDate !== undefined &&
      startDate !== null &&
      startDate !== "" &&
      parsedStartDate === null
    ) {
      return res.status(400).json({
        success: false,
        message: "La date de début est invalide.",
      });
    }

    if (
      endDate !== undefined &&
      endDate !== null &&
      endDate !== "" &&
      parsedEndDate === null
    ) {
      return res.status(400).json({
        success: false,
        message: "La date de fin est invalide.",
      });
    }

    if (
      parsedStartDate &&
      parsedEndDate &&
      parsedEndDate < parsedStartDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La date de fin ne peut pas être antérieure à la date de début.",
      });
    }

    if (startDate !== undefined) {
      data.startDate = parsedStartDate;
    }

    if (endDate !== undefined) {
      data.endDate = parsedEndDate;
    }

    if (status !== undefined) {
      if (!isValidActivityStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Statut d'activité invalide.",
        });
      }

      data.status = status;
    }

    if (budget !== undefined) {
      const parsedBudget =
        parseOptionalNumber(budget);

      if (
        parsedBudget === null &&
        budget !== null &&
        budget !== ""
      ) {
        return res.status(400).json({
          success: false,
          message: "Le budget est invalide.",
        });
      }

      data.budget = parsedBudget;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucune donnée à modifier.",
      });
    }

    const activity = await prisma.activity.update({
      where: {
        id,
      },

      data,

      include: {
        project: true,

        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Activité modifiée avec succès.",
      activity,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la modification de l'activité.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier l'activité.",
    });
  }
}

/**
 * DELETE /api/activities/:id
 */
export async function deleteActivity(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Identifiant d'activité invalide.",
      });
    }

    const activity = await prisma.activity.findUnique({
      where: {
        id,
      },

      select: {
        id: true,

        project: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activité introuvable.",
      });
    }

    /*
     * Même si la route limite normalement la suppression,
     * on conserve une vérification côté controller.
     */
    if (
      user.role === "COORDINATOR" &&
      activity.project.createdById !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Vous ne pouvez pas supprimer cette activité.",
      });
    }

    await prisma.activity.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Activité supprimée avec succès.",
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la suppression de l'activité.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer l'activité.",
    });
  }
}