// src/utils/gapRules.ts
// Règles pures (sans base de données) des modules ajoutés pour couvrir le cahier des charges :
// présence aux séances (§5.4), objectifs individuels (§5.3), documents de stage (§5.3),
// consentement des tuteurs légaux (§10), conservation/purge (§10), export JSON (§6).
// Séparées des contrôleurs pour être testables sans Prisma.

export const ADULT_AGE = 18;
const DAY = 24 * 60 * 60 * 1000;

/* ───────────── Présence aux séances ───────────── */

export interface AttendanceRow {
  present: boolean;
}

export function attendanceRate(rows: AttendanceRow[]): { total: number; present: number; absent: number; rate: number | null } {
  const total = rows.length;
  const present = rows.filter((r) => r.present).length;
  return { total, present, absent: total - present, rate: total === 0 ? null : Math.round((present / total) * 1000) / 10 };
}

/** Niveau d'alerte de présence : sert au coordinateur et, plus tard, de variable au modèle d'abandon. */
export function attendanceLevel(rate: number | null, total: number, minSessions = 3): "UNKNOWN" | "LOW" | "MEDIUM" | "GOOD" {
  if (rate === null || total < minSessions) return "UNKNOWN";
  if (rate < 50) return "LOW";
  if (rate < 75) return "MEDIUM";
  return "GOOD";
}

/* ───────────── Objectifs individuels ───────────── */

export const OBJECTIVE_STATUSES = ["PLANNED", "IN_PROGRESS", "ACHIEVED", "MISSED", "CANCELLED"] as const;
export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];

export function objectiveProgress(current: number | null | undefined, target: number | null | undefined): number | null {
  if (typeof target !== "number" || !Number.isFinite(target) || target <= 0) return null;
  const c = typeof current === "number" && Number.isFinite(current) ? current : 0;
  return Math.max(0, Math.min(100, Math.round((c / target) * 100)));
}

export function isObjectiveOverdue(
  o: { dueDate?: Date | string | null; status: string },
  now: Date = new Date(),
): boolean {
  if (!o.dueDate) return false;
  if (o.status === "ACHIEVED" || o.status === "CANCELLED" || o.status === "MISSED") return false;
  return new Date(o.dueDate).getTime() < now.getTime();
}

/** Statut proposé quand la valeur atteinte change (jamais écrasé si déjà clos ou annulé). */
export function nextObjectiveStatus(
  status: string,
  current: number | null | undefined,
  target: number | null | undefined,
): ObjectiveStatus {
  if (status === "CANCELLED" || status === "MISSED") return status;
  const pct = objectiveProgress(current, target);
  if (pct !== null && pct >= 100) return "ACHIEVED";
  if ((typeof current === "number" && current > 0) || status === "IN_PROGRESS") return "IN_PROGRESS";
  return (OBJECTIVE_STATUSES as readonly string[]).includes(status) ? (status as ObjectiveStatus) : "PLANNED";
}

/* ───────────── Documents de stage ───────────── */

export const INTERNSHIP_DOC_KINDS = ["CONVENTION", "REPORT", "MEMOIRE", "OTHER"] as const;
export type InternshipDocKind = (typeof INTERNSHIP_DOC_KINDS)[number];
export const MAX_DOC_BYTES = 8 * 1024 * 1024; // < limite JSON de 12 Mo (base64 = +33 %)
export const ALLOWED_DOC_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

export function cleanBase64(raw: unknown): string {
  return String(raw ?? "").replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
}

export function safeFileName(name: unknown): string {
  const base = String(name ?? "document").split(/[\\/]/).pop() ?? "document";
  const cleaned = base.replace(/[^\w.\- À-ɏ]/g, "_").trim().slice(0, 120);
  return cleaned || "document";
}

/** Qui peut déposer quoi : le stagiaire dépose rapport/mémoire ; RH/ADMIN la convention et le reste. */
export function canUploadDoc(
  role: string,
  userId: number,
  internship: { studentId: number; supervisorId: number | null },
  kind: string,
): boolean {
  const r = role.toUpperCase();
  if (r === "ADMIN" || r === "RH") return true;
  if (userId === internship.studentId) return kind === "REPORT" || kind === "MEMOIRE" || kind === "CONVENTION" || kind === "OTHER";
  if (userId === internship.supervisorId) return kind === "OTHER" || kind === "REPORT";
  return false;
}

export function canReadDocs(
  role: string,
  userId: number,
  internship: { studentId: number; supervisorId: number | null },
): boolean {
  const r = role.toUpperCase();
  if (["ADMIN", "DIRECTION", "RH", "DSI"].includes(r)) return true;
  return userId === internship.studentId || userId === internship.supervisorId;
}

/* ───────────── Consentement des tuteurs légaux ───────────── */

export function isMinor(p: { age?: number | null; birthDate?: Date | string | null }, now: Date = new Date()): boolean {
  if (p.birthDate) {
    const b = new Date(p.birthDate);
    if (!Number.isNaN(b.getTime())) {
      let age = now.getFullYear() - b.getFullYear();
      const m = now.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
      return age < ADULT_AGE;
    }
  }
  return typeof p.age === "number" && p.age < ADULT_AGE;
}

export type ConsentState = "NOT_REQUIRED" | "MISSING" | "GRANTED" | "REVOKED";

export function consentState(
  person: { age?: number | null; birthDate?: Date | string | null },
  consent: { consentAt?: Date | string | null; revokedAt?: Date | string | null } | null | undefined,
  now: Date = new Date(),
): ConsentState {
  if (consent?.revokedAt) return "REVOKED";
  if (consent?.consentAt) return "GRANTED";
  return isMinor(person, now) ? "MISSING" : "NOT_REQUIRED";
}

/* ───────────── Conservation / purge ───────────── */

export interface RetentionPolicy {
  auditMonths: number;
  notificationMonths: number;
  reminderLogMonths: number;
}

type Env = Record<string, string | undefined>;

function months(raw: string | undefined, fallback: number, min: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : fallback;
}

/**
 * Durées par défaut : audit 24 mois (minimum 12 imposé : on ne purge jamais la traçabilité récente),
 * notifications lues/archivées 12 mois, journal de rappels 6 mois.
 * Surchargeables par RETENTION_AUDIT_MONTHS / RETENTION_NOTIFICATION_MONTHS / RETENTION_REMINDER_MONTHS.
 */
export function retentionPolicy(env: Env = process.env): RetentionPolicy {
  return {
    auditMonths: months(env.RETENTION_AUDIT_MONTHS, 24, 12),
    notificationMonths: months(env.RETENTION_NOTIFICATION_MONTHS, 12, 1),
    reminderLogMonths: months(env.RETENTION_REMINDER_MONTHS, 6, 1),
  };
}

export function monthsAgo(n: number, now: Date = new Date()): Date {
  const d = new Date(now.getTime());
  d.setMonth(d.getMonth() - n);
  return d;
}

export function retentionCutoffs(policy: RetentionPolicy, now: Date = new Date()) {
  return {
    audit: monthsAgo(policy.auditMonths, now),
    notification: monthsAgo(policy.notificationMonths, now),
    reminderLog: monthsAgo(policy.reminderLogMonths, now),
    tokens: new Date(now.getTime() - DAY), // jetons expirés depuis plus d'un jour
  };
}

/* ───────────── Export JSON / anonymisation ───────────── */

export const EXPORT_DATASETS = ["projects", "beneficiaries", "activities", "evaluations", "internships"] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];

/** Rôles autorisés par jeu de données (miroir de la protection des données du cahier §5.4 / §10). */
export function canExport(role: string, dataset: ExportDataset): "full" | "anonymized" | false {
  const r = role.toUpperCase();
  if (["ADMIN", "DIRECTION"].includes(r)) return "full";
  if (r === "COORDINATOR") return dataset === "internships" ? false : "full";
  if (r === "DAF") return dataset === "projects" || dataset === "activities" ? "full" : false;
  if (r === "RH") return dataset === "internships" || dataset === "evaluations" ? "full" : false;
  if (r === "COMMUNICATION") return dataset === "beneficiaries" || dataset === "projects" ? "anonymized" : false;
  return false;
}

const DIRECT_IDENTIFIERS = [
  "firstName", "lastName", "phone", "email", "cinNumber", "cinIssuedAt", "cinIssuedPlace", "birthPlace", "birthDate",
  "latitude", "longitude", "homeLatitude", "homeLongitude", "homeAltitude", "altitude", "locationAccuracy",
  "trackingToken", "addressDetail", "adminFokontany", "locality", "zoneUnits", "lastSeenAt",
];

/** Pseudonymise une ligne bénéficiaire pour la Communication : plus aucun identifiant direct. */
export function anonymizeRow<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const k of DIRECT_IDENTIFIERS) delete out[k];
  if (typeof out.id === "number") {
    out.pseudonym = `B-${String(out.id).padStart(5, "0")}`;
    delete out.id;
  }
  if (typeof out.age === "number") out.ageBand = out.age < 18 ? "<18" : out.age < 36 ? "18-35" : "36+";
  delete out.age;
  return out;
}
