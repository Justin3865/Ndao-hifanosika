import { prisma } from "../config/database";
import { fetchLive } from "./pyLive.service";
import { analyzeWithPython } from "./pyservices.service";

/**
 * Analyses de pilotage calculées à partir de la base de données.
 *  - Moteur principal : service Python (ai-service, POST /v1/insights) ;
 *  - Repli automatique : calcul local (règles + statistiques) si le service est arrêté.
 */

const DAY = 24 * 3600 * 1000;
const round = (value: number, digits = 1) =>
  Math.round(value * 10 ** digits) / 10 ** digits;
const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));
const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

export async function loadData() {
  const [projects, milestones, evaluations, activities, beneficiaries, internships, users, departments] =
    await Promise.all([
      prisma.project.findMany({
        select: {
          id: true, name: true, code: true, status: true, budget: true, startDate: true,
          endDate: true, beneficiaryTarget: true, departmentId: true, createdById: true,
        },
      }),
      prisma.milestone.findMany({
        select: { id: true, projectId: true, title: true, progress: true, dueDate: true, completedAt: true },
      }),
      prisma.evaluation.findMany({
        select: { id: true, projectId: true, title: true, score: true, status: true, evaluatedAt: true, createdAt: true, createdById: true },
      }),
      prisma.activity.findMany({
        select: {
          id: true, projectId: true, title: true, status: true, budget: true,
          startDate: true, endDate: true, createdById: true,
        },
      }),
      prisma.beneficiary.findMany({
        select: {
          id: true, projectId: true, firstName: true, lastName: true, age: true, vulnerable: true,
          phone: true, trackingEnabled: true, lastSeenAt: true,
        },
      }),
      prisma.internship.findMany({
        select: {
          id: true, projectId: true, studentId: true, supervisorId: true, title: true,
          status: true, startDate: true, endDate: true,
        },
      }),
      prisma.user.findMany({
        where: { status: "PENDING" } as never,
        select: { id: true, firstName: true, lastName: true, createdAt: true },
      }),
      prisma.department.findMany({ select: { id: true, name: true } }),
    ]);

  return { projects, milestones, evaluations, activities, beneficiaries, internships, users, departments };
}

type Data = Awaited<ReturnType<typeof loadData>>;

/* ------------------------- performance par projet ------------------------- */

function computePerformance(data: Data) {
  const now = Date.now();

  return data.projects.map((project) => {
    const ms = data.milestones.filter((m) => m.projectId === project.id);
    const ev = data.evaluations.filter((e) => e.projectId === project.id && e.score !== null);
    const ac = data.activities.filter((a) => a.projectId === project.id && a.status !== "CANCELLED");

    const milestoneProgress = mean(ms.map((m) => Number(m.progress ?? 0)));
    const evaluationAverage = mean(ev.map((e) => Number(e.score)));
    const activityCompletion = ac.length
      ? (ac.filter((a) => a.status === "COMPLETED").length / ac.length) * 100
      : null;

    const start = project.startDate ? new Date(project.startDate).getTime() : Number.NaN;
    const end = project.endDate ? new Date(project.endDate).getTime() : Number.NaN;
    const elapsed = end > start ? clamp(((now - start) / (end - start)) * 100) : 0;
    const scheduleGap =
      milestoneProgress !== null ? round(milestoneProgress - elapsed) : null;

    // Score pondéré sur les composantes disponibles
    const parts: Array<[number | null, number]> = [
      [milestoneProgress, 0.35],
      [activityCompletion, 0.25],
      [evaluationAverage, 0.25],
      [scheduleGap !== null ? clamp(100 + Math.min(0, scheduleGap)) : null, 0.15],
    ];

    const available = parts.filter(([value]) => value !== null) as Array<[number, number]>;
    const weight = available.reduce((sum, [, w]) => sum + w, 0);
    const score = weight
      ? round(available.reduce((sum, [value, w]) => sum + value * w, 0) / weight)
      : null;

    const level =
      score === null ? "UNKNOWN" : score >= 75 ? "GOOD" : score >= 50 ? "WATCH" : "CRITICAL";

    return {
      projectId: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      score,
      level,
      factors: {
        milestoneProgress: milestoneProgress !== null ? round(milestoneProgress) : null,
        activityCompletion: activityCompletion !== null ? round(activityCompletion) : null,
        evaluationAverage: evaluationAverage !== null ? round(evaluationAverage) : null,
        timeElapsed: round(elapsed),
        scheduleGap,
      },
    };
  });
}

/* ------------------------------ anomalies (repli local) ------------------------------ */

export interface AnomalyRow {
  key: string;
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  link: string;
  entityKind: string;
  entityId: number | null;
  projectId: number | null;
  ownerIds: number[];
}

/** Anomalies de base (8 types) quand le service Python n'est pas disponible. */
function computeAnomalies(data: Data): AnomalyRow[] {
  const now = Date.now();
  const nameOf = (id: number) => data.projects.find((p) => p.id === id)?.name ?? `Projet #${id}`;
  const creatorOf = (id: number | null) => data.projects.find((p) => p.id === id)?.createdById ?? null;
  const anomalies: AnomalyRow[] = [];

  const add = (
    type: string,
    severity: AnomalyRow["severity"],
    title: string,
    detail: string,
    link: string,
    entityKind: string,
    entityId: number,
    projectId: number | null,
    owners: Array<number | null | undefined>,
  ) =>
    anomalies.push({
      key: `${type}:${entityId}`,
      type,
      severity,
      title,
      detail,
      link,
      entityKind,
      entityId,
      projectId,
      ownerIds: Array.from(new Set(owners.filter((o): o is number => typeof o === "number"))),
    });

  for (const m of data.milestones) {
    if (!m.completedAt && m.dueDate && new Date(m.dueDate).getTime() < now) {
      const days = Math.floor((now - new Date(m.dueDate).getTime()) / DAY);
      add(
        "OVERDUE_MILESTONE",
        days > 30 ? "HIGH" : days > 7 ? "MEDIUM" : "LOW",
        `Jalon en retard : ${m.title}`,
        `${nameOf(m.projectId)} — échéance dépassée de ${days} jour(s), progression ${m.progress ?? 0}%.`,
        `/milestones/${m.id}`,
        "milestone",
        m.id,
        m.projectId,
        [creatorOf(m.projectId)],
      );
    }
  }

  for (const p of data.projects) {
    if (p.status === "ACTIVE" && p.endDate && new Date(p.endDate).getTime() < now) {
      add("PROJECT_OVERDUE", "HIGH", `Projet dépassé : ${p.name}`, "La date de fin est passée mais le projet est toujours actif.", `/projects/${p.id}`, "project", p.id, p.id, [p.createdById]);
    }

    const budget = Number(p.budget ?? 0);
    const spent = data.activities
      .filter((a) => a.projectId === p.id && a.status !== "CANCELLED")
      .reduce((sum, a) => sum + Number(a.budget ?? 0), 0);

    if (budget > 0 && spent > budget) {
      add("BUDGET_EXCEEDED", "HIGH", `Budget dépassé : ${p.name}`, `Les activités totalisent ${spent.toLocaleString("fr-FR")} Ar pour un budget de ${budget.toLocaleString("fr-FR")} Ar.`, `/projects/${p.id}`, "project", p.id, p.id, [p.createdById]);
    }

    const target = Number(p.beneficiaryTarget ?? 0);
    const reached = data.beneficiaries.filter((b) => b.projectId === p.id).length;
    const start = p.startDate ? new Date(p.startDate).getTime() : Number.NaN;
    const end = p.endDate ? new Date(p.endDate).getTime() : Number.NaN;
    const elapsed = end > start ? (now - start) / (end - start) : 0;

    if (p.status === "ACTIVE" && target > 0 && elapsed > 0.5 && reached / target < 0.3) {
      add("TARGET_GAP", "MEDIUM", `Objectif bénéficiaires en retard : ${p.name}`, `${reached} bénéficiaire(s) enregistré(s) pour une cible de ${target}, alors que ${Math.round(elapsed * 100)}% du temps est écoulé.`, `/projects/${p.id}`, "project", p.id, p.id, [p.createdById]);
    }
  }

  // Scores atypiques (écart à la moyenne > 1,8 écart-type)
  const scored = data.evaluations.filter((e) => e.score !== null);
  if (scored.length >= 5) {
    const values = scored.map((e) => Number(e.score));
    const avg = mean(values) as number;
    const sd = Math.sqrt(mean(values.map((v) => (v - avg) ** 2)) as number);

    if (sd > 0) {
      for (const e of scored) {
        const z = (Number(e.score) - avg) / sd;
        if (Math.abs(z) > 1.8) {
          add("SCORE_OUTLIER", "LOW", `Score atypique : ${e.title}`, `Score ${e.score}/100 contre une moyenne de ${round(avg)} (écart ${round(z, 2)} σ).`, `/evaluations/${e.id}`, "evaluation", e.id, e.projectId, [e.createdById, creatorOf(e.projectId)]);
        }
      }
    }
  }

  for (const i of data.internships) {
    const owners = [i.studentId, i.supervisorId];

    if (i.status === "IN_PROGRESS" && i.endDate && new Date(i.endDate).getTime() < now) {
      add("INTERNSHIP_OVERDUE", "MEDIUM", `Stage à clôturer : ${i.title}`, "La date de fin est dépassée mais le stage est toujours « en cours ».", `/internships/${i.id}`, "internship", i.id, i.projectId, owners);
    }

    if (i.status === "PENDING" && i.startDate && new Date(i.startDate).getTime() < now) {
      add("INTERNSHIP_NOT_STARTED", "LOW", `Stage non démarré : ${i.title}`, "La date de début est passée mais le stage est toujours « en attente ».", `/internships/${i.id}`, "internship", i.id, i.projectId, owners);
    }
  }

  for (const u of data.users) {
    const days = Math.floor((now - new Date(u.createdAt).getTime()) / DAY);
    if (days >= 7) {
      add("PENDING_USER", "LOW", `Inscription en attente : ${u.firstName} ${u.lastName}`, `Demande non traitée depuis ${days} jours.`, `/users/${u.id}`, "user", u.id, null, []);
    }
  }

  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return anomalies.sort((a, b) => order[a.severity] - order[b.severity]);
}

/* -------------------------- risque d'abandon -------------------------- */

function computeDropoutRisk(data: Data) {
  const performance = computePerformance(data);
  const now = Date.now();

  return data.beneficiaries
    .map((b) => {
      const project = data.projects.find((p) => p.id === b.projectId);
      const perf = performance.find((p) => p.projectId === b.projectId);
      const ms = data.milestones.filter((m) => m.projectId === b.projectId);
      const overdue = ms.filter((m) => !m.completedAt && m.dueDate && new Date(m.dueDate).getTime() < now).length;
      const overdueRatio = ms.length ? overdue / ms.length : 0;

      const factors: string[] = [];
      let risk = 0;

      if (project?.status === "SUSPENDED") { risk += 30; factors.push("Projet suspendu"); }
      else if (project?.status === "DRAFT") { risk += 10; factors.push("Projet pas encore lancé"); }

      if (overdueRatio > 0) {
        risk += Math.round(overdueRatio * 25);
        factors.push(`${overdue} jalon(s) en retard`);
      }

      const evalAvg = perf?.factors.evaluationAverage ?? null;
      if (evalAvg !== null && evalAvg < 60) { risk += 20; factors.push(`Évaluations faibles (${evalAvg}/100)`); }
      else if (evalAvg !== null && evalAvg < 70) { risk += 10; factors.push(`Évaluations moyennes (${evalAvg}/100)`); }

      if (b.vulnerable) { risk += 15; factors.push("Personne vulnérable"); }
      if (b.age !== null && b.age < 14) { risk += 5; factors.push("Très jeune (< 14 ans)"); }

      const riskScore = clamp(risk);

      return {
        beneficiaryId: b.id,
        projectId: b.projectId,
        name: `${b.firstName} ${b.lastName}`,
        age: b.age,
        projectName: project?.name ?? `Projet #${b.projectId}`,
        riskScore,
        riskLevel: riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW",
        factors,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

/* ------------------------------- synthèse ------------------------------- */

function computeSummary(data: Data) {
  const performance = computePerformance(data).filter((p) => p.score !== null);
  const anomalies = computeAnomalies(data);
  const risk = computeDropoutRisk(data);

  const best = [...performance].sort((a, b) => (b.score as number) - (a.score as number))[0];
  const worst = [...performance].sort((a, b) => (a.score as number) - (b.score as number))[0];

  const active = data.projects.filter((p) => p.status === "ACTIVE").length;
  const high = anomalies.filter((a) => a.severity === "HIGH").length;
  const highRisk = risk.filter((r) => r.riskLevel === "HIGH").length;
  const scores = data.evaluations.filter((e) => e.score !== null).map((e) => Number(e.score));
  const avgEval = mean(scores);

  const highlights: string[] = [
    `${data.projects.length} projets dont ${active} actifs, ${data.beneficiaries.length} bénéficiaires suivis.`,
  ];
  if (avgEval !== null) highlights.push(`Score moyen des évaluations : ${round(avgEval)}/100 (${scores.length} évaluations).`);
  if (best) highlights.push(`Meilleure performance : « ${best.name} » (${best.score}/100).`);
  if (worst && worst !== best) highlights.push(`Projet le plus fragile : « ${worst.name} » (${worst.score}/100).`);

  const recommendations: string[] = [];
  if (high > 0) recommendations.push(`Traiter en priorité les ${high} anomalie(s) critique(s) (budget, retards majeurs).`);
  if (anomalies.some((a) => a.type === "OVERDUE_MILESTONE"))
    recommendations.push("Réajuster le calendrier ou les ressources des jalons en retard.");
  if (highRisk > 0) recommendations.push(`Organiser un suivi renforcé pour les ${highRisk} bénéficiaire(s) à risque d'abandon élevé.`);
  if (worst && (worst.score as number) < 50)
    recommendations.push(`Mener une revue de projet pour « ${worst.name} » (performance critique).`);
  if (!recommendations.length) recommendations.push("Aucune action urgente : poursuivre le suivi régulier.");

  const headline =
    high > 0
      ? `${high} point(s) critique(s) nécessitent votre attention.`
      : "La situation globale est maîtrisée.";

  return {
    headline,
    highlights,
    recommendations,
    counters: {
      projects: data.projects.length,
      activeProjects: active,
      anomalies: anomalies.length,
      criticalAnomalies: high,
      highRiskBeneficiaries: highRisk,
    },
    generatedAt: new Date().toISOString(),
    method: "Règles et statistiques calculées sur les données réelles (pas de modèle entraîné).",
  };
}

/* ------------------------------ moteur d'analyse ------------------------------ */

export interface Analysis {
  anomalies: AnomalyRow[];
  performance: ReturnType<typeof computePerformance>;
  dropoutRisk: Array<ReturnType<typeof computeDropoutRisk>[number] & { projectId?: number }>;
  summary: ReturnType<typeof computeSummary>;
  /** python-db = lu directement dans la base par le service Python ; python = données envoyées ; typescript = repli local. */
  engine: "python-db" | "python" | "typescript";
}

/** Anomalies déduites des autres analyses (performance critique, risque d'abandon élevé). */
function derivedAnomalies(analysis: Pick<Analysis, "performance" | "dropoutRisk">, data: Data): AnomalyRow[] {
  const creator = new Map(data.projects.map((p) => [p.id, p.createdById]));
  const rows: AnomalyRow[] = [];

  for (const perf of analysis.performance) {
    if (perf.status === "ACTIVE" && perf.score !== null && perf.score < 50) {
      rows.push({
        key: `PROJECT_CRITICAL:${perf.projectId}`,
        type: "PROJECT_CRITICAL",
        severity: "HIGH",
        title: `Performance critique : ${perf.name}`,
        detail: `Score global de ${perf.score}/100 (jalons, activités, évaluations et respect du calendrier).`,
        link: `/projects/${perf.projectId}`,
        entityKind: "project",
        entityId: perf.projectId,
        projectId: perf.projectId,
        ownerIds: [creator.get(perf.projectId)].filter((o): o is number => typeof o === "number"),
      });
    }
  }

  const projectOf = new Map(data.beneficiaries.map((b) => [b.id, b.projectId]));

  for (const risk of analysis.dropoutRisk) {
    if (risk.riskLevel !== "HIGH") continue;

    const projectId = risk.projectId ?? projectOf.get(risk.beneficiaryId) ?? null;

    rows.push({
      key: `DROPOUT_HIGH:${risk.beneficiaryId}`,
      type: "DROPOUT_HIGH",
      severity: "HIGH",
      title: `Risque d'abandon élevé : ${risk.name}`,
      detail: `${risk.projectName} — score ${risk.riskScore}/100 (${risk.factors.join("; ") || "facteurs multiples"}).`,
      link: "/ai/dropout-risk",
      entityKind: "beneficiary",
      entityId: risk.beneficiaryId,
      projectId,
      ownerIds: [projectId !== null ? creator.get(projectId) : null].filter((o): o is number => typeof o === "number"),
    });
  }

  return rows;
}

function mergeAnomalies(base: AnomalyRow[], extra: AnomalyRow[]): AnomalyRow[] {
  const seen = new Set(base.map((row) => row.key));
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  return [...base, ...extra.filter((row) => !seen.has(row.key))].sort(
    (a, b) => order[a.severity] - order[b.severity],
  );
}

/** Service Python (lecture directe de la base, puis données envoyées) ; calcul local si indisponible. */
export async function runAnalysis(data: Data): Promise<Analysis> {
  const live = await fetchLive<Analysis>("/v1/live/insights");

  if (live && Array.isArray(live.anomalies) && Array.isArray(live.performance)) {
    const analysis = { ...live, engine: "python-db" as const };
    analysis.anomalies = mergeAnomalies(analysis.anomalies, derivedAnomalies(analysis, data));
    return analysis;
  }

  const remote = await analyzeWithPython({
    projects: data.projects,
    milestones: data.milestones,
    evaluations: data.evaluations,
    activities: data.activities,
    beneficiaries: data.beneficiaries,
    internships: data.internships,
    pendingUsers: data.users,
  });

  if (remote && Array.isArray(remote.anomalies) && Array.isArray(remote.performance)) {
    const analysis = { ...(remote as unknown as Analysis), engine: "python" as const };
    analysis.anomalies = mergeAnomalies(analysis.anomalies, derivedAnomalies(analysis, data));
    return analysis;
  }

  const performance = computePerformance(data);
  const dropoutRisk = computeDropoutRisk(data);
  const analysis: Analysis = {
    anomalies: [],
    performance,
    dropoutRisk,
    summary: computeSummary(data),
    engine: "typescript",
  };

  analysis.anomalies = mergeAnomalies(computeAnomalies(data), derivedAnomalies(analysis, data));
  analysis.summary.counters.anomalies = analysis.anomalies.length;
  analysis.summary.counters.criticalAnomalies = analysis.anomalies.filter((a) => a.severity === "HIGH").length;

  return analysis;
}

export type { Data };
