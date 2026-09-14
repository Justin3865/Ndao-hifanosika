// src/types/user.types.ts
import { UserRole } from "./auth.types";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: string;
  departmentId: string;
  position?: string;
  status: "active" | "inactive" | "pending";
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters {
  search?: string;
  role?: UserRole | "all";
  status?: "active" | "inactive" | "pending" | "all";
  department?: string;
  page?: number;
  limit?: number;
}

export interface UserCreateData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  department: string;
  position?: string;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  department?: string;
  position?: string;
  status?: "active" | "inactive" | "pending";
}

export interface UserStats {
  total: number;
  byRole: Record<UserRole, number>;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
}

export const USER_STATUSES = {
  active: { label: "Actif", color: "green" },
  inactive: { label: "Inactif", color: "gray" },
  pending: { label: "En attente", color: "yellow" },
} as const;

export const USER_STATUS_COLORS = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
} as const;