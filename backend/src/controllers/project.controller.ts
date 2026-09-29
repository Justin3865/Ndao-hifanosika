import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

function getAuthUser(req: Request) {
  return (req as AuthenticatedRequest).user;
}

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
    logger.error("Erreur lors de la récupération des projets.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les projets.",
    });
  }
}

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

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
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

    // Un coordinateur ne peut consulter que ses propres projets.
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
    logger.error("Erreur lors de la récupération du projet.", error);

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
}

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

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Le nom et le code du projet sont obligatoires.",
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        code,
        description: description || null,
        objective: objective || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || "DRAFT",
        budget: budget !== undefined ? Number(budget) : null,
        beneficiaryTarget:
          beneficiaryTarget !== undefined
            ? Number(beneficiaryTarget)
            : null,
        departmentId:
          departmentId !== undefined && departmentId !== null
            ? Number(departmentId)
            : null,

        // Le créateur vient du token JWT,
        // et non du frontend.
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
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Projet créé avec succès.",
      project,
    });
  } catch (error) {
    logger.error("Erreur lors de la création du projet.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de créer le projet.",
    });
  }
}

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

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de projet invalide.",
      });
    }

    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Projet introuvable.",
      });
    }

    // Le coordinateur ne peut modifier que ses propres projets.
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

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        code,
        description,
        objective,
        startDate: startDate
          ? new Date(startDate)
          : undefined,
        endDate: endDate
          ? new Date(endDate)
          : undefined,
        status,
        budget,
        beneficiaryTarget:
          beneficiaryTarget !== undefined
            ? Number(beneficiaryTarget)
            : undefined,
        departmentId:
          departmentId === null
            ? null
            : departmentId !== undefined
              ? Number(departmentId)
              : undefined,
      },
      include: {
        department: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Projet modifié avec succès.",
      project,
    });
  } catch (error) {
    logger.error("Erreur lors de la modification du projet.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier le projet.",
    });
  }
}

export async function deleteProject(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de projet invalide.",
      });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
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
  } catch (error) {
    logger.error("Erreur lors de la suppression du projet.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer le projet.",
    });
  }
}