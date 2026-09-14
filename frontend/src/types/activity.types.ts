// src/types/activity.types.ts
export interface Activity {
  id: string;
  title: string;
  description: string;
  projectId: string;
  project: string;
  date: string;
  time: string;
  endTime: string;
  location?: string;
  type: "formation" | "atelier" | "reunion" | "suivi" | "autre";
  status: "planifie" | "en_cours" | "termine" | "annule";
  participants: number;
  organizer: string;
  objectives: string[];
  report?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityFilters {
  search?: string;
  projectId?: string;
  status?: "planifie" | "en_cours" | "termine" | "annule" | "all";
  type?: "formation" | "atelier" | "reunion" | "suivi" | "autre" | "all";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ActivityCreateData {
  title: string;
  description: string;
  projectId: string;
  date: string;
  time: string;
  endTime: string;
  location?: string;
  type: string;
  participants: number;
  organizer: string;
  objectives?: string[];
}

export interface ActivityUpdateData {
  title?: string;
  description?: string;
  projectId?: string;
  date?: string;
  time?: string;
  endTime?: string;
  location?: string;
  type?: string;
  status?: "planifie" | "en_cours" | "termine" | "annule";
  participants?: number;
  organizer?: string;
  objectives?: string[];
  report?: string;
}

export interface ActivityStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byProject: Record<string, number>;
}

export const ACTIVITY_TYPES = {
  formation: { label: "Formation", color: "purple" },
  atelier: { label: "Atelier", color: "orange" },
  reunion: { label: "Réunion", color: "teal" },
  suivi: { label: "Suivi", color: "pink" },
  autre: { label: "Autre", color: "gray" },
} as const;

export const ACTIVITY_TYPE_COLORS = {
  formation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  atelier: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  reunion: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  suivi: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  autre: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
} as const;

export const ACTIVITY_STATUSES = {
  planifie: { label: "Planifié", color: "blue" },
  en_cours: { label: "En cours", color: "yellow" },
  termine: { label: "Terminé", color: "green" },
  annule: { label: "Annulé", color: "red" },
} as const;

export const ACTIVITY_STATUS_COLORS = {
  planifie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  termine: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  annule: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
} as const;