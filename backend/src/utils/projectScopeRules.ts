// src/utils/projectScopeRules.ts
// Règles pures (sans base de données) du périmètre « coordinateur → ses projets ».
// Séparées du service pour être testables sans Prisma.

export interface ScopeDecision {
  /** true = l'utilisateur est filtré par projets affectés */
  scoped: boolean;
  /** projets autorisés (significatif seulement si scoped) */
  allowed: number[];
}

/**
 * Mode de transition : tant qu'un coordinateur n'a AUCUNE affectation, il garde l'accès
 * historique (sinon la mise en production le priverait de toutes ses données).
 * COORDINATOR_SCOPE=strict : pas d'affectation = aucun accès.
 */
export function decideScope(role: string, assigned: number[], strict: boolean): ScopeDecision {
  if (role.trim().toUpperCase() !== "COORDINATOR") return { scoped: false, allowed: [] };
  if (assigned.length === 0 && !strict) return { scoped: false, allowed: [] };
  return { scoped: true, allowed: [...new Set(assigned)] };
}

export function canAccessProject(decision: ScopeDecision, projectId: number | null | undefined): boolean {
  if (!decision.scoped) return true;
  if (typeof projectId !== "number") return false;
  return decision.allowed.includes(projectId);
}

/** Filtre une liste d'objets portant un projectId (directement ou via .beneficiary). */
export function filterByProject<T>(
  decision: ScopeDecision,
  rows: T[],
  pick: (row: T) => number | null | undefined,
): T[] {
  if (!decision.scoped) return rows;
  return rows.filter((row) => canAccessProject(decision, pick(row)));
}

export type JourneyStatusValue = "ACTIVE" | "COMPLETED" | "DROPPED_OUT";

export const JOURNEY_STATUSES: JourneyStatusValue[] = ["ACTIVE", "COMPLETED", "DROPPED_OUT"];

export interface JourneyInput {
  status: JourneyStatusValue;
  statusDate?: Date | null;
  dropoutReason?: string | null;
}

/** Normalise une saisie : ACTIVE n'a ni date ni motif ; DROPPED_OUT exige une date (défaut : maintenant). */
export function normalizeJourney(input: JourneyInput, now: Date = new Date()): JourneyInput {
  if (input.status === "ACTIVE") return { status: "ACTIVE", statusDate: null, dropoutReason: null };
  const statusDate = input.statusDate ?? now;
  if (input.status === "COMPLETED") return { status: "COMPLETED", statusDate, dropoutReason: null };
  return { status: "DROPPED_OUT", statusDate, dropoutReason: input.dropoutReason?.trim() || null };
}

/** Taux d'abandon = abandons / (terminés + abandons) ; les parcours actifs sont censurés (exclus). */
export function dropoutRate(counts: { COMPLETED: number; DROPPED_OUT: number; ACTIVE?: number }) {
  const closed = counts.COMPLETED + counts.DROPPED_OUT;
  return {
    closed,
    active: counts.ACTIVE ?? 0,
    rate: closed === 0 ? null : Number((counts.DROPPED_OUT / closed).toFixed(4)),
  };
}
