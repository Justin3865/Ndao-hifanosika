// src/types/milestone.types.ts
export interface Milestone {
  id: string;
  title: string;
  description: string;
  projectId: string;
  project: string;
  targetDate: string;
  actualDate?: string;
  status: "planifie" | "en_cours" | "termine" | "retard";
  progress: number;
  objectives: string[];
  deliverables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneFilters {
  search?: string;
  projectId?: string;
  status?: "planifie" | "en_cours" | "termine" | "retard" | "all";
  page?: number;
  limit?: number;
}

export interface MilestoneCreateData {
  title: string;
  description: string;
  projectId: string;
  targetDate: string;
  objectives?: string[];
  deliverables?: string[];
}

export interface MilestoneUpdateData {
  title?: string;
  description?: string;
  projectId?: string;
  targetDate?: string;
  actualDate?: string;
  status?: "planifie" | "en_cours" | "termine" | "retard";
  progress?: number;
  objectives?: string[];
  deliverables?: string[];
}

export interface MilestoneStats {
  total: number;
  byStatus: Record<string, number>;
  byProject: Record<string, number>;
  completed: number;
  overdue: number;
}

export const MILESTONE_STATUSES = {
  planifie: { label: "Planifié", color: "blue" },
  en_cours: { label: "En cours", color: "yellow" },
  termine: { label: "Terminé", color: "green" },
  retard: { label: "En retard", color: "red" },
} as const;

export const MILESTONE_STATUS_COLORS = {
  planifie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  termine: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  retard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
} as const;