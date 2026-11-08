// src/utils/projectLinkRules.ts
// LOT 2 · Règles pures (sans base de données) du rattachement N-N et de la fiche membre.
import { type ScopeDecision, canAccessProject } from "./projectScopeRules";

export const LINK_STATUSES = ["ACTIVE", "COMPLETED", "DROPPED_OUT"] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export const ENGAGEMENT_TYPES = ["SALARIE", "BENEVOLE", "STAGIAIRE"] as const;
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];

export interface ProjectLink {
  beneficiaryId?: number;
  projectId: number;
  status: string;
  joinedAt: Date | string | null;
  exitedAt?: Date | string | null;
}

export const isLinkStatus = (v: unknown): v is LinkStatus => typeof v === "string" && (LINK_STATUSES as readonly string[]).includes(v);

/** ACTIVE : pas de date de sortie ; COMPLETED / DROPPED_OUT : date de sortie (défaut : maintenant). */
export function normalizeLinkStatus(status: LinkStatus, now: Date = new Date(), exitedAt?: Date | null): { status: LinkStatus; exitedAt: Date | null } {
  if (status === "ACTIVE") return { status, exitedAt: null };
  return { status, exitedAt: exitedAt ?? now };
}

/** Le projet principal (Beneficiary.projectId) ne peut pas être détaché : il faut d'abord en désigner un autre. */
export const canUnlink = (primaryProjectId: number, projectId: number): boolean => primaryProjectId !== projectId;

/** Liste complète des rattachements : ajoute le projet principal s'il manque dans la table (ancienne donnée non reprise). */
export function withPrimary(primaryProjectId: number, links: ProjectLink[], fallbackJoinedAt: Date | string | null = null): Array<ProjectLink & { isPrimary: boolean }> {
  const out = links.map((l) => ({ ...l, isPrimary: l.projectId === primaryProjectId }));
  if (!out.some((l) => l.projectId === primaryProjectId)) {
    out.unshift({ projectId: primaryProjectId, status: "ACTIVE", joinedAt: fallbackJoinedAt, exitedAt: null, isPrimary: true });
  }
  return out.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.projectId - b.projectId);
}

/** Un coordinateur ne voit que les rattachements de SES projets (un bénéficiaire A+B : le coordinateur de A ne voit pas B). */
export function visibleLinks<T extends { projectId: number }>(scope: ScopeDecision, links: T[]): T[] {
  return links.filter((l) => canAccessProject(scope, l.projectId));
}

/** Un coordinateur peut agir sur un bénéficiaire s'il est rattaché à AU MOINS un de ses projets. */
export function canReachBeneficiary(scope: ScopeDecision, projectIds: number[]): boolean {
  return !scope.scoped || projectIds.some((id) => canAccessProject(scope, id));
}

export interface MemberProfileInput {
  jobTitle?: string | null;
  engagementType?: EngagementType | null;
  engagementStart?: Date | null;
  engagementEnd?: Date | null;
}

const toDate = (v: unknown): Date | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** Valide la saisie de la fiche membre. Retourne soit les données à enregistrer, soit un message d'erreur. */
export function parseMemberProfile(body: Record<string, unknown> | undefined | null): { data: MemberProfileInput } | { error: string } {
  const b = body ?? {};
  const data: MemberProfileInput = {};

  if (b.jobTitle !== undefined) {
    const t = b.jobTitle === null ? "" : String(b.jobTitle).trim();
    if (t.length > 120) return { error: "Le poste est limité à 120 caractères." };
    data.jobTitle = t || null;
  }
  if (b.engagementType !== undefined) {
    if (b.engagementType === null || b.engagementType === "") data.engagementType = null;
    else if ((ENGAGEMENT_TYPES as readonly string[]).includes(String(b.engagementType).toUpperCase())) data.engagementType = String(b.engagementType).toUpperCase() as EngagementType;
    else return { error: "Type d'engagement invalide (SALARIE, BENEVOLE ou STAGIAIRE)." };
  }
  for (const key of ["engagementStart", "engagementEnd"] as const) {
    if (b[key] === undefined) continue;
    const d = toDate(b[key]);
    if (d === undefined) return { error: "Date d'engagement invalide." };
    data[key] = d;
  }
  if (data.engagementStart && data.engagementEnd && data.engagementEnd.getTime() < data.engagementStart.getTime()) {
    return { error: "La fin d'engagement doit être postérieure au début." };
  }
  return { data };
}

/** Un membre est « en poste » à une date si elle est dans [début, fin] (bornes absentes = ouvertes). */
export function isEngagedAt(p: { engagementStart?: Date | null; engagementEnd?: Date | null }, at: Date = new Date()): boolean {
  const t = at.getTime();
  return (!p.engagementStart || p.engagementStart.getTime() <= t) && (!p.engagementEnd || p.engagementEnd.getTime() >= t);
}
