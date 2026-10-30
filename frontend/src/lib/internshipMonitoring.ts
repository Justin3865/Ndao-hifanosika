// src/lib/internshipMonitoring.ts
// Types et agrégations S&E des stagiaires (les calculs détaillés
// sont faits par le backend à partir de PostgreSQL : tâches, rapports,
// évaluations, présence et GPS).

import { avg, type SeAlert, type Trend } from "@/lib/monitoring";

export type InternshipStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface PersonRef {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface InternshipAlert {
  code: string;
  level: "critical" | "warning" | "info";
  category: "Stagiaire" | "GPS" | "Données";
  message: string;
}

export interface InternshipTaskItem {
  id: number;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "CANCELLED";
  progress: number;
  dueDate: string | null;
  completedAt: string | null;
  hasReport: boolean;
  hasEvidence: boolean;
}

export interface InternshipEvaluationItem {
  id: number;
  title: string;
  technicalScore: number | null;
  qualityScore: number | null;
  autonomyScore: number | null;
  punctualityScore: number | null;
  communicationScore: number | null;
  overallScore: number | null;
  evaluatedAt: string | null;
}

export interface InternshipMonitoring {
  id: number;
  title: string;
  /** Thème du stagiaire (celui imprimé sur le certificat) */
  theme?: string | null;
  department?: { id: number; name: string } | null;
  status: InternshipStatus;
  institution?: string | null;
  startDate: string;
  endDate: string | null;
  project: { id: number; name: string; code: string } | null;
  student: PersonRef;
  supervisor: PersonRef | null;
  time: { totalDays: number | null; elapsedDays: number | null; remainingDays: number | null; elapsedPct: number | null };
  plannedProgress: number | null;
  actualProgress: number | null;
  gap: number | null;
  trend: Trend;
  components: { tasks: number | null; reports: number | null; evaluations: number | null; presence: number | null };
  evidencePct: number | null;
  tasks: { total: number; completed: number; inProgress: number; todo: number; blocked: number; overdue: number; cancelled: number };
  reports: { total: number; missing: number };
  evaluations: { count: number; averageOn20: number | null };
  presence: { presentDays: number; workingDays: number; rate: number | null; gpsCheckins: number; gpsPoints: number };
  alerts: InternshipAlert[];
  // détail uniquement
  taskList?: InternshipTaskItem[];
  evaluationList?: InternshipEvaluationItem[];
  presenceDays?: string[];
}

export const INTERNSHIP_STATUS_LABEL: Record<InternshipStatus, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

export const TASK_STATUS_LABEL: Record<InternshipTaskItem["status"], string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  BLOCKED: "Bloquée",
  CANCELLED: "Annulée",
};

export const fullName = (p?: { firstName: string; lastName: string } | null) =>
  p ? `${p.firstName} ${p.lastName}`.trim() : "—";

/** Alertes stagiaires converties au format des alertes S&E globales. */
export function internshipAlertsToSe(list: InternshipMonitoring[]): SeAlert[] {
  return list.flatMap((i) =>
    i.alerts.map((a, idx) => ({
      id: `intern:${i.id}:${a.code}:${idx}`,
      level: a.level,
      category: a.category,
      message: a.message,
      projectId: i.id,
      projectName: `Stagiaire · ${fullName(i.student)}`,
      href: `/suivi-evaluation/stagiaires/${i.id}`,
    }))
  );
}

export interface InternshipSummary {
  total: number;
  inProgress: number;
  completed: number;
  avgProgress: number | null;
  avgPresence: number | null;
  tasksTotal: number;
  tasksDone: number;
  tasksOverdue: number;
  tasksBlocked: number;
  reportsMissing: number;
  evaluations: number;
  gpsCheckins: number;
  late: number;
  alerts: number;
}

export function summarizeInternships(list: InternshipMonitoring[]): InternshipSummary {
  const sum = (f: (i: InternshipMonitoring) => number) => list.reduce((a, i) => a + f(i), 0);
  return {
    total: list.length,
    inProgress: list.filter((i) => i.status === "IN_PROGRESS").length,
    completed: list.filter((i) => i.status === "COMPLETED").length,
    avgProgress: avg(list.filter((i) => i.status !== "CANCELLED").map((i) => i.actualProgress)),
    avgPresence: avg(list.map((i) => i.presence.rate)),
    tasksTotal: sum((i) => i.tasks.total),
    tasksDone: sum((i) => i.tasks.completed),
    tasksOverdue: sum((i) => i.tasks.overdue),
    tasksBlocked: sum((i) => i.tasks.blocked),
    reportsMissing: sum((i) => i.reports.missing),
    evaluations: sum((i) => i.evaluations.count),
    gpsCheckins: sum((i) => i.presence.gpsCheckins),
    late: list.filter((i) => i.trend === "LATE" || i.trend === "CRITICAL").length,
    alerts: sum((i) => i.alerts.length),
  };
}
