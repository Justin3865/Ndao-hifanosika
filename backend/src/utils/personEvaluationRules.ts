// src/utils/personEvaluationRules.ts
// LOT 1 · Règles pures (sans base de données) des évaluations de personnes : membres, stagiaires, bénéficiaires (§5.3, §8).

export const TARGET_TYPES = ["MEMBER", "STAGIAIRE", "BENEFICIARY"] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export const EVALUATOR_ROLES = ["SELF", "SUPERVISOR", "TUTOR_ENTERPRISE", "TUTOR_ACADEMIC", "HR"] as const;
export type EvaluatorRole = (typeof EVALUATOR_ROLES)[number];

export const EVAL_STATUSES = ["DRAFT", "SUBMITTED", "VALIDATED"] as const;
export type EvalStatus = (typeof EVAL_STATUSES)[number];

export const PERIODICITIES = ["MONTHLY", "QUARTERLY", "END_OF_MISSION"] as const;
export type Periodicity = (typeof PERIODICITIES)[number];

/** Rôles qui voient et valident toutes les évaluations de personnes. */
export const HR_ROLES = ["ADMIN", "DIRECTION", "RH"];
/** Rôles autorisés à évaluer un autre membre (le tuteur est limité à ses stagiaires par la route). */
export const SUPERVISOR_ROLES = ["ADMIN", "DIRECTION", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"];

const up = (r: string) => r.trim().toUpperCase();
export const isTargetType = (v: unknown): v is TargetType => typeof v === "string" && (TARGET_TYPES as readonly string[]).includes(v);
export const isEvaluatorRole = (v: unknown): v is EvaluatorRole => typeof v === "string" && (EVALUATOR_ROLES as readonly string[]).includes(v);
export const isPeriodicity = (v: unknown): v is Periodicity => typeof v === "string" && (PERIODICITIES as readonly string[]).includes(v);
export const isStagiaireRole = (role: string) => up(role).startsWith("STAGIAIRE_");

export interface ScoreInput { criterion: string; score: number; maxScore?: number; weight?: number; comment?: string | null }
export interface CleanScore { criterion: string; score: number; maxScore: number; weight: number; comment: string | null }
export interface GridCriterion { label: string; weight?: number }

/**
 * Note globale sur 100 = moyenne pondérée des (note / barème) ; null s'il n'y a aucune note.
 * Un critère de poids 0 est ignoré.
 */
export function computeTotal(scores: Array<{ score: number; maxScore: number; weight: number }>): number | null {
  let sum = 0, w = 0;
  for (const s of scores) {
    if (!(s.maxScore > 0) || !(s.weight > 0)) continue;
    sum += Math.min(1, Math.max(0, s.score / s.maxScore)) * s.weight;
    w += s.weight;
  }
  return w > 0 ? Math.round((sum / w) * 1000) / 10 : null; // 1 décimale
}

/**
 * Valide et nettoie la saisie des notes.
 * - note ∈ [0, barème] ; barème par défaut = celui de la grille (ou 20) ;
 * - pas de critère en double ; si la grille est connue, critère ∈ grille et poids repris de la grille.
 */
export function cleanScores(input: unknown, grid?: { criteria: GridCriterion[]; maxScore?: number } | null): { scores: CleanScore[] } | { error: string } {
  if (!Array.isArray(input) || input.length === 0) return { error: "Au moins une note est requise." };
  if (input.length > 100) return { error: "Trop de critères (100 maximum)." };
  const defaultMax = grid?.maxScore && grid.maxScore > 0 ? grid.maxScore : 20;
  const byLabel = new Map((grid?.criteria ?? []).map((c) => [c.label.trim().toLowerCase(), c]));
  const seen = new Set<string>();
  const out: CleanScore[] = [];
  for (const raw of input as ScoreInput[]) {
    const criterion = String(raw?.criterion ?? "").trim();
    if (!criterion) return { error: "Critère manquant." };
    const key = criterion.toLowerCase();
    if (seen.has(key)) return { error: `Critère en double : ${criterion}.` };
    seen.add(key);
    const gridCrit = byLabel.get(key);
    if (grid && grid.criteria.length > 0 && !gridCrit) return { error: `Critère absent de la grille : ${criterion}.` };
    const score = Number(raw.score);
    const maxScore = raw.maxScore === undefined || raw.maxScore === null ? defaultMax : Number(raw.maxScore);
    if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return { error: `Note invalide pour « ${criterion} ».` };
    if (score < 0 || score > maxScore) return { error: `La note de « ${criterion} » doit être comprise entre 0 et ${maxScore}.` };
    const weight = gridCrit?.weight && gridCrit.weight > 0 ? gridCrit.weight : raw.weight === undefined ? 1 : Number(raw.weight);
    if (!Number.isFinite(weight) || weight < 0) return { error: `Poids invalide pour « ${criterion} ».` };
    out.push({ criterion, score, maxScore, weight, comment: raw.comment ? String(raw.comment).slice(0, 1000) : null });
  }
  return { scores: out };
}

/** Une soumission exige que TOUS les critères de la grille soient notés (grille vide = au moins une note). */
export function missingCriteria(grid: { criteria: GridCriterion[] } | null | undefined, scored: Array<{ criterion: string }>): string[] {
  if (!grid || grid.criteria.length === 0) return scored.length === 0 ? ["(aucune note)"] : [];
  const have = new Set(scored.map((s) => s.criterion.trim().toLowerCase()));
  return grid.criteria.filter((c) => !have.has(c.label.trim().toLowerCase())).map((c) => c.label);
}

export type Action = "edit" | "submit" | "validate";

/** Machine à états : DRAFT → SUBMITTED → VALIDATED. Une évaluation validée est figée. */
export function canTransition(current: string, action: Action): boolean {
  if (action === "edit") return current === "DRAFT";
  if (action === "submit") return current === "DRAFT";
  return current === "SUBMITTED"; // validate
}

export interface Actor { id: number; role: string }

/** Qui peut créer quel type d'évaluation (la limite « tuteur = ses stagiaires » est vérifiée par la route). */
export function canCreate(actor: Actor, targetType: TargetType, targetId: number, evaluatorRole: EvaluatorRole): { ok: true } | { ok: false; message: string } {
  const role = up(actor.role);
  if (evaluatorRole === "SELF") {
    if (targetType === "BENEFICIARY") return { ok: false, message: "Un bénéficiaire ne s'auto-évalue pas sur la plateforme (portail prévu en phase 2)." };
    return actor.id === targetId ? { ok: true } : { ok: false, message: "L'auto-évaluation ne peut être saisie que par la personne concernée." };
  }
  if (evaluatorRole === "HR") return HR_ROLES.includes(role) ? { ok: true } : { ok: false, message: "Réservé à la Direction, au RH et à l'administration." };
  if (!SUPERVISOR_ROLES.includes(role)) return { ok: false, message: "Accès refusé : rôle insuffisant pour évaluer." };
  if ((evaluatorRole === "TUTOR_ENTERPRISE" || evaluatorRole === "TUTOR_ACADEMIC") && targetType !== "STAGIAIRE") {
    return { ok: false, message: "Les rôles tuteur ne concernent que les stagiaires." };
  }
  if (targetType === "BENEFICIARY" && evaluatorRole !== "SUPERVISOR") return { ok: false, message: "Un bénéficiaire est évalué par un responsable (SUPERVISOR)." };
  return { ok: true };
}

export const slotKey = (s: { targetType: string; targetId: number; evaluatorRole: string; evaluatorId: number | null }) =>
  `${s.targetType}:${s.targetId}:${s.evaluatorRole}:${s.evaluatorId ?? "-"}`;

export interface Target { targetType: TargetType; targetId: number; tutorEnterpriseId?: number | null; hasAcademicTutor?: boolean }
export interface Slot { targetType: TargetType; targetId: number; evaluatorRole: EvaluatorRole; evaluatorId: number | null }

/**
 * Évaluations à créer pour lancer une campagne : pour un membre/stagiaire → auto-évaluation + évaluation du responsable
 * (+ tuteur entreprise / académique pour les stagiaires) ; pour un bénéficiaire → évaluation du responsable.
 * Les créneaux déjà existants sont ignorés : relancer une campagne ne crée pas de doublon.
 */
export function planSlots(targets: Target[], existing: Iterable<string>): Slot[] {
  const have = new Set(existing);
  const out: Slot[] = [];
  const push = (s: Slot) => { if (!have.has(slotKey(s))) { have.add(slotKey(s)); out.push(s); } };
  for (const t of targets) {
    if (t.targetType === "BENEFICIARY") { push({ ...pick(t), evaluatorRole: "SUPERVISOR", evaluatorId: null }); continue; }
    push({ ...pick(t), evaluatorRole: "SELF", evaluatorId: t.targetId });
    push({ ...pick(t), evaluatorRole: "SUPERVISOR", evaluatorId: null });
    if (t.targetType === "STAGIAIRE") {
      if (t.tutorEnterpriseId) push({ ...pick(t), evaluatorRole: "TUTOR_ENTERPRISE", evaluatorId: t.tutorEnterpriseId });
      if (t.hasAcademicTutor) push({ ...pick(t), evaluatorRole: "TUTOR_ACADEMIC", evaluatorId: null });
    }
  }
  return out;
}
const pick = (t: Target) => ({ targetType: t.targetType, targetId: t.targetId });

/** Libellé de période : MONTHLY → 2026-11 ; QUARTERLY → 2026-T4 ; END_OF_MISSION → FIN_MISSION. */
export function periodLabel(p: Periodicity | null | undefined, date: Date = new Date()): string | null {
  if (!p) return null;
  const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1;
  if (p === "MONTHLY") return `${y}-${String(m).padStart(2, "0")}`;
  if (p === "QUARTERLY") return `${y}-T${Math.ceil(m / 3)}`;
  return "FIN_MISSION";
}

/** Écart auto-évaluation / évaluation du responsable (points sur 100). > 0 : la personne se surévalue. */
export function crossGap(self: number | null | undefined, supervisor: number | null | undefined): number | null {
  if (typeof self !== "number" || typeof supervisor !== "number") return null;
  return Math.round((self - supervisor) * 10) / 10;
}
export const GAP_ALERT_POINTS = 15;
export const hasLargeGap = (gap: number | null): boolean => gap !== null && Math.abs(gap) >= GAP_ALERT_POINTS;

export interface HistoryItem {
  id: number; evaluatorRole: string; status: string; totalScore: number | null; period?: string | null;
  submittedAt?: Date | string | null; createdAt: Date | string;
  scores?: Array<{ criterion: string; score: number; maxScore: number }>;
}

/** Séries pour le graphique de progression : évaluations des RESPONSABLES/TUTEURS soumises ou validées, par date. */
export function progressSeries(items: HistoryItem[]) {
  const t = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : 0);
  const keep = items.filter((i) => i.evaluatorRole !== "SELF" && i.status !== "DRAFT" && typeof i.totalScore === "number");
  return keep
    .sort((a, b) => t(a.submittedAt ?? a.createdAt) - t(b.submittedAt ?? b.createdAt))
    .map((i) => ({ id: i.id, period: i.period ?? null, at: new Date(i.submittedAt ?? i.createdAt).toISOString(), score: i.totalScore as number }));
}

/** Même série, au format attendu par le service IA (POST /ai/score/performance). */
export function toPerformanceInput(items: HistoryItem[]) {
  return progressSeries(items).map((p) => {
    const src = items.find((i) => i.id === p.id)!;
    return {
      score: p.score, maxScore: 100, evaluatedAt: p.at,
      criteria: (src.scores ?? []).map((s) => ({ name: s.criterion, score: s.score, maxScore: s.maxScore })),
    };
  });
}

/** Évaluations en retard : campagne ACTIVE dont la date de fin est passée et qui ont encore des créneaux DRAFT. */
export function overdueCount(campaign: { status: string; endDate?: Date | string | null }, drafts: number, now: Date = new Date()): number {
  if (campaign.status !== "ACTIVE" || !campaign.endDate) return 0;
  return new Date(campaign.endDate).getTime() < now.getTime() ? drafts : 0;
}
