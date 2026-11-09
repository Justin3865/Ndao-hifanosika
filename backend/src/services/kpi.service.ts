// src/services/kpi.service.ts  (AJOUT) — indicateurs §13 calculés depuis la base existante (aucune migration).
import { db } from "../utils/db";
import { alertUsage, isAdopted, makeKpi, UNMEASURED, type KpiValue } from "../utils/kpiRules";

export async function computeKpis(now = new Date()) {
  const users = await db.user.findMany({ where: { status: "ACTIVE" }, select: { lastLoginAt: true } });
  const adopted = users.filter((u: { lastLoginAt: Date | null }) => isAdopted(u.lastLoginAt, now, 90)).length;

  const actions = await db.anomalyAction.findMany({ select: { status: true } });
  const usage = alertUsage(actions.map((a: { status: string }) => a.status));

  const evals = await db.personEvaluation.findMany({ select: { status: true } });
  const done = evals.filter((e: { status: string }) => e.status === "SUBMITTED" || e.status === "VALIDATED").length;

  const kpis: KpiValue[] = [
    makeKpi("adoption", "Adoption : comptes actifs connectés sur 90 jours", adopted, users.length, null, "Cible à fixer par la Direction."),
    makeKpi("alerts_handled", "Alertes IA ayant fait l'objet d'une décision humaine", usage.touched, usage.total, null, "Compte aussi les alertes prises en charge (IN_PROGRESS)."),
    makeKpi("evaluations_completed", "Évaluations soumises ou validées", done, evals.length, null, "Brouillons exclus."),
  ];
  return { generatedAt: now.toISOString(), kpis, unmeasured: UNMEASURED };
}
