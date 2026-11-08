// src/services/departmentDashboard.service.ts
// Tableau de bord par département (cahier des charges §5.5) : RH, DAF, Communication/Impact.
// Lecture seule. Aucune donnée nominative n'est renvoyée : uniquement des effectifs, taux et totaux.

import { db } from "../utils/db";
import { isObjectiveOverdue, objectiveProgress, OBJECTIVE_STATUSES } from "../utils/gapRules";
import {
  DashboardSection,
  budgetSummary,
  isCampaignLate,
  isInserted,
  mean,
  pct,
  sectionsForRole,
  tally,
} from "../utils/departmentDashboardRules";
import { ScopeDecision, dropoutRate } from "../utils/projectScopeRules";

type Scope = ScopeDecision;

const projectFilter = (scope: Scope) => (scope.scoped ? { projectId: { in: scope.allowed } } : {});

/* ------------------------------ RH ------------------------------ */
async function rhSection() {
  const [internshipRows, objectives, evalStatusRows, evalAvg, campaigns] = await Promise.all([
    db.internship.groupBy({ by: ["status"], _count: { _all: true } }),
    db.memberObjective.findMany({ select: { status: true, dueDate: true, targetValue: true, currentValue: true } }),
    db.personEvaluation.groupBy({ by: ["status"], _count: { _all: true } }),
    db.personEvaluation.aggregate({ _avg: { totalScore: true }, where: { status: { in: ["SUBMITTED", "VALIDATED"] } } }),
    db.evaluationCampaign.findMany({ select: { id: true, name: true, status: true, endDate: true }, orderBy: { endDate: "asc" } }),
  ]);

  const internshipByStatus = Object.fromEntries(
    (internshipRows as Array<{ status: string; _count: { _all: number } }>).map((r) => [r.status, r._count._all]),
  );
  const evalByStatus = Object.fromEntries(
    (evalStatusRows as Array<{ status: string; _count: { _all: number } }>).map((r) => [r.status, r._count._all]),
  );

  const now = new Date();
  const overdueObjectives = (objectives as Array<{ status: string; dueDate: Date | null }>).filter((o) => isObjectiveOverdue(o, now)).length;
  const lateCampaigns = (campaigns as Array<{ id: number; name: string; status: string; endDate: Date | null }>).filter((c) => isCampaignLate(c, now));

  return {
    internships: {
      total: Object.values(internshipByStatus).reduce((s: number, n) => s + Number(n), 0),
      byStatus: internshipByStatus,
      inProgress: Number(internshipByStatus.IN_PROGRESS ?? 0),
    },
    objectives: {
      total: objectives.length,
      byStatus: tally((objectives as Array<{ status: string }>).map((o) => o.status), OBJECTIVE_STATUSES),
      overdue: overdueObjectives,
      averageProgress: mean(
        (objectives as Array<{ currentValue: number | null; targetValue: number | null }>).map((o) => objectiveProgress(o.currentValue, o.targetValue)),
      ),
    },
    evaluations: {
      byStatus: evalByStatus,
      averageScore: evalAvg?._avg?.totalScore != null ? Math.round(Number(evalAvg._avg.totalScore) * 10) / 10 : null,
      campaignsActive: (campaigns as Array<{ status: string }>).filter((c) => c.status === "ACTIVE").length,
      campaignsLate: lateCampaigns.length,
      lateCampaigns: lateCampaigns.slice(0, 5).map((c) => ({ id: c.id, name: c.name, endDate: c.endDate })),
    },
  };
}

/* ------------------------------ DAF ------------------------------ */
async function dafSection(scope: Scope) {
  const projects = await db.project.findMany({
    where: scope.scoped ? { id: { in: scope.allowed } } : {},
    select: { id: true, name: true, code: true, status: true, budget: true, budgetSpent: true },
  });
  return budgetSummary(projects);
}

/* --------------------- Impact (Communication) --------------------- */
async function impactSection(scope: Scope) {
  const where = projectFilter(scope);
  const followWhere = scope.scoped ? { beneficiary: { projectId: { in: scope.allowed } } } : {};

  const [total, byGender, minors, vulnerable, byProjectRows, followUps, presentRows, beneficiaryIds] = await Promise.all([
    db.beneficiary.count({ where }),
    db.beneficiary.groupBy({ by: ["gender"], where, _count: { _all: true } }),
    db.beneficiary.count({ where: { ...where, age: { lt: 18 } } }),
    db.beneficiary.count({ where: { ...where, vulnerable: true } }),
    db.beneficiary.groupBy({ by: ["projectId"], where, _count: { _all: true } }),
    db.postProgramFollowUp.findMany({
      where: { ...followWhere, status: "DONE" },
      select: { occupation: true, activityCreated: true, satisfaction: true },
    }),
    db.beneficiaryAttendance.groupBy({
      by: ["present"],
      where: scope.scoped ? { beneficiary: { projectId: { in: scope.allowed } } } : {},
      _count: { _all: true },
    }),
    scope.scoped ? db.beneficiary.findMany({ where, select: { id: true } }) : Promise.resolve(null),
  ]);

  const journeyRows = await db.beneficiaryJourney.groupBy({
    by: ["status"],
    where: beneficiaryIds ? { beneficiaryId: { in: (beneficiaryIds as Array<{ id: number }>).map((b) => b.id) } } : {},
    _count: { _all: true },
  });
  const journey = { ACTIVE: 0, COMPLETED: 0, DROPPED_OUT: 0 };
  for (const r of journeyRows as Array<{ status: keyof typeof journey; _count: { _all: number } }>) journey[r.status] = r._count._all;

  const projectIds = (byProjectRows as Array<{ projectId: number }>).map((r) => r.projectId);
  const names = projectIds.length
    ? await db.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
    : [];
  const nameOf = new Map((names as Array<{ id: number; name: string }>).map((p) => [p.id, p.name]));

  const presentCount = (presentRows as Array<{ present: boolean; _count: { _all: number } }>).find((r) => r.present)?._count._all ?? 0;
  const sessionsCount = (presentRows as Array<{ _count: { _all: number } }>).reduce((s, r) => s + r._count._all, 0);
  const satisfaction = mean((followUps as Array<{ satisfaction: number | null }>).map((f) => f.satisfaction));
  const inserted = (followUps as Array<{ occupation: string | null; activityCreated: boolean | null }>).filter(isInserted).length;

  return {
    beneficiaries: {
      total,
      byGender: Object.fromEntries((byGender as Array<{ gender: string | null; _count: { _all: number } }>).map((r) => [r.gender ?? "UNKNOWN", r._count._all])),
      minors,
      vulnerable,
      byProject: (byProjectRows as Array<{ projectId: number; _count: { _all: number } }>)
        .map((r) => ({ projectId: r.projectId, name: nameOf.get(r.projectId) ?? `Projet ${r.projectId}`, count: r._count._all }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    },
    journey: { ...journey, ...dropoutRate(journey), completionRate: pct(journey.COMPLETED, journey.COMPLETED + journey.DROPPED_OUT) },
    attendance: { sessions: sessionsCount, present: presentCount, rate: pct(presentCount, sessionsCount) },
    postProgram: {
      completed: followUps.length,
      insertionRate: pct(inserted, followUps.length),
      satisfaction,
    },
  };
}

/* --------------------------- Assemblage --------------------------- */
export async function buildDepartmentDashboard(role: string, scope: Scope) {
  const sections = sectionsForRole(role);
  const data: Record<string, unknown> = {};
  await Promise.all(
    sections.map(async (s: DashboardSection) => {
      if (s === "RH") data.rh = await rhSection();
      if (s === "DAF") data.daf = await dafSection(scope);
      if (s === "IMPACT") data.impact = await impactSection(scope);
    }),
  );
  return { role, sections, scoped: scope.scoped, generatedAt: new Date().toISOString(), ...data };
}
