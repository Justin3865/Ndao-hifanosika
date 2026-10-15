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

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function parseOptionalDate(value: unknown): Date | null | undefined {
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

const PROJECT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "SUSPENDED",
  "COMPLETED",
  "CANCELLED",
] as const;

function isValidProjectStatus(
  value: unknown,
): value is (typeof PROJECT_STATUSES)[number] {
  return (
    typeof value === "string" &&
    PROJECT_STATUSES.includes(
      value as (typeof PROJECT_STATUSES)[number],
    )
  );
}

/**
 * GET /api/projects
 *
 * ADMIN / DIRECTION / DAF / COORDINATOR
 *
 * Le COORDINATOR ne voit que les projets qu'il a créés.
 * Les autres rôles autorisés peuvent consulter l'ensemble des projets.
 */
export async function getProjects(
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

    const where =
      user.role === "COORDINATOR"
        ? {
            createdById: user.id,
          }
        : undefined;

    const projects = await prisma.project.findMany({
      where,
      include: {
        department: true,

        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },

        _count: {
          select: {
            activities: true,
            milestones: true,
            evaluations: true,
            beneficiaries: true,
            internships: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des projets.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les projets.",
    });
  }
}

/**
 * GET /api/projects/:id
 */
export async function getProjectById(
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
        message: "Identifiant de projet invalide.",
      });
    }

    const project = await prisma.project.findUnique({
      where: { id },

      include: {
        department: true,

        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },

        activities: true,
        milestones: true,
        evaluations: true,
        beneficiaries: true,
        internships: true,
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Projet introuvable.",
      });
    }

    /*
     * Isolation des projets pour COORDINATOR.
     */
    if (
      user.role === "COORDINATOR" &&
      project.createdById !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé à ce projet.",
      });
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération du projet.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
}

/**
 * POST /api/projects
 */
export async function createProject(
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
      name,
      code,
      description,
      objective,
      startDate,
      endDate,
      status,
      budget,
      beneficiaryTarget,
      departmentId,
    } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Le nom du projet est obligatoire.",
      });
    }

    if (
      typeof code !== "string" ||
      code.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Le code du projet est obligatoire.",
      });
    }

    const parsedStartDate = parseOptionalDate(startDate);
    const parsedEndDate = parseOptionalDate(endDate);

    if (
      startDate !== undefined &&
      startDate !== null &&
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

    if (
      status !== undefined &&
      !isValidProjectStatus(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Statut de projet invalide.",
      });
    }

    const parsedBudget = parseOptionalNumber(budget);

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

    const parsedBeneficiaryTarget =
      parseOptionalNumber(beneficiaryTarget);

    if (
      beneficiaryTarget !== undefined &&
      parsedBeneficiaryTarget === null &&
      beneficiaryTarget !== null &&
      beneficiaryTarget !== ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Le nombre cible de bénéficiaires est invalide.",
      });
    }

    if (
      parsedBeneficiaryTarget !== undefined &&
      parsedBeneficiaryTarget !== null &&
      !Number.isInteger(parsedBeneficiaryTarget)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le nombre cible de bénéficiaires doit être un entier.",
      });
    }

    const parsedDepartmentId =
      departmentId === undefined || departmentId === null
        ? null
        : parsePositiveInt(departmentId);

    if (
      departmentId !== undefined &&
      departmentId !== null &&
      parsedDepartmentId === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de département invalide.",
      });
    }

    /*
     * Vérification d'existence du département.
     */
    if (parsedDepartmentId !== null) {
      const department = await prisma.department.findUnique({
        where: {
          id: parsedDepartmentId,
        },
        select: {
          id: true,
        },
      });

      if (!department) {
        return res.status(400).json({
          success: false,
          message: "Département introuvable.",
        });
      }
    }

    /*
     * Le code projet est unique dans le schéma Prisma.
     */
    const existingProject = await prisma.project.findUnique({
      where: {
        code: code.trim(),
      },
      select: {
        id: true,
      },
    });

    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: "Ce code de projet existe déjà.",
      });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        code: code.trim(),

        description:
          typeof description === "string"
            ? description.trim() || null
            : null,

        objective:
          typeof objective === "string"
            ? objective.trim() || null
            : null,

        startDate: parsedStartDate ?? null,
        endDate: parsedEndDate ?? null,

        status: status ?? "DRAFT",

        budget: parsedBudget ?? null,

        beneficiaryTarget:
          parsedBeneficiaryTarget ?? null,

        departmentId: parsedDepartmentId,

        /*
         * IMPORTANT :
         * Le créateur vient toujours du JWT.
         */
        createdById: user.id,
      },

      include: {
        department: true,

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
      message: "Projet créé avec succès.",
      project,
    });
  } catch (error: any) {
    logger.error(
      "Erreur lors de la création du projet.",
      error,
    );

    /*
     * Protection supplémentaire contre un conflit
     * sur le code unique Prisma.
     */
    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Ce code de projet existe déjà.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Impossible de créer le projet.",
    });
  }
}

/**
 * PUT /api/projects/:id
 */
export async function updateProject(
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
        message: "Identifiant de projet invalide.",
      });
    }

    const existingProject = await prisma.project.findUnique({
      where: { id },

      select: {
        id: true,
        code: true,
        createdById: true,
      },
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Projet introuvable.",
      });
    }

    /*
     * COORDINATOR :
     * modification uniquement de ses propres projets.
     */
    if (
      user.role === "COORDINATOR" &&
      existingProject.createdById !== user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez pas modifier ce projet.",
      });
    }

    const {
      name,
      code,
      description,
      objective,
      startDate,
      endDate,
      status,
      budget,
      beneficiaryTarget,
      departmentId,
    } = req.body;

    const data: any = {};

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Le nom du projet est invalide.",
        });
      }

      data.name = name.trim();
    }

    if (code !== undefined) {
      if (
        typeof code !== "string" ||
        code.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Le code du projet est invalide.",
        });
      }

      const normalizedCode = code.trim();

      if (normalizedCode !== existingProject.code) {
        const duplicate = await prisma.project.findUnique({
          where: {
            code: normalizedCode,
          },
          select: {
            id: true,
          },
        });

        if (duplicate && duplicate.id !== id) {
          return res.status(409).json({
            success: false,
            message: "Ce code de projet existe déjà.",
          });
        }
      }

      data.code = normalizedCode;
    }

    if (description !== undefined) {
      data.description =
        typeof description === "string"
          ? description.trim() || null
          : null;
    }

    if (objective !== undefined) {
      data.objective =
        typeof objective === "string"
          ? objective.trim() || null
          : null;
    }

    const parsedStartDate = parseOptionalDate(startDate);
    const parsedEndDate = parseOptionalDate(endDate);

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
      if (!isValidProjectStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Statut de projet invalide.",
        });
      }

      data.status = status;
    }

    if (budget !== undefined) {
      const parsedBudget = parseOptionalNumber(budget);

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

    if (beneficiaryTarget !== undefined) {
      const parsedTarget =
        parseOptionalNumber(beneficiaryTarget);

      if (
        parsedTarget === null &&
        beneficiaryTarget !== null &&
        beneficiaryTarget !== ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le nombre cible de bénéficiaires est invalide.",
        });
      }

      if (
        parsedTarget !== null &&
        parsedTarget !== undefined &&
        !Number.isInteger(parsedTarget)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le nombre cible de bénéficiaires doit être un entier.",
        });
      }

      data.beneficiaryTarget = parsedTarget;
    }

    if (departmentId !== undefined) {
      if (departmentId === null || departmentId === "") {
        data.departmentId = null;
      } else {
        const parsedDepartmentId =
          parsePositiveInt(departmentId);

        if (!parsedDepartmentId) {
          return res.status(400).json({
            success: false,
            message: "Identifiant de département invalide.",
          });
        }

        const department =
          await prisma.department.findUnique({
            where: {
              id: parsedDepartmentId,
            },
            select: {
              id: true,
            },
          });

        if (!department) {
          return res.status(400).json({
            success: false,
            message: "Département introuvable.",
          });
        }

        data.departmentId = parsedDepartmentId;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucune donnée à modifier.",
      });
    }

    const project = await prisma.project.update({
      where: { id },

      data,

      include: {
        department: true,

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
      message: "Projet modifié avec succès.",
      project,
    });
  } catch (error: any) {
    logger.error(
      "Erreur lors de la modification du projet.",
      error,
    );

    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Ce code de projet existe déjà.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier le projet.",
    });
  }
}

/**
 * DELETE /api/projects/:id
 *
 * La route doit déjà être protégée par :
 * authenticate + authorizeRoles("ADMIN")
 */
export async function deleteProject(
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
        message: "Identifiant de projet invalide.",
      });
    }

    const project = await prisma.project.findUnique({
      where: { id },

      select: {
        id: true,
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Projet introuvable.",
      });
    }

    await prisma.project.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Projet supprimé avec succès.",
    });
  } catch (error: any) {
    logger.error(
      "Erreur lors de la suppression du projet.",
      error,
    );

    if (error?.code === "P2003") {
      return res.status(409).json({
        success: false,
        message:
          "Impossible de supprimer ce projet car il possède encore des données associées.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer le projet.",
    });
  }
}