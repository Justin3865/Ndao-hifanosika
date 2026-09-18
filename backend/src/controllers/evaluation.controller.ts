import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

export async function getEvaluations(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const projectId = req.query.projectId
      ? Number(req.query.projectId)
      : undefined;

    const status = req.query.status
      ? String(req.query.status)
      : undefined;

    const evaluations = await prisma.evaluation.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: evaluations,
    });
  } catch (error) {
    logger.error("Erreur récupération évaluations", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des évaluations",
    });
  }
}

export async function getEvaluationById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant évaluation invalide",
      });
      return;
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
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

    if (!evaluation) {
      res.status(404).json({
        success: false,
        message: "Évaluation introuvable",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    logger.error("Erreur récupération évaluation", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'évaluation",
    });
  }
}

export async function createEvaluation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      projectId,
      title,
      description,
      score,
      status,
      evaluatedAt,
      createdById,
    } = req.body;

    if (!projectId || !title || !createdById) {
      res.status(400).json({
        success: false,
        message: "projectId, title et createdById sont obligatoires",
      });
      return;
    }

    const project = await prisma.project.findUnique({
      where: {
        id: Number(projectId),
      },
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Projet introuvable",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: Number(createdById),
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Utilisateur créateur introuvable",
      });
      return;
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        projectId: Number(projectId),
        title,
        description,
        score:
          score !== undefined && score !== null
            ? Number(score)
            : undefined,
        status: status ?? "DRAFT",
        evaluatedAt: evaluatedAt
          ? new Date(evaluatedAt)
          : undefined,
        createdById: Number(createdById),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
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

    res.status(201).json({
      success: true,
      message: "Évaluation créée avec succès",
      data: evaluation,
    });
  } catch (error) {
    logger.error("Erreur création évaluation", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de l'évaluation",
    });
  }
}

export async function updateEvaluation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant évaluation invalide",
      });
      return;
    }

    const existing = await prisma.evaluation.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Évaluation introuvable",
      });
      return;
    }

    const {
      projectId,
      title,
      description,
      score,
      status,
      evaluatedAt,
      createdById,
    } = req.body;

    const evaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        projectId:
          projectId !== undefined ? Number(projectId) : undefined,
        title,
        description,
        score:
          score !== undefined && score !== null
            ? Number(score)
            : undefined,
        status,
        evaluatedAt:
          evaluatedAt !== undefined
            ? evaluatedAt
              ? new Date(evaluatedAt)
              : null
            : undefined,
        createdById:
          createdById !== undefined
            ? Number(createdById)
            : undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: "Évaluation modifiée avec succès",
      data: evaluation,
    });
  } catch (error) {
    logger.error("Erreur modification évaluation", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la modification de l'évaluation",
    });
  }
}

export async function deleteEvaluation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant évaluation invalide",
      });
      return;
    }

    const existing = await prisma.evaluation.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Évaluation introuvable",
      });
      return;
    }

    await prisma.evaluation.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Évaluation supprimée avec succès",
    });
  } catch (error) {
    logger.error("Erreur suppression évaluation", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de l'évaluation",
    });
  }
}