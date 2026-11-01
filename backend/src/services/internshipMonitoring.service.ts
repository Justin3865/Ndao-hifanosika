import { prisma } from "../config/database";
import { timeInfo, trendOf } from "./monitoring.service";

/**
 * Suivi & Évaluation des stagiaires — tout est calculé depuis PostgreSQL :
 * tâches (avancement, retards, blocages), rapports, preuves, évaluations (/20),
 * présence et GPS (missions de terrain de l'étudiant).
 */

const clamp = (n: number, min = 0, max = 100) => Math.min(Math.max(n, min), max);

const avg = (values: Array<number | null | undefined>): number | null => {
  const list = values.filter((v): v is number => typeof v === "number");
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
};

/** Pondérations du score de stage (re-normalisées si une composante est absente). */
export const INTERNSHIP_WEIGHTS = { tasks: 40, reports: 20, evaluations: 20, presence: 20 } as const;

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface InternshipTaskRow {
  id: number;
  title: string;
  status: string;
  progress: number;
  dueDate: Date | null;
  completedAt: Date | null;
  hasReport: boolean;
  hasEvidence: boolean;
}

export interface InternshipEvaluationRow {
  id: number;
  title: string;
  technicalScore: number | null;
  qualityScore: number | null;
  autonomyScore: number | null;
  punctualityScore: number | null;
  communicationScore: number | null;
  overallScore: number | null;
  evaluatedAt: Date | null;
}

export interface InternshipAlertDto {
  code: string;
  level: "critical" | "warning" | "info";
  category: "Stagiaire" | "GPS" | "Données";
  message: string;
}

// ------------------------------------------------------------
// Présence = jours (ouvrés) où l'étudiant a lancé une mission GPS
// ------------------------------------------------------------

function workingDaysBetween(from: Date, to: Date): number {
  if (to < from) return 0;
  let count = 0;
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  while (d.getTime() <= end) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Durée de référence d'un stage pour la présence : L3 = 2 mois, M2 = 6 mois (ou durée libre « Autre »). */
export const PRESENCE_MONTHS = { L3: 2, M2: 6 } as const;
export type PresenceLevel = keyof typeof PRESENCE_MONTHS;

/** Dernier jour de la période de référence (début + N mois − 1 jour). */
function presenceEnd(start: Date, months: number): Date {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

// ------------------------------------------------------------
// Calcul pour un stage
// ------------------------------------------------------------

export function computeInternship(
  internship: {
    id: number;
    title: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
    supervisorId: number | null;
    /** niveau du stagiaire : fixe la durée de référence de la présence (L3 = 2 mois, M2 = 6 mois) */
    level?: PresenceLevel;
    /** durée libre (mois) saisie pour « Autre » ; prioritaire sur le niveau. NULL = durée du niveau. */
    durationMonths?: number | null;
  },
  tasks: InternshipTaskRow[],
  evaluations: InternshipEvaluationRow[],
  missions: Array<{ startedAt: Date; points: number }>,
  now = new Date()
) {
  const operational = internship.status === "IN_PROGRESS" || internship.status === "COMPLETED";
  const time = timeInfo(internship.startDate, internship.endDate, now);

  // --- tâches ---
  const live = tasks.filter((t) => t.status !== "CANCELLED");
  const done = live.filter((t) => t.status === "COMPLETED");
  const overdue = live.filter((t) => t.status !== "COMPLETED" && t.dueDate && t.dueDate < now);
  const blocked = live.filter((t) => t.status === "BLOCKED");
  const tasksPct = avg(live.map((t) => (t.status === "COMPLETED" ? 100 : clamp(t.progress ?? 0))));

  // --- rapports & preuves (sur les tâches terminées) ---
  const doneWithoutReport = done.filter((t) => !t.hasReport);
  const doneWithoutEvidence = done.filter((t) => !t.hasEvidence);
  const reportsPct = done.length ? ((done.length - doneWithoutReport.length) / done.length) * 100 : null;
  const evidencePct = done.length ? ((done.length - doneWithoutEvidence.length) / done.length) * 100 : null;

  // --- évaluations : notes /20 → % ---
  const evalScores = evaluations
    .map((e) => {
      const base =
        e.overallScore ??
        avg([e.technicalScore, e.qualityScore, e.autonomyScore, e.punctualityScore, e.communicationScore]);
      return base === null ? null : clamp((base / 20) * 100);
    })
    .filter((v): v is number => v !== null);
  const evaluationsPct = avg(evalScores);

  // --- présence / GPS ---
  // Jours présents ÷ jours ouvrés de la durée de référence du niveau (L3 : 2 mois, M2 : 6 mois).
  const periodEnd = internship.endDate && internship.endDate < now ? internship.endDate : now;
  const inPeriod = missions.filter((m) => m.startedAt >= internship.startDate && m.startedAt <= periodEnd);
  const elapsedWorkingDays = internship.startDate <= now ? workingDaysBetween(internship.startDate, periodEnd) : 0;
  const elapsedPresentDays = new Set(inPeriod.map((m) => dayKey(m.startedAt))).size;

  let presentDays = elapsedPresentDays;
  let workingDays = elapsedWorkingDays;
  let plannedWorkingDays = elapsedWorkingDays;
  let presencePct: number | null = null;

  const referenceMonths = internship.durationMonths || (internship.level ? PRESENCE_MONTHS[internship.level] : null);

  if (referenceMonths) {
    const refEnd = presenceEnd(internship.startDate, referenceMonths);
    const refEndInclusive = new Date(refEnd.getTime() + 86399999);
    const refMissions = missions.filter((m) => m.startedAt >= internship.startDate && m.startedAt <= refEndInclusive);
    presentDays = new Set(refMissions.map((m) => dayKey(m.startedAt))).size;
    plannedWorkingDays = workingDaysBetween(internship.startDate, refEnd);
    presencePct =
      plannedWorkingDays >= 1 && operational && internship.startDate <= now
        ? clamp((presentDays / plannedWorkingDays) * 100)
        : null;
  } else {
    presencePct = elapsedWorkingDays >= 1 && operational ? clamp((elapsedPresentDays / elapsedWorkingDays) * 100) : null;
  }
  // les alertes de présence restent basées sur le temps écoulé (pas de fausse alerte en début de stage)
  const elapsedPresencePct =
    elapsedWorkingDays >= 1 && operational ? clamp((elapsedPresentDays / elapsedWorkingDays) * 100) : null;

  const components = { tasks: tasksPct, reports: reportsPct, evaluations: evaluationsPct, presence: presencePct };

  let sum = 0;
  let wSum = 0;
  (Object.keys(INTERNSHIP_WEIGHTS) as Array<keyof typeof INTERNSHIP_WEIGHTS>).forEach((k) => {
    const v = components[k];
    if (v === null) return;
    sum += v * INTERNSHIP_WEIGHTS[k];
    wSum += INTERNSHIP_WEIGHTS[k];
  });
  const actualProgress = wSum > 0 ? sum / wSum : internship.status === "COMPLETED" ? 100 : null;
  const plannedProgress = internship.status === "COMPLETED" ? 100 : time.elapsedPct;
  const gap = actualProgress !== null && plannedProgress !== null ? actualProgress - plannedProgress : null;

  // --- alertes ---
  const alerts: InternshipAlertDto[] = [];
  const add = (code: string, level: InternshipAlertDto["level"], category: InternshipAlertDto["category"], message: string) =>
    alerts.push({ code, level, category, message });

  if (internship.endDate && internship.endDate < internship.startDate)
    add("DATES", "critical", "Données", "Dates incohérentes : la fin précède le début du stage.");

  if (internship.status === "IN_PROGRESS") {
    if (overdue.length)
      add("TACHES_EN_RETARD", overdue.length >= 3 ? "critical" : "warning", "Stagiaire", `${overdue.length} tâche(s) en retard.`);
    if (blocked.length) add("TACHES_BLOQUEES", "warning", "Stagiaire", `${blocked.length} tâche(s) bloquée(s).`);
    if (live.length === 0) add("SANS_TACHE", "info", "Stagiaire", "Aucune tâche assignée au stagiaire.");
    if (internship.endDate && internship.endDate < now)
      add("STAGE_ECHU", "warning", "Stagiaire", "La date de fin est dépassée alors que le stage est encore en cours.");
    if (!internship.supervisorId) add("SANS_TUTEUR", "info", "Données", "Aucun tuteur assigné.");

    if (elapsedPresencePct !== null && elapsedWorkingDays >= 5) {
      if (elapsedPresencePct < 50)
        add("PRESENCE_CRITIQUE", "critical", "GPS", `Présence terrain très faible : ${Math.round(elapsedPresencePct)} %.`);
      else if (elapsedPresencePct < 70)
        add("PRESENCE_FAIBLE", "warning", "GPS", `Présence terrain insuffisante : ${Math.round(elapsedPresencePct)} %.`);
    }
    if (elapsedWorkingDays >= 5 && inPeriod.length === 0)
      add("SANS_GPS", "info", "GPS", "Aucun check-in GPS enregistré depuis le début du stage.");
  }

  if (operational) {
    if (doneWithoutReport.length)
      add("RAPPORT_MANQUANT", "warning", "Stagiaire", `${doneWithoutReport.length} tâche(s) terminée(s) sans rapport.`);
    if (doneWithoutEvidence.length)
      add("PREUVE_MANQUANTE", "info", "Stagiaire", `${doneWithoutEvidence.length} tâche(s) terminée(s) sans preuve.`);
    if (evaluations.length === 0 && (internship.status === "COMPLETED" || (time.elapsedPct ?? 0) >= 50))
      add("EVALUATION_MANQUANTE", "warning", "Stagiaire", "Aucune évaluation enregistrée pour ce stage.");
  }

  const order = { critical: 0, warning: 1, info: 2 } as const;
  alerts.sort((a, b) => order[a.level] - order[b.level]);

  return {
    internshipId: internship.id,
    time,
    plannedProgress,
    actualProgress,
    gap,
    trend: trendOf(gap),
    components,
    evidencePct,
    tasks: {
      total: live.length,
      completed: done.length,
      inProgress: live.filter((t) => t.status === "IN_PROGRESS").length,
      todo: live.filter((t) => t.status === "TODO").length,
      blocked: blocked.length,
      overdue: overdue.length,
      cancelled: tasks.length - live.length,
    },
    reports: { total: done.length - doneWithoutReport.length, missing: doneWithoutReport.length },
    evaluations: {
      count: evaluations.length,
      averageOn20: evaluationsPct !== null ? (evaluationsPct / 100) * 20 : null,
    },
    presence: {
      presentDays,
      workingDays,
      plannedWorkingDays,
      referenceMonths,
      rate: presencePct,
      gpsCheckins: inPeriod.length,
      gpsPoints: inPeriod.reduce((a, m) => a + m.points, 0),
    },
    alerts,
  };
}

// ------------------------------------------------------------
// Chargement groupé (pas de N+1) — preuves binaires jamais lues
// ------------------------------------------------------------

const TASK_SELECT = {
  id: true,
  internshipId: true,
  title: true,
  status: true,
  progress: true,
  dueDate: true,
  completedAt: true,
  report: true,
  evidenceName: true,
} as const;

export async function loadInternshipsMonitoring(
  scope: Record<string, unknown>,
  extraWhere: Record<string, unknown> = {}
) {
  const internships = await prisma.internship.findMany({
    where: { AND: [extraWhere, scope] } as never,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true } },
      student: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      supervisor: { select: { id: true, firstName: true, lastName: true } },
      tasks: { select: TASK_SELECT },
      evaluations: {
        select: {
          id: true,
          title: true,
          technicalScore: true,
          qualityScore: true,
          autonomyScore: true,
          punctualityScore: true,
          communicationScore: true,
          overallScore: true,
          evaluatedAt: true,
        },
      },
    },
  });

  const studentIds = [...new Set(internships.map((i) => i.studentId))];
  const missions = studentIds.length
    ? await prisma.mission.findMany({
        where: { agentId: { in: studentIds } },
        select: { agentId: true, startedAt: true, _count: { select: { points: true } } },
      })
    : [];

  const byStudent = new Map<number, Array<{ startedAt: Date; points: number }>>();
  missions.forEach((m) => {
    const list = byStudent.get(m.agentId) ?? [];
    list.push({ startedAt: m.startedAt, points: m._count.points });
    byStudent.set(m.agentId, list);
  });

  return internships.map((i) => {
    const taskRows: InternshipTaskRow[] = i.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      progress: t.progress,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
      hasReport: !!t.report && t.report.trim().length > 0,
      hasEvidence: !!t.evidenceName,
    }));
    const studentMissions = byStudent.get(i.studentId) ?? [];
    const metrics = computeInternship({ ...i, level: String(i.student?.role ?? "").endsWith("M2") ? "M2" : "L3" }, taskRows, i.evaluations, studentMissions);
    return { internship: i, taskRows, metrics, missions: studentMissions };
  });
}
