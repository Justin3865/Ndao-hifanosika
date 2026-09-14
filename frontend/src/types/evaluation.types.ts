// src/types/evaluation.types.ts
export interface Evaluation {
  id: string;
  title: string;
  type: "membre" | "stagiaire" | "beneficiaire";
  targetId: string;
  targetName: string;
  targetType: string;
  evaluatorId: string;
  evaluatorName: string;
  gridId: string;
  gridName: string;
  period: string;
  status: "planifie" | "en_cours" | "termine" | "annule";
  score?: number;
  dueDate: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationFilters {
  search?: string;
  type?: "membre" | "stagiaire" | "beneficiaire" | "all";
  status?: "planifie" | "en_cours" | "termine" | "annule" | "all";
  targetId?: string;
  evaluatorId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface EvaluationCreateData {
  title: string;
  type: "membre" | "stagiaire" | "beneficiaire";
  targetId: string;
  evaluatorId: string;
  gridId: string;
  period: string;
  dueDate: string;
}

export interface EvaluationUpdateData {
  title?: string;
  type?: "membre" | "stagiaire" | "beneficiaire";
  targetId?: string;
  evaluatorId?: string;
  gridId?: string;
  period?: string;
  status?: "planifie" | "en_cours" | "termine" | "annule";
  dueDate?: string;
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
  description?: string;
}

export interface EvaluationScore {
  criteriaId: string;
  score: number;
  comment?: string;
}

export interface EvaluationGrid {
  id: string;
  name: string;
  description?: string;
  type: "membre" | "stagiaire" | "beneficiaire";
  criteria: EvaluationCriteria[];
  status: "actif" | "inactif";
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationGridCreateData {
  name: string;
  description?: string;
  type: "membre" | "stagiaire" | "beneficiaire";
  criteria: Omit<EvaluationCriteria, "id">[];
}

export interface EvaluationCampaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
  status: "planifie" | "en_cours" | "termine" | "annule";
  totalEvaluations: number;
  completedEvaluations: number;
  createdAt: string;
}

export interface EvaluationCampaignCreateData {
  name: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
  targetIds?: string[];
  evaluatorIds?: string[];
  gridId: string;
}

export interface EvaluationStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  averageScore: number;
  completionRate: number;
}

export const EVALUATION_STATUSES = {
  planifie: { label: "Planifié", color: "blue" },
  en_cours: { label: "En cours", color: "yellow" },
  termine: { label: "Terminé", color: "green" },
  annule: { label: "Annulé", color: "red" },
} as const;

export const EVALUATION_STATUS_COLORS = {
  planifie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  termine: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  annule: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
} as const;

export const EVALUATION_TYPES = {
  membre: { label: "Membre", color: "blue" },
  stagiaire: { label: "Stagiaire", color: "purple" },
  beneficiaire: { label: "Bénéficiaire", color: "green" },
} as const;

export const EVALUATION_TYPE_COLORS = {
  membre: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  stagiaire: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  beneficiaire: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
} as const;