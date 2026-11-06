// src/lib/gaps.ts
// Types et utilitaires des pages ajoutées pour couvrir le cahier des charges :
// présences (§5.4), objectifs individuels (§5.3), documents de stage (§5.3),
// consentements (§10), conservation/purge (§10), export JSON (§6).

export const ATTENDANCE_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR"]; // miroir de /api/attendance (lecture)
export const ATTENDANCE_EDIT_ROLES = ["ADMIN", "COORDINATOR"]; // miroir de PUT /api/attendance/activity/:id
export const OBJECTIVE_MANAGERS = ["ADMIN", "RH", "DIRECTION"]; // miroir de GET /api/objectives?userId=
export const OBJECTIVE_EDIT_ROLES = ["ADMIN", "RH"]; // miroir de POST/PUT/DELETE /api/objectives
export const CONSENT_EDIT_ROLES = ["ADMIN", "COORDINATOR"]; // miroir de PUT /api/consents/beneficiary/:id
export const DOC_MANAGERS = ["ADMIN", "RH"]; // peuvent tout déposer / supprimer

export interface AttendanceRow {
  id: number;
  firstName: string;
  lastName: string;
  recorded: boolean;
  present: boolean | null;
  note: string | null;
  /** Horodatage d'enregistrement (ISO) si fourni par l'API */
  recordedAt?: string | null;
  recordedBy?: string | null;
}

export interface AttendanceStat {
  id: number;
  firstName: string;
  lastName: string;
  projectId: number;
  total: number;
  present: number;
  absent: number;
  rate: number | null;
  level: "UNKNOWN" | "LOW" | "MEDIUM" | "GOOD";
}

export const LEVEL_LABEL: Record<AttendanceStat["level"], string> = {
  UNKNOWN: "Trop peu de séances",
  LOW: "Faible",
  MEDIUM: "Moyenne",
  GOOD: "Bonne",
};

export const LEVEL_STYLE: Record<AttendanceStat["level"], string> = {
  UNKNOWN: "bg-gray-100 text-gray-600",
  LOW: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  GOOD: "bg-green-100 text-green-700",
};

export type ObjectiveStatus = "PLANNED" | "IN_PROGRESS" | "ACHIEVED" | "MISSED" | "CANCELLED";

export const OBJECTIVE_LABEL: Record<ObjectiveStatus, string> = {
  PLANNED: "Planifié",
  IN_PROGRESS: "En cours",
  ACHIEVED: "Atteint",
  MISSED: "Non atteint",
  CANCELLED: "Annulé",
};

export interface ObjectiveRow {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  kpi: string | null;
  unit: string | null;
  targetValue: number | null;
  currentValue: number | null;
  dueDate: string | null;
  status: ObjectiveStatus;
  progress: number | null;
  overdue: boolean;
  memberName?: string;
}

export type DocKind = "CONVENTION" | "REPORT" | "MEMOIRE" | "OTHER";

export const DOC_KIND_LABEL: Record<DocKind, string> = {
  CONVENTION: "Convention de stage",
  REPORT: "Rapport de stage",
  MEMOIRE: "Mémoire",
  OTHER: "Autre document",
};

export interface InternshipDocRow {
  id: number;
  internshipId: number;
  kind: DocKind;
  name: string;
  mime: string;
  size: number;
  note: string | null;
  uploadedById: number | null;
  createdAt: string;
  /** Champs d'affichage fournis par GET /internship-documents (liste globale) */
  ownerName?: string;
  internshipTitle?: string;
  theme?: string;
  level?: string;
  uploadedByName?: string;
}

export type ConsentState = "NOT_REQUIRED" | "MISSING" | "GRANTED" | "REVOKED";

export const CONSENT_LABEL: Record<ConsentState, string> = {
  NOT_REQUIRED: "Non requis",
  MISSING: "Manquant",
  GRANTED: "Accordé",
  REVOKED: "Retiré",
};

export const CONSENT_STYLE: Record<ConsentState, string> = {
  NOT_REQUIRED: "bg-gray-100 text-gray-600",
  MISSING: "bg-red-100 text-red-700",
  GRANTED: "bg-green-100 text-green-700",
  REVOKED: "bg-amber-100 text-amber-800",
};

export interface ConsentRow {
  id: number;
  firstName: string;
  lastName: string;
  age: number | null;
  projectId: number;
  project: { name: string } | null;
  minor: boolean;
  state: ConsentState;
  guardianName: string | null;
  guardianRelation: string | null;
  consentAt: string | null;
  revokedAt: string | null;
}

export interface RetentionPreview {
  policy: { auditMonths: number; notificationMonths: number; reminderLogMonths: number };
  rows: Array<{ key: string; label: string; count: number }>;
  total: number;
}

export const EXPORT_LABEL: Record<string, string> = {
  projects: "Projets",
  beneficiaries: "Bénéficiaires",
  activities: "Activités",
  evaluations: "Évaluations",
  internships: "Stages",
};

/** Jeux de données proposés par rôle (miroir de canExport dans backend/src/utils/gapRules.ts). */
export function exportableDatasets(role: string): string[] {
  const r = role.toUpperCase();
  if (r === "ADMIN" || r === "DIRECTION") return ["projects", "beneficiaries", "activities", "evaluations", "internships"];
  if (r === "COORDINATOR") return ["projects", "beneficiaries", "activities", "evaluations"];
  if (r === "DAF") return ["projects", "activities"];
  if (r === "RH") return ["evaluations", "internships"];
  if (r === "COMMUNICATION") return ["projects", "beneficiaries"];
  return [];
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? "").replace(/^data:[^;]*;base64,/, ""));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function toDateInput(value?: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}
