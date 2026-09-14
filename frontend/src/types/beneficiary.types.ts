// src/types/beneficiary.types.ts
export interface Beneficiary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  age: number;
  gender: "F" | "M";
  program: string;
  programId: string;
  status: "actif" | "en_cours" | "termine" | "abandon";
  vulnerability: "enfant" | "femme" | "jeune" | "handicap" | "aucune";
  address?: string;
  education?: string;
  joinDate: string;
  progress: number;
  evaluations: number;
  skills: string[];
  objectives: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BeneficiaryFilters {
  search?: string;
  programId?: string;
  status?: "actif" | "en_cours" | "termine" | "abandon" | "all";
  vulnerability?: "enfant" | "femme" | "jeune" | "handicap" | "aucune" | "all";
  page?: number;
  limit?: number;
}

export interface BeneficiaryCreateData {
  name: string;
  email?: string;
  phone?: string;
  age: number;
  gender: "F" | "M";
  programId: string;
  vulnerability: "enfant" | "femme" | "jeune" | "handicap" | "aucune";
  address?: string;
  education?: string;
  joinDate: string;
  skills?: string[];
  objectives?: string[];
}

export interface BeneficiaryUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: "F" | "M";
  programId?: string;
  status?: "actif" | "en_cours" | "termine" | "abandon";
  vulnerability?: "enfant" | "femme" | "jeune" | "handicap" | "aucune";
  address?: string;
  education?: string;
  joinDate?: string;
  progress?: number;
  skills?: string[];
  objectives?: string[];
}

export interface BeneficiaryEvaluation {
  id: string;
  beneficiaryId: string;
  date: string;
  score: number;
  type: string;
  evaluator: string;
  evaluatorId: string;
  comments?: string;
  createdAt: string;
}

export interface BeneficiaryProgress {
  id: string;
  beneficiaryId: string;
  date: string;
  progress: number;
  notes?: string;
  createdAt: string;
}

export interface BeneficiaryStats {
  total: number;
  byStatus: Record<string, number>;
  byProgram: Record<string, number>;
  byVulnerability: Record<string, number>;
  averageProgress: number;
}

export const BENEFICIARY_STATUSES = {
  actif: { label: "Actif", color: "green" },
  en_cours: { label: "En cours", color: "yellow" },
  termine: { label: "Terminé", color: "blue" },
  abandon: { label: "Abandon", color: "red" },
} as const;

export const BENEFICIARY_STATUS_COLORS = {
  actif: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  termine: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  abandon: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
} as const;

export const VULNERABILITY_TYPES = {
  enfant: { label: "Enfant", color: "purple" },
  femme: { label: "Femme vulnérable", color: "pink" },
  jeune: { label: "Jeune", color: "blue" },
  handicap: { label: "Handicap", color: "orange" },
  aucune: { label: "Aucune", color: "gray" },
} as const;

export const VULNERABILITY_COLORS = {
  enfant: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  femme: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  jeune: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  handicap: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  aucune: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
} as const;

export const GENDER_LABELS = {
  F: "Féminin",
  M: "Masculin",
} as const;