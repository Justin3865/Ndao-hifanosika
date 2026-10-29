// src/services/monitoring.service.ts
// ------------------------------------------------------------
// Couche d'accès aux données S&E.
//
// Aujourd'hui : compose les données à partir des endpoints existants
// (/projects, /activities, /milestones, /beneficiaries, /evaluations).
// Demain : quand le backend exposera /monitoring/*, seules les
// fonctions de ce fichier changent — les pages restent identiques.
// ------------------------------------------------------------

import api from "@/lib/axios";
import type { InternshipMonitoring } from "@/lib/internshipMonitoring";
import type {
  HistoryPoint,
  ObjectiveNode,
  RawActivity,
  RawBeneficiary,
  RawEvaluation,
  RawMilestone,
  RawProject,
} from "@/lib/monitoring";

const list = <T,>(body: any, ...keys: string[]): T[] => {
  for (const k of keys) {
    if (Array.isArray(body?.[k])) return body[k] as T[];
  }
  return Array.isArray(body) ? (body as T[]) : [];
};

/** Tous les projets avec leurs activités, jalons, bénéficiaires, évaluations. */
export async function fetchAllProjectsForMonitoring(): Promise<RawProject[]> {
  const [projects, activities, milestones, beneficiaries, evaluations] =
    await Promise.all([
      api.get("/projects"),
      api.get("/activities").catch(() => ({ data: [] })),
      api.get("/milestones").catch(() => ({ data: [] })),
      api.get("/beneficiaries").catch(() => ({ data: [] })),
      api.get("/evaluations").catch(() => ({ data: [] })),
    ]);

  const acts = list<RawActivity>(activities.data, "activities", "data");
  const mss = list<RawMilestone>(milestones.data, "milestones", "data");
  const bens = list<RawBeneficiary>(beneficiaries.data, "data", "beneficiaries");
  const evs = list<RawEvaluation>(evaluations.data, "data", "evaluations");

  const by = <T extends { projectId: number }>(arr: T[], id: number) =>
    arr.filter((x) => Number(x.projectId) === id);

  return list<RawProject>(projects.data, "projects", "data").map((p) => ({
    ...p,
    activities: by(acts, p.id),
    milestones: by(mss, p.id),
    beneficiaries: by(bens, p.id),
    evaluations: by(evs, p.id),
  }));
}

/** Un projet complet (le backend l'inclut déjà avec ses relations). */
export async function fetchProjectForMonitoring(id: number | string): Promise<RawProject> {
  const res = await api.get(`/projects/${id}`);
  const project = res.data?.project ?? res.data?.data;
  if (!project) throw new Error("Projet introuvable.");
  return project as RawProject;
}

/**
 * Objectifs → Résultats → Indicateurs.
 * Les modèles Prisma existent déjà (ProjectObjective / ProjectResult /
 * ProjectIndicator) ; l'endpoint sera ajouté côté backend.
 * Retourne null tant qu'il n'est pas disponible.
 */
export async function fetchObjectives(
  projectId: number | string
): Promise<ObjectiveNode[] | null> {
  try {
    const res = await api.get(`/monitoring/projects/${projectId}/objectives`);
    const data = res.data?.objectives ?? res.data?.data;
    return Array.isArray(data) ? (data as ObjectiveNode[]) : [];
  } catch {
    return null;
  }
}

export async function fetchAllObjectives(
  projects: RawProject[]
): Promise<Record<number, ObjectiveNode[]>> {
  const out: Record<number, ObjectiveNode[]> = {};
  if (!projects.length) return out;

  // On sonde un premier projet : si l'endpoint n'existe pas encore,
  // on évite d'envoyer N requêtes inutiles.
  const first = await fetchObjectives(projects[0].id);
  if (first === null) return out;
  out[projects[0].id] = first;

  const rest = await Promise.all(
    projects.slice(1).map(async (p) => [p.id, await fetchObjectives(p.id)] as const)
  );
  rest.forEach(([id, tree]) => {
    if (tree) out[id] = tree;
  });
  return out;
}

/** S&E de tous les stagiaires (le backend filtre selon le rôle : un tuteur ne voit que les siens). */
export async function fetchInternshipsMonitoring(): Promise<InternshipMonitoring[]> {
  const res = await api.get("/monitoring/internships");
  const list = res.data?.data?.internships;
  return Array.isArray(list) ? (list as InternshipMonitoring[]) : [];
}

/** Détail S&E d'un stagiaire : tâches, évaluations, jours de présence. */
export async function fetchInternshipMonitoring(id: number | string): Promise<InternshipMonitoring> {
  const res = await api.get(`/monitoring/internships/${id}`);
  const data = res.data?.data;
  if (!data) throw new Error("Stage introuvable.");
  return data as InternshipMonitoring;
}

/** Historique d'avancement enregistré par le backend (un point par jour). */
export async function fetchSnapshots(projectId: number | string): Promise<HistoryPoint[] | null> {
  try {
    const res = await api.get(`/monitoring/projects/${projectId}/snapshots`);
    const rows = res.data?.snapshots;
    if (!Array.isArray(rows)) return null;
    return rows.map((r: any) => ({
      date: String(r.recordedAt).slice(0, 10),
      planned: typeof r.plannedProgress === "number" ? r.plannedProgress : null,
      actual: typeof r.actualProgress === "number" ? r.actualProgress : null,
    }));
  } catch {
    return null;
  }
}

export interface AiAnalysis {
  engine: string;
  summary: string;
  risk: { score: number; level: "FAIBLE" | "MOYEN" | "ELEVE"; factors: { factor: string; points: number }[] };
  forecast: {
    method: string;
    projectedFinalProgress: number | null;
    projectedCompletionDate: string | null;
    delayDays: number | null;
    confidence: string;
    note?: string;
  } | null;
  recommendations: string[];
  anomalies: { code?: string; level: string; category: string; message: string }[];
}

/** Analyse IA (ai-service via le backend). null si indisponible. */
export async function fetchAnalysis(projectId: number | string): Promise<AiAnalysis | null> {
  try {
    const res = await api.get(`/monitoring/projects/${projectId}/analysis`);
    return (res.data?.data as AiAnalysis) ?? null;
  } catch {
    return null;
  }
}

export function errorMessage(e: any): string {
  if (e?.response?.status === 403)
    return "Vous n'avez pas les droits pour consulter les données de suivi & évaluation.";
  return e?.response?.data?.message ?? e?.message ?? "Erreur de chargement.";
}
