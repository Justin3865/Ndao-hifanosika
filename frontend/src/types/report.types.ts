// src/types/report.types.ts
export interface Report {
  id: string;
  title: string;
  type: "projet" | "beneficiaire" | "membre" | "global" | "bailleur";
  projectId?: string;
  project?: string;
  period: string;
  description?: string;
  generatedBy: string;
  generatedById: string;
  generatedDate: string;
  status: "termine" | "en_cours" | "planifie";
  format: "pdf" | "excel" | "word";
  size?: string;
  sections: ReportSection[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  pages?: number;
}

export interface ReportFilters {
  search?: string;
  type?: "projet" | "beneficiaire" | "membre" | "global" | "bailleur" | "all";
  status?: "termine" | "en_cours" | "planifie" | "all";
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  format?: "pdf" | "excel" | "word" | "all";
  page?: number;
  limit?: number;
}

export interface ReportCreateData {
  title: string;
  type: "projet" | "beneficiaire" | "membre" | "global" | "bailleur";
  projectId?: string;
  period: string;
  description?: string;
  format: "pdf" | "excel" | "word";
  sections: { title: string; content: string }[];
  includeCharts?: boolean;
  includeMetrics?: boolean;
}

export interface ReportUpdateData {
  title?: string;
  type?: "projet" | "beneficiaire" | "membre" | "global" | "bailleur";
  projectId?: string;
  period?: string;
  description?: string;
  status?: "termine" | "en_cours" | "planifie";
  format?: "pdf" | "excel" | "word";
  sections?: { title: string; content: string }[];
}

export interface ReportExportData {
  format: "pdf" | "excel" | "word" | "csv";
  includeCharts?: boolean;
  includeMetrics?: boolean;
  dateRange?: { from: string; to: string };
}

export interface BailleurReport {
  id: string;
  projectName: string;
  donor: string;
  period: string;
  generatedDate: string;
  status: "termine" | "en_cours" | "planifie";
  format: string;
  recipient: string;
  sent: boolean;
  sentDate?: string;
}

export interface ReportStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byFormat: Record<string, number>;
}

export const REPORT_STATUSES = {
  termine: { label: "Terminé", color: "green" },
  en_cours: { label: "En cours", color: "yellow" },
  planifie: { label: "Planifié", color: "blue" },
} as const;

export const REPORT_STATUS_COLORS = {
  termine: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  planifie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
} as const;

export const REPORT_TYPES = {
  projet: { label: "Projet", color: "blue" },
  beneficiaire: { label: "Bénéficiaires", color: "green" },
  membre: { label: "Membres", color: "purple" },
  global: { label: "Consolidé", color: "indigo" },
  bailleur: { label: "Bailleur", color: "orange" },
} as const;

export const REPORT_TYPE_COLORS = {
  projet: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  beneficiaire: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  membre: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  global: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  bailleur: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
} as const;

export const REPORT_FORMATS = {
  pdf: { label: "PDF", color: "red" },
  excel: { label: "Excel", color: "green" },
  word: { label: "Word", color: "blue" },
} as const;