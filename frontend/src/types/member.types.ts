// src/types/member.types.ts
export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  departmentId: string;
  status: "actif" | "inactif" | "en_conge";
  type: "salarie" | "stagiaire" | "benevole";
  joinDate: string;
  evaluations: number;
  skills: string[];
  objectives: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemberFilters {
  search?: string;
  departmentId?: string;
  status?: "actif" | "inactif" | "en_conge" | "all";
  type?: "salarie" | "stagiaire" | "benevole" | "all";
  page?: number;
  limit?: number;
}

export interface MemberCreateData {
  name: string;
  email: string;
  phone?: string;
  position: string;
  departmentId: string;
  type: "salarie" | "stagiaire" | "benevole";
  joinDate: string;
  skills?: string[];
  objectives?: string[];
}

export interface MemberUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  departmentId?: string;
  status?: "actif" | "inactif" | "en_conge";
  type?: "salarie" | "stagiaire" | "benevole";
  joinDate?: string;
  skills?: string[];
  objectives?: string[];
}

export interface MemberEvaluation {
  id: string;
  memberId: string;
  date: string;
  score: number;
  type: string;
  evaluator: string;
  evaluatorId: string;
  comments?: string;
  createdAt: string;
}

export interface MemberStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byDepartment: Record<string, number>;
  averageScore: number;
}

export const MEMBER_STATUSES = {
  actif: { label: "Actif", color: "green" },
  inactif: { label: "Inactif", color: "gray" },
  en_conge: { label: "En congé", color: "yellow" },
} as const;

export const MEMBER_STATUS_COLORS = {
  actif: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  inactif: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  en_conge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
} as const;

export const MEMBER_TYPES = {
  salarie: { label: "Salarié", color: "blue" },
  stagiaire: { label: "Stagiaire", color: "purple" },
  benevole: { label: "Bénévole", color: "teal" },
} as const;

export const MEMBER_TYPE_COLORS = {
  salarie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  stagiaire: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  benevole: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
} as const;