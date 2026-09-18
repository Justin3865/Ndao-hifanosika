import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

export async function getProjects(
  _req: Request,
  res: Response,
): Promise<Response> {
  try {
    const projects = await prisma.project.findMany({
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
    const id = Number(req.params.id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        department: true,
        createdBy: true,
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
      createdById,
    } = req.body;

    if (!name || !code || !createdById) {
      return res.status(400).json({
        success: false,
        message:
          "Le nom, le code et le créateur du projet sont obligatoires.",
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
        budget: budget !== undefined ? budget : null,
        beneficiaryTarget:
          beneficiaryTarget !== undefined
            ? Number(beneficiaryTarget)
            : null,
        departmentId:
          departmentId !== undefined && departmentId !== null
            ? Number(departmentId)
            : null,
        createdById: Number(createdById),
      },
      include: {
        department: true,
        createdBy: true,
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
    const id = Number(req.params.id);

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
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
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

