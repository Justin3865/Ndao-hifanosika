// src/types/internship.types.ts
export interface Internship {
  id: string;
  studentName: string;
  studentId: string;
  studentEmail: string;
  studentPhone?: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  level: "L3" | "M2";
  establishment: string;
  establishmentAddress?: string;
  subject: string;
  department: string;
  departmentId: string;
  startDate: string;
  endDate: string;
  status: "en_cours" | "termine" | "annule";
  progress: number;
  finalGrade?: number;
  objectives: string[];
  deliverables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InternshipFilters {
  search?: string;
  departmentId?: string;
  status?: "en_cours" | "termine" | "annule" | "all";
  level?: "L3" | "M2" | "all";
  page?: number;
  limit?: number;
}

export interface InternshipCreateData {
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  tutorId: string;
  level: "L3" | "M2";
  establishment: string;
  establishmentAddress?: string;
  subject: string;
  departmentId: string;
  startDate: string;
  endDate: string;
  objectives?: string[];
  deliverables?: string[];
}

export interface InternshipUpdateData {
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  tutorId?: string;
  level?: "L3" | "M2";
  establishment?: string;
  establishmentAddress?: string;
  subject?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  status?: "en_cours" | "termine" | "annule";
  progress?: number;
  objectives?: string[];
  deliverables?: string[];
}

export interface InternshipEvaluationCriteria {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  weight: number;
}

export interface InternshipEvaluation {
  id: string;
  internshipId: string;
  criteria: InternshipEvaluationCriteria[];
  totalScore: number;
  comments: string;
  recommendations: string;
  evaluatorId: string;
  evaluatorName: string;
  date: string;
  createdAt: string;
}

export interface InternshipEvaluationCreateData {
  criteria: { id: string; score: number }[];
  comments: string;
  recommendations: string;
}

export interface InternshipCertificate {
  id: string;
  internshipId: string;
  studentName: string;
  level: string;
  establishment: string;
  subject: string;
  startDate: string;
  endDate: string;
  tutorName: string;
  tutorTitle: string;
  department: string;
  finalGrade: number;
  comments: string;
  generatedAt: string;
  certificateNumber: string;
}

export interface InternshipStats {
  total: number;
  byStatus: Record<string, number>;
  byLevel: Record<string, number>;
  byDepartment: Record<string, number>;
  averageGrade: number;
}

export const INTERNSHIP_STATUSES = {
  en_cours: { label: "En cours", color: "yellow" },
  termine: { label: "Terminé", color: "green" },
  annule: { label: "Annulé", color: "red" },
} as const;

export const INTERNSHIP_STATUS_COLORS = {
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  termine: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  annule: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
} as const;

export const INTERNSHIP_LEVELS = {
  L3: { label: "Licence 3", color: "blue" },
  M2: { label: "Master 2", color: "purple" },
} as const;

export const INTERNSHIP_LEVEL_COLORS = {
  L3: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  M2: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
} as const;