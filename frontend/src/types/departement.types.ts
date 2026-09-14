// src/types/departement.types.ts
export interface Departement {
  id: string;
  name: string;
  description: string;
  chef: string;
  chefEmail: string;
  memberCount: number;
  status: "active" | "inactive";
  projects: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DepartementFilters {
  search?: string;
  status?: "active" | "inactive" | "all";
  page?: number;
  limit?: number;
}

export interface DepartementCreateData {
  name: string;
  description: string;
  chef: string;
  chefEmail: string;
  projects?: string[];
}

export interface DepartementUpdateData {
  name?: string;
  description?: string;
  chef?: string;
  chefEmail?: string;
  status?: "active" | "inactive";
  projects?: string[];
}

export interface DepartementMember {
  id: string;
  name: string;
  email: string;
  position: string;
  role: string;
  joinDate: string;
}

export interface DepartementStats {
  total: number;
  active: number;
  inactive: number;
  membersByDepartement: Record<string, number>;
}

export const DEPARTEMENT_STATUSES = {
  active: { label: "Actif", color: "green" },
  inactive: { label: "Inactif", color: "gray" },
} as const;

export const DEPARTEMENT_STATUS_COLORS = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
} as const;