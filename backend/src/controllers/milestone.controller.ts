
import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

export async function getMilestones(
  _req: Request,
  res: Response,
): Promise<Response> {
  try {
    const milestones = await prisma.milestone.findMany({
      include: {
        project: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

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

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les jalons.",
    });
  }
}

export async function getMilestoneById(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Jalon introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      milestone,
    });
  } catch (error) {
    logger.error("Erreur lors de la récupération du jalon.", error);

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
}

export async function createMilestone(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const {
      projectId,
      title,
      description,
      dueDate,
      progress,
    } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({
        success: false,
        message: "Le projet et le titre sont obligatoires.",
      });
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId: Number(projectId),
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        progress:
          progress !== undefined
            ? Math.min(100, Math.max(0, Number(progress)))
            : 0,
      },
      include: {
        project: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Jalon créé avec succès.",
      milestone,
    });
  } catch (error) {
    logger.error("Erreur lors de la création du jalon.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de créer le jalon.",
    });
  }
}

export async function updateMilestone(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    const {
      title,
      description,
      dueDate,
      completedAt,
      progress,
    } = req.body;

    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        completedAt: completedAt
          ? new Date(completedAt)
          : undefined,
        progress:
          progress !== undefined
            ? Math.min(100, Math.max(0, Number(progress)))
            : undefined,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Jalon modifié avec succès.",
      milestone,
    });
  } catch (error) {
    logger.error("Erreur lors de la modification du jalon.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier le jalon.",
    });
  }
}

export async function deleteMilestone(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    await prisma.milestone.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Jalon supprimé avec succès.",
    });
  } catch (error) {
    logger.error("Erreur lors de la suppression du jalon.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer le jalon.",
    });
  }
}

