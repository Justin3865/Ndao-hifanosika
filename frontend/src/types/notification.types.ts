// src/types/notification.types.ts
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "reminder";
  category: "evaluation" | "project" | "report" | "member" | "beneficiary" | "ai" | "system";
  read: boolean;
  userId: string;
  actionUrl?: string;
  actionLabel?: string;
  sender?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  read?: boolean;
  type?: "info" | "success" | "warning" | "error" | "reminder" | "all";
  category?: "evaluation" | "project" | "report" | "member" | "beneficiary" | "ai" | "system" | "all";
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface NotificationCreateData {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "reminder";
  category: "evaluation" | "project" | "report" | "member" | "beneficiary" | "ai" | "system";
  userId: string;
  actionUrl?: string;
  actionLabel?: string;
  sender?: string;
}

export interface NotificationUpdateData {
  read?: boolean;
  title?: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

export const NOTIFICATION_TYPES = {
  info: { label: "Information", color: "blue" },
  success: { label: "Succès", color: "green" },
  warning: { label: "Avertissement", color: "yellow" },
  error: { label: "Erreur", color: "red" },
  reminder: { label: "Rappel", color: "purple" },
} as const;

export const NOTIFICATION_TYPE_COLORS = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  reminder: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
} as const;

export const NOTIFICATION_CATEGORIES = {
  evaluation: { label: "Évaluation", color: "purple" },
  project: { label: "Projet", color: "blue" },
  report: { label: "Rapport", color: "indigo" },
  member: { label: "Membre", color: "pink" },
  beneficiary: { label: "Bénéficiaire", color: "green" },
  ai: { label: "IA", color: "orange" },
  system: { label: "Système", color: "gray" },
} as const;

export const NOTIFICATION_CATEGORY_COLORS = {
  evaluation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  project: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  report: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  member: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  beneficiary: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  ai: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  system: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
} as const;