// src/lib/journey.ts — types et règles pures du parcours des bénéficiaires (testables sans React).
// Miroir de srcb/src/utils/projectScopeRules.ts (normalizeJourney, dropoutRate).

export type JourneyStatus = "ACTIVE" | "COMPLETED" | "DROPPED_OUT";
export const JOURNEY_STATUSES: JourneyStatus[] = ["ACTIVE", "COMPLETED", "DROPPED_OUT"];

export const JOURNEY_LABELS: Record<JourneyStatus, string> = {
  ACTIVE: "En cours",
  COMPLETED: "Terminé",
  DROPPED_OUT: "Abandon",
};

export const JOURNEY_STYLE: Record<JourneyStatus, string> = {
  ACTIVE: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  DROPPED_OUT: "bg-red-100 text-red-800",
};

export interface JourneyRow {
  id: number;
  firstName: string;
  lastName: string;
  projectId: number;
  project?: { name: string } | null;
  journeyStatus: JourneyStatus;
  statusDate: string | null;
  dropoutReason: string | null;
}

export interface JourneySummary {
  counts: Record<JourneyStatus, number>;
  closed: number;
  active: number;
  rate: number | null;
}

/** Seuils de ML/compare_live.py : 30 parcours clos dont 5 au moins de chaque classe ; sous 100, résultats indicatifs. */
export const MIN_CLOSED = 30;
export const MIN_PER_CLASS = 5;
export const COMFORTABLE_CLOSED = 100;

export interface LabelReadiness {
  closed: number;
  completed: number;
  dropped: number;
  level: "insufficient" | "indicative" | "reliable";
  missingClosed: number;
  missingPerClass: { completed: number; dropped: number };
}

/** labels = lignes de GET /api/journey/labels (dropout 1 = abandon, 0 = terminé). */
export function labelReadiness(labels: Array<{ dropout: number }>): LabelReadiness {
  const dropped = labels.filter((l) => l.dropout === 1).length;
  const closed = labels.length;
  const completed = closed - dropped;
  const missingPerClass = {
    completed: Math.max(0, MIN_PER_CLASS - completed),
    dropped: Math.max(0, MIN_PER_CLASS - dropped),
  };
  const ok = closed >= MIN_CLOSED && missingPerClass.completed === 0 && missingPerClass.dropped === 0;
  return {
    closed,
    completed,
    dropped,
    level: !ok ? "insufficient" : closed < COMFORTABLE_CLOSED ? "indicative" : "reliable",
    missingClosed: Math.max(0, MIN_CLOSED - closed),
    missingPerClass,
  };
}

/** Date au format AAAA-MM-JJ pour <input type="date">. */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Corps de PUT /api/journey/beneficiary/:id : ACTIVE sans date ni motif ; abandon : motif facultatif. */
export function buildJourneyPayload(form: { status: JourneyStatus; date: string; reason: string }) {
  if (form.status === "ACTIVE") return { status: "ACTIVE" as const };
  const body: { status: JourneyStatus; statusDate?: string; dropoutReason?: string } = { status: form.status };
  if (form.date) body.statusDate = new Date(`${form.date}T12:00:00Z`).toISOString();
  if (form.status === "DROPPED_OUT" && form.reason.trim()) body.dropoutReason = form.reason.trim();
  return body;
}

export const pctRate = (rate: number | null | undefined): string =>
  rate === null || rate === undefined ? "—" : `${(rate * 100).toFixed(1).replace(/\.0$/, "")} %`;

/** Affectations projet ↔ coordinateur (GET /api/project-coordinators). */
export interface Assignment {
  id: number;
  projectId: number;
  userId: number;
}

/** « Prénom Nom (COORDINATOR) » -> { name, role } (format de GET /api/lookups/users). */
export function parseUserLabel(label: string): { name: string; role: string } {
  const m = /^(.*)\s\(([A-Z_0-9]+)\)\s*$/.exec(label);
  return m ? { name: m[1]!.trim(), role: m[2]! } : { name: label, role: "" };
}

/** Coordinateurs sans aucune affectation : ils gardent l'accès historique à tous les projets (mode transition). */
export function unassignedCoordinators(coordinatorIds: number[], assignments: Assignment[]): number[] {
  const assigned = new Set(assignments.map((a) => a.userId));
  return coordinatorIds.filter((id) => !assigned.has(id));
}
