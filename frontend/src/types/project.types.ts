// src/types/project.types.ts
export interface Project {
  id: string;
  name: string;
  description: string;
  donor: string;
  startDate: string;
  endDate: string;
  status: "planifie" | "en_cours" | "cloture";
  progress: number;
  budget: number;
  members: number;
  beneficiaries: number;
  objectives: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFilters {
  search?: string;
  status?: "planifie" | "en_cours" | "cloture" | "all";
  donor?: string;
  page?: number;
  limit?: number;
}

export interface ProjectCreateData {
  name: string;
  description: string;
  donor: string;
  startDate: string;
  endDate: string;
  budget: number;
  objectives?: string[];
}

export interface ProjectUpdateData {
  name?: string;
  description?: string;
  donor?: string;
  startDate?: string;
  endDate?: string;
  status?: "planifie" | "en_cours" | "cloture";
  budget?: number;
  objectives?: string[];
}

export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
  byDonor: Record<string, number>;
  totalBudget: number;
  averageProgress: number;
}

export const PROJECT_STATUSES = {
  planifie: { label: "Planifié", color: "blue" },
  en_cours: { label: "En cours", color: "yellow" },
  cloture: { label: "Clôturé", color: "green" },
} as const;

export const PROJECT_STATUS_COLORS = {
  planifie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  cloture: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
} as const;