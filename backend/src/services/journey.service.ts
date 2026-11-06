import { z } from "zod";

import { db } from "../utils/db";
import {
  JOURNEY_STATUSES,
  dropoutRate,
  normalizeJourney,
} from "../utils/projectScopeRules";

export const journeySchema = z.object({
  status: z.enum(JOURNEY_STATUSES as [string, ...string[]]),
  statusDate: z.coerce.date().optional(),
  dropoutReason: z.string().max(1000).optional(),
});

export async function setJourney(
  beneficiaryId: number,
  input: z.infer<typeof journeySchema>,
  userId: number,
) {
  const exists = await db.beneficiary.findUnique({ where: { id: beneficiaryId }, select: { id: true } });
  if (!exists) return null;
  const data = normalizeJourney(input as never);
  return db.beneficiaryJourney.upsert({
    where: { beneficiaryId },
    create: { beneficiaryId, ...data, recordedById: userId },
    update: { ...data, recordedById: userId },
  });
}

/** Liste : un bénéficiaire sans ligne est considéré ACTIVE (aucune donnée existante n'est migrée). */
export async function listJourneys(filter: { projectId?: number; status?: string }) {
  const rows = await db.beneficiary.findMany({
    where: filter.projectId ? { projectId: filter.projectId } : {},
    select: {
      id: true, firstName: true, lastName: true, projectId: true,
      project: { select: { name: true } },
    },
    orderBy: { id: "asc" },
    take: 2000,
  });
  const journeys: Array<Record<string, any>> = await db.beneficiaryJourney.findMany({
    where: { beneficiaryId: { in: rows.map((r: { id: number }) => r.id) } },
  });
  const byId = new Map(journeys.map((j) => [j.beneficiaryId, j]));
  const merged = rows.map((r: Record<string, any>) => {
    const j = byId.get(r.id);
    return {
      ...r,
      journeyStatus: j?.status ?? "ACTIVE",
      statusDate: j?.statusDate ?? null,
      dropoutReason: j?.dropoutReason ?? null,
    };
  });
  return filter.status ? merged.filter((m: { journeyStatus: string }) => m.journeyStatus === filter.status) : merged;
}

export async function journeySummary(allowedProjects?: number[], projectId?: number) {
  const where: Record<string, unknown> = {};
  if (projectId) where.beneficiary = { projectId };
  else if (allowedProjects) where.beneficiary = { projectId: { in: allowedProjects } };
  const grouped: Array<{ status: string; _count: { _all: number } }> = await db.beneficiaryJourney.groupBy({
    by: ["status"], where, _count: { _all: true },
  });
  const c = { ACTIVE: 0, COMPLETED: 0, DROPPED_OUT: 0 } as Record<string, number>;
  for (const g of grouped) c[g.status] = g._count._all;
  return { counts: c, ...dropoutRate(c as never) };
}

/** Table de labels pour ML/compare_baseline.py : 1 = abandon, 0 = terminé ; parcours actifs exclus. */
export async function dropoutLabels() {
  const rows: Array<{ beneficiaryId: number; status: string; statusDate: Date | null }> =
    await db.beneficiaryJourney.findMany({
      where: { status: { in: ["COMPLETED", "DROPPED_OUT"] } },
      select: { beneficiaryId: true, status: true, statusDate: true },
    });
  return rows.map((r) => ({
    beneficiaryId: r.beneficiaryId,
    dropout: r.status === "DROPPED_OUT" ? 1 : 0,
    statusDate: r.statusDate,
  }));
}
