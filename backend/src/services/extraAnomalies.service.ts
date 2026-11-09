// src/services/extraAnomalies.service.ts  (AJOUT)
// Détecte les anomalies complémentaires (stagiaires, bénéficiaires, projets/activités, jours non ouvrables) et les
// fournit au moteur d'analyse existant (insights.service › runAnalysis) au même format que les autres anomalies.
// Toute erreur est absorbée : le moteur de base n'est jamais dégradé par ce module.

import { logger } from "../config/logger";
import { db } from "../utils/db";
import {
  BEHAVIOR_FEATURES, NOTE_AFFECTING_TYPES, attendanceOnNonWorkingDay, behaviorRows,
  beneficiaryAnomalies, dayKeyMg, gpsIdentical, gpsRepeatedSuspect, internshipDatesInvalid, missingCheckoutRepeated,
  noActivityReport, presenceOnNonWorkingDay, presenceOutsideStage, projectAnomalies, robustOutliers,
  shortPresenceRepeated, taskInconsistencies, type ActivityInput, type BeneficiaryInput, type CaseDecision,
  type InternshipInput, type PresenceInput, type ProjectInput, type RuleAnomaly, type TaskInput,
} from "../utils/extraAnomalyRules";
import { loadDecisions, type DecisionRow } from "./noteDecisions";
import { detectWithAiService } from "./pyservices.service";

const DAY = 86_400_000;
const TTL_MS = 60_000;
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export interface NoteCase {
  key: string;
  type: string;
  internshipId: number;
  severity: RuleAnomaly["severity"];
  title: string;
  detail: string;
  day: string | null;
  decision: CaseDecision;
  comment: string;
  decidedBy: string | null;
  decidedAt: string | null;
}

export interface ExtraResult {
  anomalies: RuleAnomaly[];
  noteCases: NoteCase[];
  internships: Map<number, InternshipInput>;
  generatedAt: string;
}

let memo: { at: number; value: ExtraResult } | null = null;

export function invalidateExtraAnomalies(): void {
  memo = null;
}

async function loadInternships(sinceMs: number): Promise<InternshipInput[]> {
  const rows = (await db.internship.findMany({
    where: { status: { in: ["IN_PROGRESS", "COMPLETED"] }, OR: [{ endDate: null }, { endDate: { gte: new Date(sinceMs) } }] },
    select: {
      id: true, studentId: true, supervisorId: true, title: true, startDate: true, endDate: true, status: true, projectId: true, durationMonths: true,
      student: { select: { firstName: true, lastName: true } },
    },
  })) as Array<Record<string, any>>;
  return rows.map((r) => ({
    id: r.id, studentId: r.studentId, supervisorId: r.supervisorId, title: r.title, startDate: r.startDate, endDate: r.endDate,
    status: r.status, projectId: r.projectId, durationMonths: r.durationMonths,
    studentName: `${r.student?.firstName ?? ""} ${r.student?.lastName ?? ""}`.trim() || `Stagiaire #${r.studentId}`,
  }));
}

async function internAnomalies(now: Date, decisions: Map<string, DecisionRow>): Promise<{ rows: RuleAnomaly[]; cases: NoteCase[]; stages: InternshipInput[] }> {
  const sinceMs = now.getTime() - 400 * DAY;
  const stages = await loadInternships(sinceMs);
  if (!stages.length) return { rows: [], cases: [], stages };

  const ids = stages.map((s) => s.id);
  const [presenceRows, taskRows] = await Promise.all([
    db.dailyPresence.findMany({
      where: { internshipId: { in: ids }, day: { gte: dayKeyMg(new Date(sinceMs)) } },
      select: { id: true, userId: true, day: true, internshipId: true, projectId: true, status: true, flags: true, checkInAt: true, checkOutAt: true, inLatitude: true, inLongitude: true, inAccuracy: true, tasksDone: true, summary: true },
    }) as Promise<Array<Record<string, any>>>,
    db.internshipTask.findMany({ where: { internshipId: { in: ids } }, select: { id: true, internshipId: true, title: true, status: true, progress: true, report: true, evidenceName: true } }) as Promise<Array<Record<string, any>>>,
  ]);

  const presences: PresenceInput[] = presenceRows.map((p) => ({ ...p, flags: Array.isArray(p.flags) ? (p.flags as string[]) : [] }) as PresenceInput);
  const tasks = taskRows as TaskInput[];
  const today = dayKeyMg(now);

  const rows: RuleAnomaly[] = [
    ...presenceOnNonWorkingDay(presences, stages),
    ...gpsRepeatedSuspect(presences, stages),
    ...gpsIdentical(presences, stages),
    ...shortPresenceRepeated(presences, stages),
    ...missingCheckoutRepeated(presences, stages, today),
    ...presenceOutsideStage(presences, stages),
    ...noActivityReport(presences, stages),
    ...internshipDatesInvalid(stages),
    ...taskInconsistencies(tasks, stages),
    ...(await behaviorOutliers(presences, stages, today)),
  ];

  // Cas à vérifier avant la note (présences + indices GPS/période), avec la décision déjà prise.
  const internshipOfPresence = new Map(presences.map((p) => [p.id, p]));
  const dayOfPresence = (key: string) => internshipOfPresence.get(Number(key.split(":")[1]))?.day ?? null;
  const cases: NoteCase[] = [];
  for (const r of rows) {
    if (!NOTE_AFFECTING_TYPES.has(r.type)) continue;
    const internshipId = r.entityKind === "presence" ? internshipOfPresence.get(Number(r.entityId))?.internshipId ?? null : r.entityId;
    if (internshipId === null || internshipId === undefined) continue;
    const decision = decisions.get(r.key);
    cases.push({
      key: r.key, type: r.type, internshipId, severity: r.severity, title: r.title, detail: r.detail,
      day: r.entityKind === "presence" ? dayOfPresence(r.key) : null,
      decision: decision?.decision ?? "PENDING", comment: decision?.comment ?? "", decidedBy: decision?.by ?? null, decidedAt: decision?.at ?? null,
    });
  }

  // Accumulation : ≥ 3 cas sans décision sur un même stage => « note à vérifier » (critique), RH incluse.
  const open = new Map<number, number>();
  for (const c of cases) if (c.decision === "PENDING" || c.decision === "IN_REVIEW") open.set(c.internshipId, (open.get(c.internshipId) ?? 0) + 1);
  if ([...open.values()].some((n) => n >= 3)) {
    const hr = ((await db.user.findMany({ where: { role: "RH", status: "ACTIVE" }, select: { id: true } })) as Array<{ id: number }>).map((u) => u.id);
    for (const [id, n] of open) {
      if (n < 3) continue;
      const stage = stages.find((s) => s.id === id);
      if (!stage) continue;
      rows.push({
        key: `INTERN_NOTE_REVIEW_NEEDED:${id}`, type: "INTERN_NOTE_REVIEW_NEEDED", severity: "HIGH",
        title: `Note à vérifier avant publication : ${stage.studentName}`,
        detail: `${n} anomalies de présence sans décision. Si elles s'accumulent, la note risque de baisser : le tuteur ou la RH doit les confirmer ou les justifier avant la publication.`,
        link: `/note-anomalies?internshipId=${id}`, entityKind: "internship", entityId: id, projectId: stage.projectId,
        ownerIds: Array.from(new Set([stage.studentId, ...(stage.supervisorId ? [stage.supervisorId] : []), ...hr])),
      });
    }
  }
  return { rows, cases, stages };
}

/** Comportement atypique : Isolation Forest du service IA, repli local (MAD) si le service est indisponible. */
async function behaviorOutliers(presences: PresenceInput[], stages: InternshipInput[], today: string): Promise<RuleAnomaly[]> {
  const data = behaviorRows(presences, stages, today);
  if (data.length < 8) return [];
  const flagged = new Map<number, string[]>();
  try {
    const result = await detectWithAiService("intern_behavior", [...BEHAVIOR_FEATURES], data.map((r) => ({ id: String(r.internshipId), values: r.values })), 0.1);
    if (result.ready) {
      for (const r of result.results) {
        const strong = r.reasons.filter((x) => Math.abs(x.z) >= 3);
        if (r.anomaly && strong.length) flagged.set(Number(r.id), strong.map((x) => `${x.feature} = ${x.value} (médiane ${x.median})`));
      }
    }
  } catch {
    for (const o of robustOutliers(data)) flagged.set(o.internshipId, [...(flagged.get(o.internshipId) ?? []), `${o.feature} (écart robuste ${o.z})`]);
  }
  const rows: RuleAnomaly[] = [];
  for (const [id, reasons] of flagged) {
    const stage = stages.find((s) => s.id === id);
    if (!stage) continue;
    rows.push({
      key: `INTERN_BEHAVIOR_OUTLIER:${id}`, type: "INTERN_BEHAVIOR_OUTLIER", severity: "LOW",
      title: `Comportement atypique : ${stage.studentName}`,
      detail: `Profil de présence très différent des autres stagiaires — ${reasons.join(" ; ")}. Simple signal statistique, à vérifier avec le tuteur.`,
      link: `/note-anomalies?internshipId=${id}`, entityKind: "internship", entityId: id, projectId: stage.projectId,
      ownerIds: Array.from(new Set([stage.studentId, ...(stage.supervisorId ? [stage.supervisorId] : [])])),
    });
  }
  return rows;
}

async function programAnomalies(now: Date): Promise<RuleAnomaly[]> {
  const [people, attendanceRows, journeys, consents, activityRows, projectRows, benefCounts, milestoneRows] = await Promise.all([
    db.beneficiary.findMany({ select: { id: true, projectId: true, firstName: true, lastName: true, age: true, birthDate: true, phone: true, cinNumber: true, householdSize: true, childrenUnder5: true, outOfSchoolChildren: true, latitude: true, longitude: true, homeLatitude: true, homeLongitude: true } }),
    db.beneficiaryAttendance.findMany({ select: { beneficiaryId: true, activityId: true, present: true, createdAt: true }, take: 300_000 }),
    db.beneficiaryJourney.findMany({ select: { beneficiaryId: true, status: true, statusDate: true } }),
    db.beneficiaryConsent.findMany({ select: { beneficiaryId: true, revokedAt: true } }),
    db.activity.findMany({ select: { id: true, projectId: true, title: true, status: true, startDate: true, endDate: true, budget: true, budgetSpent: true, createdById: true } }),
    db.project.findMany({ select: { id: true, name: true, status: true, startDate: true, endDate: true, beneficiaryTarget: true, createdById: true } }),
    db.beneficiary.groupBy({ by: ["projectId"], _count: { _all: true } }),
    db.milestone.findMany({ where: { completedAt: null }, select: { projectId: true } }),
  ]) as Array<Array<Record<string, any>>>;

  const beneficiaries: BeneficiaryInput[] = people.map((b) => ({ ...b, name: `${b.firstName} ${b.lastName}`.trim() }) as BeneficiaryInput);
  const attendances = attendanceRows as Array<{ beneficiaryId: number; activityId: number; present: boolean; createdAt: Date }>;

  const present = new Map<number, number>();
  const lastAt = new Map<number, Date>();
  for (const a of attendances) {
    if (a.present) present.set(a.activityId, (present.get(a.activityId) ?? 0) + 1);
    const prev = lastAt.get(a.activityId);
    if (!prev || a.createdAt > prev) lastAt.set(a.activityId, a.createdAt);
  }
  const activities: ActivityInput[] = activityRows.map((a) => ({
    id: a.id, projectId: a.projectId, title: a.title, status: a.status, startDate: a.startDate, endDate: a.endDate,
    budget: num(a.budget), budgetSpent: num(a.budgetSpent), createdById: a.createdById,
    presentCount: present.get(a.id) ?? 0, lastRecordedAt: lastAt.get(a.id) ?? null,
  }));

  const count = new Map(benefCounts.map((c) => [c.projectId as number, c._count._all as number]));
  const open = new Map<number, number>();
  for (const m of milestoneRows) open.set(m.projectId as number, (open.get(m.projectId as number) ?? 0) + 1);
  const projects: ProjectInput[] = projectRows.map((p) => ({ ...p, beneficiaries: count.get(p.id) ?? 0, milestonesOpen: open.get(p.id) ?? 0 }) as ProjectInput);

  // Les bénéficiaires n'ont pas de propriétaire : on notifie le créateur du projet.
  const creator = new Map(projects.map((p) => [p.id, p.createdById]));
  const fromBeneficiaries = beneficiaryAnomalies(beneficiaries, attendances as never, journeys as never, consents as never, now).map((r) => ({
    ...r,
    ownerIds: r.projectId !== null && typeof creator.get(r.projectId) === "number" ? [creator.get(r.projectId) as number] : [],
  }));

  return [...fromBeneficiaries, ...attendanceOnNonWorkingDay(activities), ...projectAnomalies(projects, activities, now)];
}

/** Toutes les anomalies complémentaires + les cas « note ». Mémorisé 60 s ; jamais d'exception. */
export async function computeExtra(force = false): Promise<ExtraResult> {
  if (!force && memo && Date.now() - memo.at < TTL_MS) return memo.value;
  const now = new Date();
  const empty: ExtraResult = { anomalies: [], noteCases: [], internships: new Map(), generatedAt: now.toISOString() };
  try {
    const decisions = await loadDecisions();
    const [intern, program] = await Promise.all([
      internAnomalies(now, decisions).catch((e) => { logger.warn("Anomalies stagiaires indisponibles", e); return { rows: [], cases: [], stages: [] as InternshipInput[] }; }),
      programAnomalies(now).catch((e) => { logger.warn("Anomalies bénéficiaires/projets indisponibles", e); return [] as RuleAnomaly[]; }),
    ]);
    const value: ExtraResult = { anomalies: [...intern.rows, ...program], noteCases: intern.cases, internships: new Map(intern.stages.map((s) => [s.id, s])), generatedAt: now.toISOString() };
    memo = { at: Date.now(), value };
    return value;
  } catch (error) {
    logger.warn("Anomalies complémentaires indisponibles", error);
    return empty;
  }
}

export async function extraAnomaliesSafe(): Promise<RuleAnomaly[]> {
  return (await computeExtra()).anomalies;
}
