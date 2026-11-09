// src/services/noteAnomaly.service.ts  (AJOUT) — « porte » avant la note : vérification des anomalies de présence.
// Objectif : qu'aucune anomalie ne fasse baisser la note sans avoir été vue par le tuteur ou la RH.
// La proposition de pénalité est INDICATIVE : elle n'est jamais appliquée automatiquement à la note existante.

import { db } from "../utils/db";
import { notifyUsers } from "../utils/notify";
import {
  countDecisions, noteRecommendations, notePolicy, nonWorkingDaysOfYear, penaltyPoints, type CaseDecision, type GateCounts,
} from "../utils/extraAnomalyRules";
import { computeExtra, invalidateExtraAnomalies, type NoteCase } from "./extraAnomalies.service";
import { currentPeriod, computeMeritLive } from "./merit.service";
import { saveDecision } from "./noteDecisions";

export interface Viewer {
  id: number;
  role: string;
}

const MANAGERS = ["ADMIN", "DIRECTION", "RH", "DSI"];
const isManager = (role: string) => MANAGERS.includes(role.toUpperCase());
const isTutor = (role: string) => role.toUpperCase().startsWith("TUTEUR_");
const isStudent = (role: string) => role.toUpperCase().startsWith("STAGIAIRE_");

export class NoteGateError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function canSee(viewer: Viewer, stage: { studentId: number; supervisorId: number | null }): boolean {
  if (isManager(viewer.role)) return true;
  if (isTutor(viewer.role)) return stage.supervisorId === viewer.id;
  if (isStudent(viewer.role)) return stage.studentId === viewer.id;
  return false;
}

export function canVerify(viewer: Viewer, stage: { supervisorId: number | null }): boolean {
  if (["ADMIN", "DIRECTION", "RH"].includes(viewer.role.toUpperCase())) return true;
  return isTutor(viewer.role) && stage.supervisorId === viewer.id;
}

export interface InternshipSummary {
  internshipId: number;
  title: string;
  studentName: string;
  counts: GateCounts;
  total: number;
  ready: boolean;
  penaltyPoints: number;
}

export async function listSummaries(viewer: Viewer): Promise<InternshipSummary[]> {
  const extra = await computeExtra();
  const byStage = new Map<number, NoteCase[]>();
  for (const c of extra.noteCases) byStage.set(c.internshipId, [...(byStage.get(c.internshipId) ?? []), c]);
  const policy = notePolicy();
  const out: InternshipSummary[] = [];
  for (const [id, cases] of byStage) {
    const stage = extra.internships.get(id);
    if (!stage || !canSee(viewer, stage)) continue;
    const counts = countDecisions(cases.map((c) => c.decision));
    out.push({ internshipId: id, title: stage.title, studentName: stage.studentName, counts, total: cases.length, ready: counts.pending + counts.inReview === 0, penaltyPoints: penaltyPoints(counts.confirmed, policy) });
  }
  return out.sort((a, b) => b.counts.pending + b.counts.inReview - (a.counts.pending + a.counts.inReview) || a.studentName.localeCompare(b.studentName, "fr"));
}

let meritCache: { at: number; byUser: Map<number, number> } | null = null;

async function currentNote(userId: number): Promise<number | null> {
  try {
    if (!meritCache || Date.now() - meritCache.at > 5 * 60_000) {
      const result = await computeMeritLive(currentPeriod());
      const byUser = new Map<number, number>();
      for (const rows of Object.values(result.cohorts)) for (const row of rows) byUser.set(row.userId, row.score);
      meritCache = { at: Date.now(), byUser };
    }
    return meritCache.byUser.get(userId) ?? null;
  } catch {
    return null;
  }
}

export async function gate(viewer: Viewer, internshipId: number) {
  const extra = await computeExtra();
  const stage = extra.internships.get(internshipId);
  if (!stage) throw new NoteGateError(404, "Stage introuvable ou sans anomalie de présence suivie.");
  if (!canSee(viewer, stage)) throw new NoteGateError(403, "Accès refusé à ce stage.");

  const cases = extra.noteCases.filter((c) => c.internshipId === internshipId).sort((a, b) => (b.day ?? "").localeCompare(a.day ?? ""));
  const counts = countDecisions(cases.map((c) => c.decision));
  const policy = notePolicy();
  const current = await currentNote(stage.studentId);
  const points = penaltyPoints(counts.confirmed, policy);

  return {
    internship: { id: stage.id, title: stage.title, studentName: stage.studentName, studentId: stage.studentId, supervisorId: stage.supervisorId },
    cases,
    counts,
    ready: counts.pending + counts.inReview === 0,
    canVerify: canVerify(viewer, stage),
    policy: { perCase: policy.perCase, cap: policy.cap, scale: policy.scale, appliedAutomatically: false },
    note: { current, penaltyPoints: points, recommended: current === null ? null : Math.max(0, Math.round((current - points) * 100) / 100), scale: policy.scale },
    recommendations: noteRecommendations(counts, current, policy),
  };
}

export async function verify(viewer: Viewer, input: { key: string; decision: string; comment?: string }) {
  const decision = input.decision as CaseDecision;
  if (!["JUSTIFIED", "CONFIRMED", "IN_REVIEW"].includes(decision)) throw new NoteGateError(400, "Décision invalide (JUSTIFIED, CONFIRMED ou IN_REVIEW).");
  const comment = String(input.comment ?? "").trim();
  if (decision === "JUSTIFIED" && comment.length < 5) throw new NoteGateError(400, "Une justification (5 caractères minimum) est obligatoire.");

  const extra = await computeExtra(true);
  const found = extra.noteCases.find((c) => c.key === input.key);
  if (!found) throw new NoteGateError(404, "Anomalie introuvable (déjà corrigée ou clé invalide).");
  const stage = extra.internships.get(found.internshipId);
  if (!stage || !canVerify(viewer, stage)) throw new NoteGateError(403, "Seuls le tuteur du stage, la RH, la Direction ou l'administrateur peuvent vérifier ce cas.");

  const me = (await db.user.findUnique({ where: { id: viewer.id }, select: { firstName: true, lastName: true } })) as { firstName: string; lastName: string } | null;
  await saveDecision(found.key, found.type, found.title, decision as "JUSTIFIED" | "CONFIRMED" | "IN_REVIEW", comment, { id: viewer.id, name: me ? `${me.firstName} ${me.lastName}`.trim() : `Utilisateur #${viewer.id}` });
  invalidateExtraAnomalies();

  const label = { JUSTIFIED: "justifiée", CONFIRMED: "confirmée", IN_REVIEW: "mise en vérification" }[decision as "JUSTIFIED"];
  await notifyUsers([stage.studentId, stage.supervisorId], {
    title: `Anomalie de présence ${label}`,
    message: `${found.title}${comment ? ` — ${comment}` : ""}`,
    type: decision === "CONFIRMED" ? "WARNING" : "INFO",
    channels: "app",
  }, viewer.id).catch(() => undefined);

  return gate(viewer, found.internshipId);
}

export function calendar(year: number) {
  return nonWorkingDaysOfYear(year);
}
