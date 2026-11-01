import { prisma } from "../config/database";
import { computeMonitoring, loadProjectContext } from "./monitoring.service";
import { loadInternshipsMonitoring } from "./internshipMonitoring.service";

export type MilestoneCreateData = {
  projectId: number;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  progress?: number;
};

export type MilestoneUpdateData = {
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  progress?: number;
};

export async function findAllMilestones() {
  return prisma.milestone.findMany({
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          createdById: true,
        },
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
  });
}

export async function findMilestoneById(
  id: number,
) {
  return prisma.milestone.findUnique({
    where: {
      id,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          createdById: true,
        },
      },
    },
  });
}

export async function createMilestone(
  data: MilestoneCreateData,
) {
  return prisma.milestone.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? null,
      dueDate: data.dueDate ?? null,
      progress: data.progress ?? 0,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          createdById: true,
        },
      },
    },
  });
}

export async function updateMilestone(
  id: number,
  data: MilestoneUpdateData,
) {
  return prisma.milestone.update({
    where: {
      id,
    },
    data,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          createdById: true,
        },
      },
    },
  });
}

export async function deleteMilestone(
  id: number,
) {
  return prisma.milestone.delete({
    where: {
      id,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Progression automatique (Suivi & Évaluation)                         */
/* ------------------------------------------------------------------ */

const clampPct = (n: number) => Math.min(Math.max(n, 0), 100);

const avgOf = (values: Array<number | null | undefined>): number | null => {
  const list = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  return list.length
    ? list.reduce((a, b) => a + b, 0) / list.length
    : null;
};

/**
 * Progression d'un jalon = moyenne de :
 *  - l'avancement du projet (activités + indicateurs, calculé par le
 *    Suivi & Évaluation ; les jalons sont exclus pour éviter une
 *    dépendance circulaire) ;
 *  - l'avancement des stages (stagiaires) rattachés au projet.
 * Retourne null si aucune donnée de suivi n'est disponible.
 */
export async function computeAutoProgress(
  projectId: number,
): Promise<number | null> {
  let projectPct: number | null = null;
  let internshipsPct: number | null = null;

  try {
    const ctx = await loadProjectContext(projectId);

    if (ctx) {
      const monitoring = computeMonitoring(ctx);

      projectPct = avgOf([
        monitoring.components.activities,
        monitoring.components.indicators,
      ]);
    }
  } catch {
    projectPct = null;
  }

  try {
    const rows = await loadInternshipsMonitoring({}, { projectId });

    internshipsPct = avgOf(
      rows.map((row) => row.metrics.actualProgress),
    );
  } catch {
    internshipsPct = null;
  }

  const value = avgOf([projectPct, internshipsPct]);

  return value === null ? null : Math.round(clampPct(value));
}

/**
 * Remplace la progression des jalons non terminés par la valeur
 * automatique issue du Suivi & Évaluation (et la synchronise en base).
 */
export async function withAutoProgress<
  T extends { id: number; projectId: number; progress: number; completedAt: Date | null },
>(milestones: T[]): Promise<T[]> {
  const cache = new Map<number, number | null>();

  const projectIds = [...new Set(milestones.map((m) => m.projectId))];

  await Promise.all(
    projectIds.map(async (projectId) => {
      cache.set(projectId, await computeAutoProgress(projectId));
    }),
  );

  return Promise.all(
    milestones.map(async (milestone) => {
      if (milestone.completedAt) return milestone;

      const auto = cache.get(milestone.projectId);

      if (auto === null || auto === undefined) return milestone;

      if (auto !== milestone.progress) {
        try {
          await prisma.milestone.update({
            where: { id: milestone.id },
            data: { progress: auto },
          });
        } catch {
          /* la valeur calculée est quand même renvoyée */
        }
      }

      return { ...milestone, progress: auto };
    }),
  );
}
