// src/lib/integration.ts
// Pont « Stagiaires ↔ Projets ↔ Suivi & Évaluation ↔ Évaluation finale ↔ Analyses IA » (API /integration).

import api from "@/lib/axios";

export interface IntegrationTotals {
  projects: number;
  projectsEvaluated: number;
  avgProjectScore: number | null;
  lateProjects: number;
  avgPlanned: number | null;
  avgActual: number | null;
  /** nombre de STAGIAIRES (une ligne par personne, comme la liste « Stages ») */
  internPersons: number;
  /** nombre total de stages enregistrés (un stagiaire peut en avoir plusieurs) */
  internRows: number;
  internsEvaluated: number;
  avgInternScore: number | null;
  weakInterns: number;
  internsAtRisk: number;
  internsDone: number;
}

export interface IntegrationAnomaly {
  key: string;
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  link: string;
  entityKind: string;
  entityId: number | null;
  projectId: number | null;
}

export interface IntegrationFlowStep {
  from: string;
  to: string;
  via: string;
  route: string;
}

export interface IntegrationOverview {
  generatedAt: string;
  totals: IntegrationTotals;
  flow: IntegrationFlowStep[];
  anomalies: { total: number; high: number; top: IntegrationAnomaly[] };
  internships: number;
}

export interface IntegrationDashboardBlock {
  totals: {
    avgFinalProject: number | null;
    avgFinalInternship: number | null;
    projectsEvaluated: number;
    internPersons: number;
    internRows: number;
    internsEvaluated: number;
    internsDone: number;
    lateProjects: number;
    weakInterns: number;
    internsAtRisk: number;
    avgPlanned: number | null;
    avgActual: number | null;
  };
  finalByProject: Array<{ key: string; label: string; name?: string; value: number; level: string }>;
  internScores: Array<{ key: string; label: string; value: number; level: string }>;
  internScoreHistogram: Array<{ label: string; value: number }>;
  internRisk: Array<{ key: string; label: string; value: number }>;
  progressByProject: Array<{ key: string; label: string; name?: string; planned: number | null; actual: number | null }>;
}

export const fetchIntegrationOverview = async () => (await api.get("/integration/overview")).data?.data as IntegrationOverview;
export const refreshIntegration = () => api.post("/integration/refresh");
