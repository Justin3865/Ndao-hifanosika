// src/lib/finalEvaluation.ts
// Évaluation finale automatique (projets + stages), notée sur 20.

import api from "@/lib/axios";

const base = "/final-evaluation";

export type Level = "L3" | "M2";
export type FeedbackKind = "PARTNER" | "BENEFICIARY";
export type Phase = "FINAL" | "INTERIM" | "NOT_STARTED" | "CANCELLED";

export interface Criterion {
  key: string;
  label: string;
}

export interface ProjectComponent {
  key: string;
  label: string;
  weight: number;
  percent: number | null;
  on20: number | null;
  detail: string;
}

export interface SatisfactionSummary {
  count: number;
  average: number | null;
  percent: number | null;
  satisfiedPct: number | null;
  byCriterion: Array<{ key: string; label: string; average: number | null }>;
}

export interface ProjectEvaluation {
  projectId: number;
  code: string;
  name: string;
  status: string;
  phase: Phase;
  startDate: string | null;
  endDate: string | null;
  score: number | null;
  verdict: string | null;
  rank: number;
  coverage: number;
  missing: string[];
  components: ProjectComponent[];
  satisfaction: { partners: SatisfactionSummary; beneficiaries: SatisfactionSummary };
  progress: { planned: number | null; actual: number | null; gap: number | null; trend: string };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface FeedbackItem {
  id: number;
  kind: FeedbackKind;
  partnerId: number | null;
  beneficiaryId: number | null;
  who: string;
  partnerName: string | null;
  ratings: Record<string, number> | null;
  score: number;
  comment: string | null;
  collectedAt: string;
}

export interface ProjectEvaluationDetail extends ProjectEvaluation {
  projectsCount: number;
  partners: Array<{ id: number; name: string; role: string | null }>;
  beneficiaries: Array<{ id: number; name: string }>;
  feedback: FeedbackItem[];
  criteria: Record<FeedbackKind, Criterion[]>;
}

export interface ProjectsOverview {
  weights: Record<string, number>;
  projects: ProjectEvaluation[];
  summary: {
    count: number;
    evaluated: number;
    average: number | null;
    final: number;
    satisfactionPartners: number;
    satisfactionBeneficiaries: number;
  };
}

export interface InternshipEvaluation {
  id: number;
  title: string;
  theme: string | null;
  status: string;
  phase: Phase;
  startDate: string;
  endDate: string | null;
  student: { id: number; firstName: string; lastName: string };
  level: Level;
  supervisor: { id: number; firstName: string; lastName: string } | null;
  project: { id: number; name: string; code: string } | null;
  score: number | null;
  verdict: string | null;
  rank: number;
  cohortSize: number;
  components: Record<"progress" | "completion" | "evaluation" | "reports" | "presence", number | null>;
  tasks: { total: number; completed: number };
  evaluations: number;
  durationMonths?: number | null;
  /** nombre de stages de cette personne (la ligne affichée est son stage le plus pertinent) */
  stagesCount?: number;
  stageIds?: number[];
}

/** Durée standard (mois) d'un stage selon le niveau ; toute autre durée = « Autre ». */
export const isOtherDuration = (level: Level, durationMonths?: number | null): boolean =>
  durationMonths !== null && durationMonths !== undefined && durationMonths !== (level === "M2" ? 6 : 2);

export interface InternshipsOverview {
  weights: Record<string, number>;
  internships: InternshipEvaluation[];
  summary: { count: number; stageRows?: number; evaluated: number; average: number | null; final: number };
}

export interface FeedbackPayload {
  kind: FeedbackKind;
  partnerId?: number;
  beneficiaryId?: number | null;
  respondent?: string;
  ratings: Record<string, number>;
  comment?: string;
}

export const fetchProjectEvaluations = async () => (await api.get(`${base}/projects`)).data?.data as ProjectsOverview;
export const fetchProjectEvaluation = async (id: number | string) =>
  (await api.get(`${base}/projects/${id}`)).data?.data as ProjectEvaluationDetail;
export const fetchInternshipEvaluations = async () => (await api.get(`${base}/internships`)).data?.data as InternshipsOverview;
export const addFeedback = (projectId: number, payload: FeedbackPayload) => api.post(`${base}/projects/${projectId}/feedback`, payload);
export const removeFeedback = (id: number) => api.delete(`${base}/feedback/${id}`);

export const WRITE_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR"];
export const PROJECT_READ_ROLES = ["ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR"];

export const fmt20 = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : `${value.toFixed(2).replace(/\.?0+$/, "")}/20`;

export const fmtPct = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : `${Math.round(value)}%`;

export const VERDICT_COLORS: Record<string, string> = {
  Excellent: "bg-green-100 text-green-700",
  "Très bien": "bg-green-100 text-green-700",
  Bien: "bg-blue-100 text-blue-700",
  Passable: "bg-amber-100 text-amber-800",
  "À améliorer": "bg-amber-100 text-amber-800",
};

export const PHASE_LABELS: Record<Phase, string> = {
  FINAL: "Évaluation finale",
  INTERIM: "Évaluation intermédiaire",
  NOT_STARTED: "Pas encore démarré",
  CANCELLED: "Annulé",
};

export const PHASE_COLORS: Record<Phase, string> = {
  FINAL: "bg-green-100 text-green-700",
  INTERIM: "bg-blue-100 text-blue-700",
  NOT_STARTED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-amber-100 text-amber-800",
};
