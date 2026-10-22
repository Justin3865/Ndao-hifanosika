import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import axios from "axios"; // ▼▼▼ NOVOAKO ▼▼▼
import {
  evaluationScope,
  getReqUser,
  scopedProjectIds,
  isScopedRole,
} from "../utils/dataScope";

import { sendError } from "../middlewares/error.middleware";

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

    const scope = await evaluationScope(getReqUser(req));

    const evaluations = await prisma.evaluation.findMany({
      where: {
        AND: [
          {
            ...(projectId ? { projectId } : {}),
            ...(status ? { status: status as any } : {}),
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

    sendError(res, error, "Erreur lors de la récupération des évaluations");
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

    const reqUser = getReqUser(req);

    if (reqUser && isScopedRole(reqUser)) {
      const allowedProjects = await scopedProjectIds(reqUser);

      if (!allowedProjects.includes(evaluation.projectId as number)) {
        res.status(404).json({
          success: false,
          message: "Évaluation introuvable",
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    logger.error("Erreur récupération évaluation", error);

    sendError(res, error, "Erreur lors de la récupération de l'évaluation");
  }
}

function parseScore(raw: unknown): number | null | undefined | "invalid" {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;

  const value = Number(raw);

  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : "invalid";
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
      latitude,  // ▼▼▼ NOVOAKO ▼▼▼
      longitude, // ▼▼▼ NOVOAKO ▼▼▼
    } = req.body;

    const createdById = getReqUser(req)?.id;

    if (!projectId || !title || !createdById) {
      res.status(400).json({
        success: false,
        message: "projectId, title et createdById sont obligatoires",
      });
      return;
    }

    const parsedScore = parseScore(score);

    if (parsedScore === "invalid") {
      res.status(400).json({
        success: false,
        message: "Le score doit être un nombre compris entre 0 et 100.",
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

    // ▼▼▼ NOVOAKO : Miantso an'i Open-Elevation ▼▼▼
    let altitude: number | null = null;
    if (latitude && longitude) {
      try {
        const elevationRes = await axios.get(
          `https://api.open-elevation.com/api/v1/lookup?locations=${Number(latitude)},${Number(longitude)}`
        );
        if (elevationRes.data?.results?.length > 0) {
          altitude = elevationRes.data.results[0].elevation;
        }
      } catch (err) {
        logger.error("Erreur Open-Elevation", err);
      }
    }
    // ▲▲▲

    const evaluation = await prisma.evaluation.create({
      data: {
        projectId: Number(projectId),
        title,
        description,
        score: parsedScore ?? undefined,
        status: status ?? "DRAFT",
        evaluatedAt: evaluatedAt
          ? new Date(evaluatedAt)
          : undefined,
        createdById: Number(createdById),
        altitude: altitude, // ▼▼▼ NOVOAKO ▼▼▼
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

    sendError(res, error, "Erreur lors de la création de l'évaluation");
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
    } = req.body;

    const parsedScore = parseScore(score);

    if (parsedScore === "invalid") {
      res.status(400).json({
        success: false,
        message: "Le score doit être un nombre compris entre 0 et 100.",
      });
      return;
    }

    const evaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        projectId:
          projectId !== undefined ? Number(projectId) : undefined,
        title,
        description,
        score: parsedScore,
        status,
        evaluatedAt:
          evaluatedAt !== undefined
            ? evaluatedAt
              ? new Date(evaluatedAt)
              : null
            : undefined,
        createdById: undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: "Évaluation modifiée avec succès",
      data: evaluation,
    });
  } catch (error) {
    logger.error("Erreur modification évaluation", error);

    sendError(res, error, "Erreur lors de la modification de l'évaluation");
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

    sendError(res, error, "Erreur lors de la suppression de l'évaluation");
  }
}