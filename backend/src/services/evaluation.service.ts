import { prisma } from "../config/database";
import axios from "axios"; // <-- NOVOAKO
import { logger } from "../config/logger"; // <-- NOVOAKO (Raha mampiasa azy ianao)

// ▼▼▼ NOVOAKO : Function miantso ny API Open-Elevation ▼▼▼
async function getAltitudeFromAPI(lat: number, lng: number): Promise<number | null> {
  try {
    const response = await axios.get(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
    );
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data.results[0].elevation;
    }
    return null;
  } catch (error) {
    logger.error("Erreur Open-Elevation API", error);
    return null;
  }
}
// ▲▲▲

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
  latitude?: number;  // <-- NOVOAKO
  longitude?: number; // <-- NOVOAKO
}) {
  let altitude = null; // <-- NOVOAKO

  // ▼▼▼ NOVOAKO : Raha nomena ny lat sy lng dia maka ny altitude ▼▼▼
  if (data.latitude !== undefined && data.longitude !== undefined) {
    altitude = await getAltitudeFromAPI(data.latitude, data.longitude);
  }
  // ▲▲▲

  return prisma.evaluation.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      score: data.score,
      status: data.status ?? "DRAFT",
      evaluatedAt: data.evaluatedAt,
      createdById: data.createdById,
      altitude: altitude, // <-- NOVOAKO
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