// src/routes/mlDropout.routes.ts
// GET /api/service/dropout-features — variables explicatives (SANS nom, contact, CIN ni GPS précis) pour
// ml_service/compare_live.py. Les LABELS (abandon / terminé) viennent, eux, de GET /api/journey/labels
// (JWT ADMIN/DIRECTION) : la jointure se fait par beneficiaryId côté Python.
//
// Protégé par la clé de service (en-tête x-service-key), comme /api/service/dataset.

import { timingSafeEqual } from "crypto";
import { Request, Response, Router } from "express";

import { logger } from "../config/logger";
import { db } from "../utils/db";
import { getHeadquarters, haversineKm } from "../services/vulnerability.service";
import { ageOf } from "../utils/dataProtectionRules";
import { dropoutLabels } from "../services/journey.service";

export const mlDropoutRouter = Router();

function validServiceKey(received: string | undefined): boolean {
  const expected = process.env.AI_SERVICE_KEY;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const mean = (v: number[]) => (v.length ? v.reduce((x, y) => x + y, 0) / v.length : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bit = (v: unknown): number | null => (v === true ? 1 : v === false ? 0 : null);

mlDropoutRouter.get("/dropout-features", async (req: Request, res: Response) => {
  if (!validServiceKey(req.header("x-service-key"))) {
    return res.status(401).json({ success: false, message: "Clé de service invalide." });
  }
  try {
    const now = new Date();
    const [people, projects, milestones, evaluations, surveys, zones, hq, attendanceGroups] = await Promise.all([
      db.beneficiary.findMany({
        select: {
          id: true, projectId: true, zoneId: true, age: true, birthDate: true, gender: true, vulnerable: true,
          hasDisability: true, householdSize: true, monthlyIncome: true, childrenUnder5: true,
          homeLatitude: true, homeLongitude: true, homeAltitude: true, lastSeenAt: true,
        },
      }),
      db.project.findMany({ select: { id: true, status: true } }),
      db.milestone.findMany({ select: { projectId: true, dueDate: true, completedAt: true } }),
      db.evaluation.findMany({ where: { score: { not: null } }, select: { projectId: true, score: true } }),
      db.survey.findMany({
        orderBy: { createdAt: "desc" },
        select: { beneficiaryId: true, mealsPerDay: true, outOfSchoolChildren: true, healthIssues: true, waterAccess: true, electricityAccess: true },
      }),
      db.zone.findMany({ select: { id: true, latitude: true, longitude: true } }),
      getHeadquarters(),
      db.beneficiaryAttendance.groupBy({ by: ["beneficiaryId", "present"], _count: { _all: true } }),
    ]);

    // Présences pointées par bénéficiaire (taux de présence = présents / séances pointées).
    const tally = new Map<number, { present: number; absent: number }>();
    for (const g of attendanceGroups as Array<{ beneficiaryId: number; present: boolean; _count: { _all: number } }>) {
      const t = tally.get(g.beneficiaryId) ?? { present: 0, absent: 0 };
      if (g.present) t.present += g._count._all;
      else t.absent += g._count._all;
      tally.set(g.beneficiaryId, t);
    }

    const statusOf = new Map<number, string>(projects.map((p: { id: number; status: string }) => [p.id, p.status]));
    const zoneOf = new Map<number, { latitude: number; longitude: number }>(zones.map((z: { id: number; latitude: number; longitude: number }) => [z.id, z]));
    const lastSurvey = new Map<number, Record<string, unknown>>();
    for (const s of surveys as Array<Record<string, unknown> & { beneficiaryId: number }>) if (!lastSurvey.has(s.beneficiaryId)) lastSurvey.set(s.beneficiaryId, s);

    const overdueRatio = new Map<number, number>();
    const byProject = new Map<number, Array<{ dueDate: Date | null; completedAt: Date | null }>>();
    for (const m of milestones as Array<{ projectId: number; dueDate: Date | null; completedAt: Date | null }>) {
      byProject.set(m.projectId, [...(byProject.get(m.projectId) ?? []), m]);
    }
    for (const [pid, list] of byProject) {
      const late = list.filter((m) => !m.completedAt && m.dueDate && new Date(m.dueDate).getTime() < now.getTime()).length;
      overdueRatio.set(pid, list.length ? late / list.length : 0);
    }
    const evalAvg = new Map<number, number>();
    const evByProject = new Map<number, number[]>();
    for (const e of evaluations as Array<{ projectId: number; score: number }>) evByProject.set(e.projectId, [...(evByProject.get(e.projectId) ?? []), Number(e.score)]);
    for (const [pid, list] of evByProject) evalAvg.set(pid, mean(list) as number);

    const data = (people as Array<Record<string, any>>).map((b) => {
      const zone = b.zoneId !== null ? zoneOf.get(b.zoneId) : undefined;
      const lat = b.homeLatitude ?? zone?.latitude ?? null;
      const lng = b.homeLongitude ?? zone?.longitude ?? null;
      const sv = lastSurvey.get(b.id) ?? {};
      const status = statusOf.get(b.projectId);
      return {
        beneficiaryId: b.id,
        projectId: b.projectId, // sert uniquement au découpage de validation par projet (GroupKFold)
        project_suspended: status === "SUSPENDED" ? 1 : 0,
        project_draft: status === "DRAFT" ? 1 : 0,
        overdue_ratio: overdueRatio.get(b.projectId) ?? 0,
        eval_avg: evalAvg.get(b.projectId) ?? null,
        vulnerable: b.vulnerable ? 1 : 0,
        age: ageOf(b, now),
        female: b.gender === "FEMALE" ? 1 : b.gender ? 0 : null,
        household_size: num(b.householdSize),
        monthly_income_kar: num(b.monthlyIncome) !== null ? Math.round((b.monthlyIncome as number) / 1000) : null,
        children_under5: num(b.childrenUnder5),
        has_disability: b.hasDisability ? 1 : 0,
        meals_per_day: num(sv.mealsPerDay),
        out_of_school_children: num(sv.outOfSchoolChildren),
        health_issues: bit(sv.healthIssues),
        no_water: sv.waterAccess === false ? 1 : sv.waterAccess === true ? 0 : null,
        no_electricity: sv.electricityAccess === false ? 1 : sv.electricityAccess === true ? 0 : null,
        // Variables du modèle de référence (identiques aux entrées de POST /api/ai/score/dropout-risk).
        attendance_rate: (() => {
          const t = tally.get(b.id);
          const total = t ? t.present + t.absent : 0;
          return total > 0 ? Math.round(((t as { present: number }).present / total) * 1000) / 10 : null;
        })(),
        activities_completed: tally.get(b.id)?.present ?? 0,
        missed_activities: tally.get(b.id)?.absent ?? 0,
        altitude: num(b.homeAltitude),
        distance_km: hq && lat !== null && lng !== null ? Math.round(haversineKm(hq.lat, hq.lng, lat, lng) * 10) / 10 : null,
        // ATTENTION : attendance_rate / missed_activities / activities_completed sont mesurées à la date
        // d'export, donc en partie postérieures à l'abandon (circularité, voir ml/dropout.py).
        // ATTENTION : variable potentiellement postérieure à l'abandon (on ne revoit plus quelqu'un qui a abandonné).
        days_since_seen: b.lastSeenAt ? Math.round((now.getTime() - new Date(b.lastSeenAt).getTime()) / 86_400_000) : null,
      };
    });
    res.json({ success: true, generatedAt: now.toISOString(), count: data.length, data });
  } catch (error) {
    logger.error("Erreur dropout-features", error);
    res.status(500).json({ success: false, message: "Erreur lors de l'export des variables." });
  }
});

/**
 * GET /api/service/dropout-training — jeu d'entraînement prêt à l'emploi pour ml_service
 * (POST /v1/train/dropout) : labels du parcours (1 = abandon, 0 = terminé ; actifs exclus) joints aux
 * variables de /dropout-features. Pseudonymisé (aucun nom/contact), protégé par x-service-key.
 */
mlDropoutRouter.get("/dropout-training", async (req: Request, res: Response) => {
  if (!validServiceKey(req.header("x-service-key"))) {
    return res.status(401).json({ success: false, message: "Clé de service invalide." });
  }
  try {
    const port = process.env.PORT ?? "4000";
    const features = await fetch(`http://127.0.0.1:${port}/api/service/dropout-features`, {
      headers: { "x-service-key": process.env.AI_SERVICE_KEY ?? "" },
      signal: AbortSignal.timeout(30_000),
    }).then((r) => r.json() as Promise<{ data: Array<{ beneficiaryId: number }> }>);
    const labels = await dropoutLabels();
    const byId = new Map(features.data.map((f) => [f.beneficiaryId, f]));
    const data = labels
      .filter((l) => byId.has(l.beneficiaryId))
      .map((l) => ({ ...byId.get(l.beneficiaryId), dropout: l.dropout }));
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    logger.error("Erreur dropout-training", error);
    return res.status(500).json({ success: false, message: "Erreur lors de l'export d'entraînement." });
  }
});
