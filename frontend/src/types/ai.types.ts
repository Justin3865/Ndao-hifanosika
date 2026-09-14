// src/types/ai.types.ts
export interface DropoutRiskRequest {
  beneficiaryId: string;
  data: {
    presence: number[];
    progression: number[];
    evaluations: number[];
    socioEconomic?: Record<string, any>;
  };
}

export interface DropoutRiskResponse {
  score: number;
  level: "faible" | "modere" | "eleve" | "critique";
  factors: string[];
  recommendations: string[];
  confidence: number;
}

export interface PerformanceScoreRequest {
  memberId: string;
  data: {
    evaluations: { date: string; score: number; weight: number }[];
    skills: string[];
    objectives: string[];
  };
}

export interface PerformanceScoreResponse {
  score: number;
  trend: "up" | "down" | "stable";
  trendValue: number;
  strengths: string[];
  improvements: string[];
  predictedScore: number;
  confidence: number;
}

export interface SummaryRequest {
  projectId: string;
  period: { from: string; to: string };
  data: {
    activities: any[];
    beneficiaries: any[];
    milestones: any[];
    evaluations: any[];
  };
}

export interface SummaryResponse {
  title: string;
  content: string;
  keyPoints: string[];
  wordCount: number;
  metrics: { label: string; value: string; trend: "up" | "down" | "stable" }[];
}

export interface AnomalyDetectionRequest {
  entityType: "beneficiary" | "member" | "project" | "activity" | "evaluation";
  data: any[];
}

export interface AnomalyDetectionResponse {
  anomalies: {
    id: string;
    type: "doublon" | "incoherent" | "manquant" | "suspect";
    description: string;
    entity: string;
    severity: "critique" | "eleve" | "modere" | "faible";
    suggestion: string;
  }[];
}

export interface RecommendationRequest {
  type: "dropout" | "performance" | "anomaly" | "summary";
  context: any;
}

export interface RecommendationResponse {
  id: string;
  title: string;
  description: string;
  type: "dropout" | "performance" | "anomaly" | "summary";
  priority: "haute" | "moyenne" | "basse";
  confidence: number;
  actions: string[];
  targetName?: string;
  targetType?: "beneficiary" | "member" | "project";
  createdAt: string;
}

export interface ModelStatus {
  name: string;
  version: string;
  status: "active" | "training" | "inactive";
  accuracy: number;
  lastTraining: string;
}

export const RISK_LEVELS = {
  faible: { label: "Faible", color: "green" },
  modere: { label: "Modéré", color: "yellow" },
  eleve: { label: "Élevé", color: "orange" },
  critique: { label: "Critique", color: "red" },
} as const;

export const RISK_LEVEL_COLORS = {
  faible: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  modere: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  eleve: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  critique: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
} as const;

export const ANOMALY_TYPES = {
  doublon: { label: "Doublon", color: "orange" },
  incoherent: { label: "Incohérence", color: "yellow" },
  manquant: { label: "Donnée manquante", color: "red" },
  suspect: { label: "Donnée suspecte", color: "purple" },
} as const;

export const ANOMALY_TYPE_COLORS = {
  doublon: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  incoherent: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  manquant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  suspect: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
} as const;

export const RECOMMENDATION_PRIORITIES = {
  haute: { label: "Haute priorité", color: "red" },
  moyenne: { label: "Priorité moyenne", color: "yellow" },
  basse: { label: "Priorité basse", color: "green" },
} as const;

export const RECOMMENDATION_PRIORITY_COLORS = {
  haute: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  moyenne: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  basse: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
} as const;