
import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

export async function getDepartments(
  _req: Request,
  res: Response,
): Promise<Response> {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la récupération des départements.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les départements.",
    });
  }
}

export async function getDepartmentById(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: true,
        projects: true,
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Département introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      department,
    });
  } catch (error) {
    logger.error("Erreur lors de la récupération du département.", error);

    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
}

export async function createDepartment(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Le nom et le code sont obligatoires.",
      });
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        description: description || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Département créé avec succès.",
      department,
    });
  } catch (error) {
    logger.error("Erreur lors de la création du département.", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de créer le département.",
    });
  }
}

export async function updateDepartment(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    const { name, code, description } = req.body;

    const department = await prisma.department.update({
      where: { id },
      data: {
        name,
        code,
        description,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Département modifié avec succès.",
      department,
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la modification du département.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de modifier le département.",
    });
  }
}

export async function deleteDepartment(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    const usersCount = await prisma.user.count({
      where: {
        departmentId: id,
      },
    });

    const projectsCount = await prisma.project.count({
      where: {
        departmentId: id,
      },
    });

    if (usersCount > 0 || projectsCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Ce département ne peut pas être supprimé car il est encore utilisé.",
      });
    }

    await prisma.department.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Département supprimé avec succès.",
    });
  } catch (error) {
    logger.error(
      "Erreur lors de la suppression du département.",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de supprimer le département.",
    });
  }
}

