import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

export async function getDashboardReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const [
      projects,
      beneficiaries,
      users,
      evaluations,
      internships,
      activities,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.beneficiary.count(),
      prisma.user.count(),
      prisma.evaluation.count(),
      prisma.internship.count(),
      prisma.activity.count(),
    ]);

    const [
      activeProjects,
      completedProjects,
      activeUsers,
      completedInternships,
    ] = await Promise.all([
      prisma.project.count({
        where: {
          status: "ACTIVE",
        },
      }),
      prisma.project.count({
        where: {
          status: "COMPLETED",
        },
      }),
      prisma.user.count({
        where: {
          status: "ACTIVE",
        },
      }),
      prisma.internship.count({
        where: {
          status: "COMPLETED",
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totals: {
          projects,
          beneficiaries,
          users,
          evaluations,
          internships,
          activities,
        },
        status: {
          activeProjects,
          completedProjects,
          activeUsers,
          completedInternships,
        },
      },
    });
  } catch (error) {
    logger.error("Erreur rapport dashboard", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la génération du rapport dashboard",
    });
  }
}

export async function getProjectReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const projectId = Number(req.params.projectId);

    if (Number.isNaN(projectId)) {
      res.status(400).json({
        success: false,
        message: "Identifiant projet invalide",
      });
      return;
    }

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
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
        activities: true,
        milestones: true,
        beneficiaries: true,
        evaluations: true,
        internships: true,
      },
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Projet introuvable",
      });
      return;
    }

    const completedActivities = project.activities.filter(
      (activity) => activity.status === "COMPLETED",
    ).length;

    const completedMilestones = project.milestones.filter(
      (milestone) => milestone.progress >= 100,
    ).length;

    const evaluationScores = project.evaluations
      .map((evaluation) => evaluation.score)
      .filter((score): score is number => score !== null);

    const averageScore =
      evaluationScores.length > 0
        ? evaluationScores.reduce((sum, score) => sum + score, 0) /
          evaluationScores.length
        : null;

    res.status(200).json({
      success: true,
      data: {
        project,
        statistics: {
          activities: project.activities.length,
          completedActivities,
          milestones: project.milestones.length,
          completedMilestones,
          beneficiaries: project.beneficiaries.length,
          evaluations: project.evaluations.length,
          internships: project.internships.length,
          averageEvaluationScore: averageScore,
        },
      },
    });
  } catch (error) {
    logger.error("Erreur rapport projet", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la génération du rapport projet",
    });
  }
}

export async function getEvaluationReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const evaluations = await prisma.evaluation.findMany({
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const scores = evaluations
      .map((evaluation) => evaluation.score)
      .filter((score): score is number => score !== null);

    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) /
          scores.length
        : null;

    const validated = evaluations.filter(
      (evaluation) => evaluation.status === "VALIDATED",
    ).length;

    const submitted = evaluations.filter(
      (evaluation) => evaluation.status === "SUBMITTED",
    ).length;

    const draft = evaluations.filter(
      (evaluation) => evaluation.status === "DRAFT",
    ).length;

    res.status(200).json({
      success: true,
      data: {
        total: evaluations.length,
        averageScore,
        byStatus: {
          draft,
          submitted,
          validated,
        },
        evaluations,
      },
    });
  } catch (error) {
    logger.error("Erreur rapport évaluations", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la génération du rapport des évaluations",
    });
  }
}

export async function getBeneficiaryReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const beneficiaries = await prisma.beneficiary.findMany({
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const total = beneficiaries.length;

    const vulnerable = beneficiaries.filter(
      (beneficiary) => beneficiary.vulnerable,
    ).length;

    const male = beneficiaries.filter(
      (beneficiary) => beneficiary.gender === "MALE",
    ).length;

    const female = beneficiaries.filter(
      (beneficiary) => beneficiary.gender === "FEMALE",
    ).length;

    const other = beneficiaries.filter(
      (beneficiary) => beneficiary.gender === "OTHER",
    ).length;

    res.status(200).json({
      success: true,
      data: {
        total,
        vulnerable,
        byGender: {
          male,
          female,
          other,
        },
        beneficiaries,
      },
    });
  } catch (error) {
    logger.error("Erreur rapport bénéficiaires", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la génération du rapport des bénéficiaires",
    });
  }
}