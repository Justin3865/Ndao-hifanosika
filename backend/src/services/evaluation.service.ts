import { prisma } from "../config/database";

export async function findAllEvaluations(projectId?: number) {
  return prisma.evaluation.findMany({
    where: projectId
      ? {
          projectId,
        }
      : undefined,
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
}

export async function findEvaluationById(id: number) {
  return prisma.evaluation.findUnique({
    where: { id },
    include: {
      project: true,
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
}

export async function createEvaluation(data: {
  projectId: number;
  title: string;
  description?: string;
  score?: number;
  status?: any;
  evaluatedAt?: Date;
  createdById: number;
}) {
  return prisma.evaluation.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      score: data.score,
      status: data.status ?? "DRAFT",
      evaluatedAt: data.evaluatedAt,
      createdById: data.createdById,
    },
    include: {
      project: true,
      createdBy: true,
    },
  });
}

export async function updateEvaluation(
  id: number,
  data: {
    projectId?: number;
    title?: string;
    description?: string;
    score?: number | null;
    status?: any;
    evaluatedAt?: Date | null;
    createdById?: number;
  },
) {
  return prisma.evaluation.update({
    where: { id },
    data,
    include: {
      project: true,
      createdBy: true,
    },
  });
}

export async function deleteEvaluation(id: number) {
  return prisma.evaluation.delete({
    where: { id },
  });
}

export async function getAverageEvaluationScore(
  projectId?: number,
) {
  const result = await prisma.evaluation.aggregate({
    where: {
      ...(projectId ? { projectId } : {}),
      score: {
        not: null,
      },
    },
    _avg: {
      score: true,
    },
  });

  return result._avg.score;
}