import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import {
  canSeeInternship,
  getReqUser,
  internshipScope,
} from "../utils/dataScope";

import { sendError } from "../middlewares/error.middleware";
export async function getInternships(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const studentId = req.query.studentId
      ? Number(req.query.studentId)
      : undefined;

    const supervisorId = req.query.supervisorId
      ? Number(req.query.supervisorId)
      : undefined;

    const projectId = req.query.projectId
      ? Number(req.query.projectId)
      : undefined;

    const scope = internshipScope(getReqUser(req));

    const internships = await prisma.internship.findMany({
      where: {
        AND: [
          {
            ...(studentId ? { studentId } : {}),
            ...(supervisorId ? { supervisorId } : {}),
            ...(projectId ? { projectId } : {}),
          },
          scope,
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        supervisor: {
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

    res.status(200).json({
      success: true,
      data: internships,
    });
  } catch (error) {
    logger.error("Erreur récupération stages", error);

    sendError(res, error, "Erreur lors de la récupération des stages");
  }
}

export async function getInternshipById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant stage invalide",
      });
      return;
    }

    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        project: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!internship) {
      res.status(404).json({
        success: false,
        message: "Stage introuvable",
      });
      return;
    }

    // Un stagiaire / tuteur ne voit que ses propres stages
    if (!canSeeInternship(getReqUser(req), internship)) {
      res.status(404).json({
        success: false,
        message: "Stage introuvable",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: internship,
    });
  } catch (error) {
    logger.error("Erreur récupération stage", error);

    sendError(res, error, "Erreur lors de la récupération du stage");
  }
}

export async function createInternship(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      projectId,
      studentId,
      supervisorId,
      title,
      institution,
      startDate,
      endDate,
      status,
      description,
    } = req.body;

    if (!studentId || !title || !startDate) {
      res.status(400).json({
        success: false,
        message: "studentId, title et startDate sont obligatoires",
      });
      return;
    }

    if (endDate && new Date(endDate).getTime() < new Date(startDate).getTime()) {
      res.status(400).json({
        success: false,
        message: "La date de fin doit être postérieure à la date de début.",
      });
      return;
    }

    const student = await prisma.user.findUnique({
      where: {
        id: Number(studentId),
      },
    });

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Étudiant introuvable",
      });
      return;
    }

    if (supervisorId) {
      const supervisor = await prisma.user.findUnique({
        where: {
          id: Number(supervisorId),
        },
      });

      if (!supervisor) {
        res.status(404).json({
          success: false,
          message: "Tuteur introuvable",
        });
        return;
      }
    }

    if (projectId) {
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
    }

    const internship = await prisma.internship.create({
      data: {
        projectId: projectId ? Number(projectId) : undefined,
        studentId: Number(studentId),
        supervisorId: supervisorId
          ? Number(supervisorId)
          : undefined,
        title,
        institution,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        status: status ?? "PENDING",
        description,
      },
      include: {
        project: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        supervisor: {
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
      message: "Stage créé avec succès",
      data: internship,
    });
  } catch (error) {
    logger.error("Erreur création stage", error);

    sendError(res, error, "Erreur lors de la création du stage");
  }
}

export async function updateInternship(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant stage invalide",
      });
      return;
    }

    const existing = await prisma.internship.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Stage introuvable",
      });
      return;
    }

    const {
      projectId,
      studentId,
      supervisorId,
      title,
      institution,
      startDate,
      endDate,
      status,
      description,
    } = req.body;

    {
      const effectiveStart = startDate ? new Date(startDate) : existing.startDate;
      const effectiveEnd =
        endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate;

      if (effectiveEnd && effectiveStart && effectiveEnd.getTime() < effectiveStart.getTime()) {
        res.status(400).json({
          success: false,
          message: "La date de fin doit être postérieure à la date de début.",
        });
        return;
      }
    }

    const internship = await prisma.internship.update({
      where: { id },
      data: {
        projectId:
          projectId !== undefined
            ? projectId
              ? Number(projectId)
              : null
            : undefined,
        studentId:
          studentId !== undefined ? Number(studentId) : undefined,
        supervisorId:
          supervisorId !== undefined
            ? supervisorId
              ? Number(supervisorId)
              : null
            : undefined,
        title,
        institution,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate:
          endDate !== undefined
            ? endDate
              ? new Date(endDate)
              : null
            : undefined,
        status,
        description,
      },
    });

    res.status(200).json({
      success: true,
      message: "Stage modifié avec succès",
      data: internship,
    });
  } catch (error) {
    logger.error("Erreur modification stage", error);

    sendError(res, error, "Erreur lors de la modification du stage");
  }
}

export async function deleteInternship(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant stage invalide",
      });
      return;
    }

    const existing = await prisma.internship.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Stage introuvable",
      });
      return;
    }

    await prisma.internship.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Stage supprimé avec succès",
    });
  } catch (error) {
    logger.error("Erreur suppression stage", error);

    sendError(res, error, "Erreur lors de la suppression du stage");
  }
}