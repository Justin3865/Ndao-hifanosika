
import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

export async function getActivities(
  _req: Request,
  res: Response,
): Promise<Response> {
  try {
    const activities = await prisma.activity.findMany({
      include: {
        project: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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
    logger.error("Erreur lors de la récupération des activités.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les activités.",
    });
  }
}

export async function getActivityById(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        project: true,
        createdBy: true,
      },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activité introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      activity,
    });
  } catch (error) {
    logger.error("Erreur lors de la récupération de l'activité.", error);

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
}

export async function createActivity(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const {
      projectId,
      title,
      description,
      location,
      startDate,
      endDate,
      status,
      budget,
      createdById,
    } = req.body;

    if (!projectId || !title || !createdById) {
      return res.status(400).json({
        success: false,
        message:
          "Le projet, le titre et le créateur sont obligatoires.",
      });
    }

    const activity = await prisma.activity.create({
      data: {
        projectId: Number(projectId),
        title,
        description: description || null,
        location: location || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || "PLANNED",
        budget: budget !== undefined ? budget : null,
        createdById: Number(createdById),
      },
      include: {
        project: true,
        createdBy: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Activité créée avec succès.",
      activity,
    });
  } catch (error) {
    logger.error("Erreur lors de la création de l'activité.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de créer l'activité.",
    });
  }
}

export async function updateActivity(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    const {
      title,
      description,
      location,
      startDate,
      endDate,
      status,
      budget,
    } = req.body;

    const activity = await prisma.activity.update({
      where: { id },
      data: {
        title,
        description,
        location,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        budget,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Activité modifiée avec succès.",
      activity,
    });
  } catch (error) {
    logger.error("Erreur lors de la modification de l'activité.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier l'activité.",
    });
  }
}

export async function deleteActivity(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    await prisma.activity.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Activité supprimée avec succès.",
    });
  } catch (error) {
    logger.error("Erreur lors de la suppression de l'activité.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer l'activité.",
    });
  }
}

