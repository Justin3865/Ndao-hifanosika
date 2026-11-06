// src/services/scopedAggregates.service.ts
// Agrégats recalculés sur un sous-ensemble de projets (périmètre du coordinateur) + comptages démographiques
// protégés (mineurs, femmes vulnérables) avec suppression des petites cellules.
// Ne modifie aucun service existant : réutilise getHeadquarters / haversineKm en lecture.

import { prisma } from "../config/database";
import { db } from "../utils/db";
import { protectedKinds, minCell, suppressSmall } from "../utils/dataProtectionRules";
import { zoneScore } from "../utils/aggregateScopeRules";
import { getHeadquarters, haversineKm } from "./vulnerability.service";

export interface DemographicCell {
  minors: number | null;
  vulnerableWomen: number | null;
}

/** Comptages par zone (clé = zoneId). `projectIds` absent = tous les projets. Les cellules 1..(min-1) sont supprimées. */
export async function demographicsByZone(projectIds?: number[]): Promise<Map<number, DemographicCell>> {
  const rows: Array<{
    zoneId: number | null; age: number | null; birthDate: Date | null; gender: string | null;
    vulnerable: boolean; hasDisability: boolean;
  }> = await db.beneficiary.findMany({
    where: { zoneId: { not: null }, ...(projectIds ? { projectId: { in: projectIds } } : {}) },
    select: { zoneId: true, age: true, birthDate: true, gender: true, vulnerable: true, hasDisability: true },
  });
  const raw = new Map<number, { minors: number; women: number }>();
  const now = new Date();
  for (const r of rows) {
    if (r.zoneId === null) continue;
    const cell = raw.get(r.zoneId) ?? { minors: 0, women: 0 };
    const kinds = protectedKinds(r, now);
    if (kinds.includes("MINOR")) cell.minors += 1;
    if (kinds.includes("VULNERABLE_WOMAN")) cell.women += 1;
    raw.set(r.zoneId, cell);
  }
  const min = minCell();
  return new Map([...raw].map(([id, c]) => [id, { minors: suppressSmall(c.minors, min), vulnerableWomen: suppressSmall(c.women, min) }]));
}

/** Ajoute minors / vulnerableWomen / lowCount à chaque zone (champs NOUVEAUX : rien d'existant n'est modifié). */
export function decorateZones<T extends { id: number; total: number }>(
  zones: T[],
  demo: Map<number, DemographicCell>,
): Array<T & DemographicCell & { lowCount: boolean }> {
  const min = minCell();
  return zones.map((z) => ({
    ...z,
    minors: demo.get(z.id)?.minors ?? (demo.has(z.id) ? null : 0),
    vulnerableWomen: demo.get(z.id)?.vulnerableWomen ?? (demo.has(z.id) ? null : 0),
    lowCount: z.total > 0 && z.total < min,
  }));
}

/** /vulnerability/zones restreint aux projets donnés (même formule que computeZoneStats). */
export async function zoneStatsForProjects(projectIds: number[]) {
  const [zones, counts, altitudes, hq] = await Promise.all([
    prisma.zone.findMany({ where: { isActive: true, latitude: { lt: 1000 }, longitude: { lt: 1000 } }, orderBy: { name: "asc" } }),
    prisma.beneficiary.groupBy({
      by: ["zoneId", "vulnerable"],
      where: { zoneId: { not: null }, projectId: { in: projectIds } },
      _count: { _all: true },
    }),
    prisma.beneficiary.groupBy({
      by: ["zoneId"],
      where: { zoneId: { not: null }, projectId: { in: projectIds } },
      _avg: { homeAltitude: true },
    }),
    getHeadquarters(),
  ]);
  const altByZone = new Map<number, number>();
  for (const r of altitudes) if (r.zoneId !== null && r._avg.homeAltitude !== null) altByZone.set(r.zoneId, Math.round(r._avg.homeAltitude));

  const out = [];
  for (const zone of zones) {
    let total = 0;
    let vulnerable = 0;
    for (const row of counts) {
      if (row.zoneId !== zone.id) continue;
      total += row._count._all;
      if (row.vulnerable) vulnerable += row._count._all;
    }
    if (total === 0) continue; // zone sans bénéficiaire de ses projets : rien à montrer
    const altitude = altByZone.get(zone.id) ?? null;
    const rate = vulnerable / total;
    const dist = hq ? haversineKm(hq.lat, hq.lng, zone.latitude, zone.longitude) : null;
    const score = zoneScore(rate, altitude, dist);
    out.push({
      id: zone.id, name: zone.name, region: zone.region, latitude: zone.latitude, longitude: zone.longitude,
      altitude, total, vulnerable, rate: Math.round(rate * 1000) / 10, score,
      // Le score ML est entraîné sur TOUS les projets : il n'est pas montré à un périmètre restreint.
      mlScore: null as number | null, finalScore: score,
    });
  }
  return out.sort((a, b) => b.finalScore - a.finalScore);
}

/** /reports/dashboard restreint aux projets donnés (mêmes clés que report.controller.getDashboardReport). */
export async function dashboardForProjects(projectIds: number[], coordinatorIds?: number[]) {
  const inProjects = { projectId: { in: projectIds } };
  const [projects, beneficiaries, evaluations, internships, activities, activeProjects, completedProjects, completedInternships] =
    await Promise.all([
      prisma.project.count({ where: { id: { in: projectIds } } }),
      prisma.beneficiary.count({ where: inProjects }),
      prisma.evaluation.count({ where: inProjects }),
      prisma.internship.count({ where: inProjects }),
      prisma.activity.count({ where: inProjects }),
      prisma.project.count({ where: { id: { in: projectIds }, status: "ACTIVE" } }),
      prisma.project.count({ where: { id: { in: projectIds }, status: "COMPLETED" } }),
      prisma.internship.count({ where: { ...inProjects, status: "COMPLETED" } }),
    ]);
  const team: number[] = coordinatorIds ?? [];
  const [users, activeUsers] = await Promise.all([
    team.length ? prisma.user.count({ where: { id: { in: team } } }) : 0,
    team.length ? prisma.user.count({ where: { id: { in: team }, status: "ACTIVE" } }) : 0,
  ]);
  return {
    totals: { projects, beneficiaries, users, evaluations, internships, activities },
    status: { activeProjects, completedProjects, activeUsers, completedInternships },
  };
}

/** Coordinateurs affectés aux projets donnés : sert d'équipe pour le tableau de bord restreint. */
export async function coordinatorsOfProjects(projectIds: number[]): Promise<number[]> {
  const rows: Array<{ userId: number }> = await db.projectCoordinator.findMany({
    where: { projectId: { in: projectIds } },
    select: { userId: true },
  });
  return [...new Set(rows.map((r) => r.userId))];
}
