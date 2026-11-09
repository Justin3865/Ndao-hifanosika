// src/utils/extraAnomalyRules.ts  (AJOUT — fonctions pures, sans base de données : testables seules)
//
// Anomalies complémentaires (stagiaires, bénéficiaires, projets/activités) et calendrier des jours non ouvrables.
// Principe : ce sont des AIDES À LA DÉCISION. Une présence un jour férié peut être légitime (mission de terrain
// autorisée) : elle est signalée, vérifiée par le tuteur / la RH, et seulement alors elle compte ou non pour la note.

export interface RuleAnomaly {
  key: string;
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  link: string;
  entityKind: string;
  entityId: number | null;
  projectId: number | null;
  ownerIds: number[];
}

const DAY_MS = 86_400_000;
const MG_OFFSET_MS = 3 * 3_600_000; // Madagascar : UTC+3 toute l'année

/* ------------------------------------------------------------------ calendrier */

/** Jour local « YYYY-MM-DD » (heure de Madagascar). */
export function dayKeyMg(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Date(d.getTime() + MG_OFFSET_MS).toISOString().slice(0, 10);
}

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

/** Jours fériés légaux usuels à Madagascar. À faire valider par la Direction ; compléter par NON_WORKING_DAYS_EXTRA. */
export function malagasyHolidays(year: number): Record<string, string> {
  const easter = easterSunday(year);
  const p = (m: number, d: number) => `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return {
    [p(1, 1)]: "Jour de l'An",
    [p(3, 29)]: "Commémoration de 1947",
    [iso(plusDays(easter, 1))]: "Lundi de Pâques",
    [p(5, 1)]: "Fête du Travail",
    [iso(plusDays(easter, 39))]: "Ascension",
    [iso(plusDays(easter, 50))]: "Lundi de Pentecôte",
    [p(6, 26)]: "Fête de l'Indépendance",
    [p(8, 15)]: "Assomption",
    [p(11, 1)]: "Toussaint",
    [p(12, 25)]: "Noël",
    [p(12, 30)]: "Fête de la République",
  };
}

/** Jours de fermeture propres à l'ONG : NON_WORKING_DAYS_EXTRA="2026-12-24,2026-12-31". */
export function extraClosureDays(raw: string | undefined = process.env.NON_WORKING_DAYS_EXTRA): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)),
  );
}

/** Motif pour lequel le jour (YYYY-MM-DD) n'est pas ouvrable, ou null s'il l'est. */
export function nonWorkingReason(day: string, extra: Set<string> = extraClosureDays()): string | null {
  const date = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const dow = date.getUTCDay();
  if (dow === 0) return "dimanche";
  if (dow === 6) return "samedi";
  const holiday = malagasyHolidays(date.getUTCFullYear())[day];
  if (holiday) return `jour férié (${holiday})`;
  if (extra.has(day)) return "jour de fermeture de l'ONG";
  return null;
}

/** Jours non ouvrables d'une année (pour affichage / calendrier). */
export function nonWorkingDaysOfYear(year: number, extra: Set<string> = extraClosureDays()): Array<{ day: string; reason: string }> {
  const out: Array<{ day: string; reason: string }> = [];
  for (let t = Date.UTC(year, 0, 1); t <= Date.UTC(year, 11, 31); t += DAY_MS) {
    const day = new Date(t).toISOString().slice(0, 10);
    const reason = nonWorkingReason(day, extra);
    if (reason) out.push({ day, reason });
  }
  return out;
}

/* ------------------------------------------------------------------ types d'entrée */

export interface PresenceInput {
  id: number;
  userId: number;
  day: string;
  internshipId: number | null;
  projectId: number | null;
  status: string;
  flags: string[];
  checkInAt: Date;
  checkOutAt: Date | null;
  inLatitude: number | null;
  inLongitude: number | null;
  inAccuracy: number | null;
  tasksDone: number;
  summary: string | null;
}

export interface InternshipInput {
  id: number;
  studentId: number;
  studentName: string;
  supervisorId: number | null;
  title: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
  projectId: number | null;
  durationMonths: number | null;
}

export interface TaskInput {
  id: number;
  internshipId: number;
  title: string;
  status: string;
  progress: number;
  report: string | null;
  evidenceName: string | null;
}

const owners = (...ids: Array<number | null | undefined>) =>
  Array.from(new Set(ids.filter((v): v is number => typeof v === "number")));

const NOTE_LINK = (internshipId: number | null) => (internshipId ? `/note-anomalies?internshipId=${internshipId}` : "/note-anomalies");

/* ------------------------------------------------------------------ stagiaires : présences */

/** Présence enregistrée un samedi, dimanche, jour férié ou jour de fermeture : aucune présence ne devrait exister. */
export function presenceOnNonWorkingDay(
  presences: PresenceInput[],
  internships: InternshipInput[],
  extra: Set<string> = extraClosureDays(),
): RuleAnomaly[] {
  const byId = new Map(internships.map((i) => [i.id, i]));
  const rows: RuleAnomaly[] = [];
  for (const p of presences) {
    const reason = nonWorkingReason(p.day, extra);
    if (!reason) continue;
    const stage = p.internshipId !== null ? byId.get(p.internshipId) : undefined;
    rows.push({
      key: `PRESENCE_NON_WORKING_DAY:${p.id}`,
      type: "PRESENCE_NON_WORKING_DAY",
      severity: "MEDIUM",
      title: `Présence un jour non ouvrable : ${stage?.studentName ?? `utilisateur #${p.userId}`} — ${p.day}`,
      detail: `Le ${p.day} est un ${reason}. Aucune présence ne devrait être enregistrée ce jour-là : à vérifier (mission autorisée ? erreur de pointage ?) avant qu'elle n'entre dans le calcul de la note.`,
      link: NOTE_LINK(p.internshipId),
      entityKind: "presence",
      entityId: p.id,
      projectId: p.projectId ?? stage?.projectId ?? null,
      ownerIds: owners(p.userId, stage?.supervisorId),
    });
  }
  return rows;
}

/** Trop de positions GPS hors zone / altitude incohérente : possible usurpation de position. */
export function gpsRepeatedSuspect(presences: PresenceInput[], internships: InternshipInput[], threshold = 3): RuleAnomaly[] {
  const byInternship = new Map<number, PresenceInput[]>();
  for (const p of presences) {
    if (p.internshipId === null) continue;
    if (!p.flags.some((f) => f === "OUT_OF_ZONE" || f === "ALTITUDE_MISMATCH")) continue;
    byInternship.set(p.internshipId, [...(byInternship.get(p.internshipId) ?? []), p]);
  }
  const rows: RuleAnomaly[] = [];
  for (const [id, list] of byInternship) {
    if (list.length < threshold) continue;
    const stage = internships.find((i) => i.id === id);
    if (!stage) continue;
    rows.push({
      key: `INTERN_GPS_REPEATED_SUSPECT:${id}`,
      type: "INTERN_GPS_REPEATED_SUSPECT",
      severity: "MEDIUM",
      title: `Positions GPS répétées hors zone : ${stage.studentName}`,
      detail: `${list.length} pointages hors zone ou avec altitude incohérente. À vérifier avec le stagiaire (zone de travail réelle, GPS désactivé ou simulé).`,
      link: NOTE_LINK(id),
      entityKind: "internship",
      entityId: id,
      projectId: stage.projectId,
      ownerIds: owners(stage.studentId, stage.supervisorId),
    });
  }
  return rows;
}

/** Même position, même précision à plusieurs reprises : valeur GPS copiée ou simulée. */
export function gpsIdentical(presences: PresenceInput[], internships: InternshipInput[], threshold = 5): RuleAnomaly[] {
  const groups = new Map<string, PresenceInput[]>();
  for (const p of presences) {
    if (p.internshipId === null || p.inLatitude === null || p.inLongitude === null || p.inAccuracy === null) continue;
    const key = `${p.internshipId}|${p.inLatitude.toFixed(6)}|${p.inLongitude.toFixed(6)}|${p.inAccuracy}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const rows: RuleAnomaly[] = [];
  const seen = new Set<number>();
  for (const [key, list] of groups) {
    const id = Number(key.split("|")[0]);
    if (list.length < threshold || seen.has(id)) continue;
    const stage = internships.find((i) => i.id === id);
    if (!stage) continue;
    seen.add(id);
    rows.push({
      key: `INTERN_GPS_IDENTICAL:${id}`,
      type: "INTERN_GPS_IDENTICAL",
      severity: "MEDIUM",
      title: `Coordonnées GPS identiques : ${stage.studentName}`,
      detail: `${list.length} arrivées avec exactement la même latitude, longitude et précision (6 décimales). Un GPS réel varie toujours légèrement : valeur probablement copiée ou simulée.`,
      link: NOTE_LINK(id),
      entityKind: "internship",
      entityId: id,
      projectId: stage.projectId,
      ownerIds: owners(stage.studentId, stage.supervisorId),
    });
  }
  return rows;
}

/** Présences très courtes répétées (pointage d'arrivée puis départ immédiat). */
export function shortPresenceRepeated(presences: PresenceInput[], internships: InternshipInput[], threshold = 3): RuleAnomaly[] {
  const counts = new Map<number, number>();
  for (const p of presences) {
    if (p.internshipId !== null && p.flags.includes("VERY_SHORT_PRESENCE")) counts.set(p.internshipId, (counts.get(p.internshipId) ?? 0) + 1);
  }
  const rows: RuleAnomaly[] = [];
  for (const [id, n] of counts) {
    if (n < threshold) continue;
    const stage = internships.find((i) => i.id === id);
    if (!stage) continue;
    rows.push({
      key: `INTERN_PRESENCE_SHORT_REPEATED:${id}`,
      type: "INTERN_PRESENCE_SHORT_REPEATED",
      severity: "LOW",
      title: `Présences très courtes répétées : ${stage.studentName}`,
      detail: `${n} journées avec une présence anormalement courte (arrivée puis départ presque immédiat).`,
      link: NOTE_LINK(id),
      entityKind: "internship",
      entityId: id,
      projectId: stage.projectId,
      ownerIds: owners(stage.studentId, stage.supervisorId),
    });
  }
  return rows;
}

/** Départs jamais pointés sur des jours passés. */
export function missingCheckoutRepeated(presences: PresenceInput[], internships: InternshipInput[], today: string, threshold = 3): RuleAnomaly[] {
  const counts = new Map<number, number>();
  for (const p of presences) {
    if (p.internshipId !== null && p.day < today && p.checkOutAt === null) counts.set(p.internshipId, (counts.get(p.internshipId) ?? 0) + 1);
  }
  const rows: RuleAnomaly[] = [];
  for (const [id, n] of counts) {
    if (n < threshold) continue;
    const stage = internships.find((i) => i.id === id);
    if (!stage) continue;
    rows.push({
      key: `INTERN_NO_CHECKOUT_REPEATED:${id}`,
      type: "INTERN_NO_CHECKOUT_REPEATED",
      severity: "LOW",
      title: `Départs non pointés : ${stage.studentName}`,
      detail: `${n} journées passées sans pointage de départ : la durée et le compte rendu de ces journées ne sont pas fiables.`,
      link: NOTE_LINK(id),
      entityKind: "internship",
      entityId: id,
      projectId: stage.projectId,
      ownerIds: owners(stage.studentId, stage.supervisorId),
    });
  }
  return rows;
}

/** Présence avant le début ou après la fin du stage. */
export function presenceOutsideStage(presences: PresenceInput[], internships: InternshipInput[]): RuleAnomaly[] {
  const rows: RuleAnomaly[] = [];
  for (const stage of internships) {
    const start = dayKeyMg(stage.startDate);
    const end = stage.endDate ? dayKeyMg(stage.endDate) : null;
    const outside = presences.filter((p) => p.internshipId === stage.id && (p.day < start || (end !== null && p.day > end)));
    if (!outside.length) continue;
    rows.push({
      key: `INTERN_PRESENCE_OUTSIDE_STAGE:${stage.id}`,
      type: "INTERN_PRESENCE_OUTSIDE_STAGE",
      severity: "MEDIUM",
      title: `Présences hors période de stage : ${stage.studentName}`,
      detail: `${outside.length} présence(s) en dehors du ${start} → ${end ?? "(sans fin)"}. Dates du stage ou pointages à corriger.`,
      link: NOTE_LINK(stage.id),
      entityKind: "internship",
      entityId: stage.id,
      projectId: stage.projectId,
      ownerIds: owners(stage.studentId, stage.supervisorId),
    });
  }
  return rows;
}

/** Journées terminées sans aucune tâche ni compte rendu. */
export function noActivityReport(presences: PresenceInput[], internships: InternshipInput[], threshold = 5): RuleAnomaly[] {
  const counts = new Map<number, number>();
  for (const p of presences) {
    if (p.internshipId !== null && p.checkOutAt !== null && p.tasksDone === 0 && !(p.summary ?? "").trim()) {
      counts.set(p.internshipId, (counts.get(p.internshipId) ?? 0) + 1);
    }
  }
  const rows: RuleAnomaly[] = [];
  for (const [id, n] of counts) {
    if (n < threshold) continue;
    const stage = internships.find((i) => i.id === id);
    if (!stage) continue;
    rows.push({
      key: `INTERN_NO_ACTIVITY_REPORT:${id}`,
      type: "INTERN_NO_ACTIVITY_REPORT",
      severity: "LOW",
      title: `Journées sans compte rendu : ${stage.studentName}`,
      detail: `${n} journées terminées sans tâche ni résumé : le tuteur ne peut pas évaluer le travail réel.`,
      link: NOTE_LINK(id),
      entityKind: "internship",
      entityId: id,
      projectId: stage.projectId,
      ownerIds: owners(stage.studentId, stage.supervisorId),
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ stagiaires : dossier */

export function internshipDatesInvalid(internships: InternshipInput[]): RuleAnomaly[] {
  const rows: RuleAnomaly[] = [];
  for (const s of internships) {
    if (s.endDate && s.endDate.getTime() < s.startDate.getTime()) {
      rows.push({
        key: `INTERN_DATES_INVALID:${s.id}`,
        type: "INTERN_DATES_INVALID",
        severity: "HIGH",
        title: `Dates de stage incohérentes : ${s.studentName}`,
        detail: `La date de fin (${dayKeyMg(s.endDate)}) précède la date de début (${dayKeyMg(s.startDate)}).`,
        link: `/internships/${s.id}`,
        entityKind: "internship",
        entityId: s.id,
        projectId: s.projectId,
        ownerIds: owners(s.studentId, s.supervisorId),
      });
    }
  }
  return rows;
}

/** Tâches terminées sans preuve ni compte rendu, ou statut / progression contradictoires. */
export function taskInconsistencies(tasks: TaskInput[], internships: InternshipInput[], threshold = 2): RuleAnomaly[] {
  const bad = new Map<number, number>();
  for (const t of tasks) {
    const contradictory =
      (t.status === "COMPLETED" && t.progress < 100) ||
      (t.progress >= 100 && t.status !== "COMPLETED" && t.status !== "CANCELLED") ||
      (t.status === "COMPLETED" && !(t.report ?? "").trim() && !t.evidenceName);
    if (contradictory) bad.set(t.internshipId, (bad.get(t.internshipId) ?? 0) + 1);
  }
  const rows: RuleAnomaly[] = [];
  for (const [id, n] of bad) {
    if (n < threshold) continue;
    const stage = internships.find((i) => i.id === id);
    if (!stage) continue;
    rows.push({
      key: `INTERN_TASK_INCONSISTENT:${id}`,
      type: "INTERN_TASK_INCONSISTENT",
      severity: "LOW",
      title: `Tâches incohérentes : ${stage.studentName}`,
      detail: `${n} tâche(s) terminée(s) sans rapport ni preuve, ou avec un statut qui contredit la progression.`,
      link: `/internships/${id}`,
      entityKind: "internship",
      entityId: id,
      projectId: stage.projectId,
      ownerIds: owners(stage.studentId, stage.supervisorId),
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ comportement atypique (statistique) */

export const BEHAVIOR_FEATURES = ["presence_days", "avg_minutes", "tasks_per_day", "flagged_ratio", "avg_checkin_hour"] as const;

export interface BehaviorRow {
  internshipId: number;
  values: Array<number | null>;
}

/** Variables de comportement par stagiaire sur les `days` derniers jours (null si moins de 5 présences). */
export function behaviorRows(presences: PresenceInput[], internships: InternshipInput[], todayKey: string, days = 45): BehaviorRow[] {
  const since = dayKeyMg(new Date(new Date(`${todayKey}T12:00:00Z`).getTime() - days * DAY_MS));
  const rows: BehaviorRow[] = [];
  for (const stage of internships) {
    const mine = presences.filter((p) => p.internshipId === stage.id && p.day >= since);
    if (mine.length < 5) continue;
    const closed = mine.filter((p) => p.checkOutAt);
    const minutes = closed.map((p) => ((p.checkOutAt as Date).getTime() - p.checkInAt.getTime()) / 60_000);
    const hours = mine.map((p) => {
      const mg = new Date(p.checkInAt.getTime() + MG_OFFSET_MS);
      return mg.getUTCHours() + mg.getUTCMinutes() / 60;
    });
    const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
    rows.push({
      internshipId: stage.id,
      values: [
        mine.length,
        avg(minutes),
        mine.reduce((s, p) => s + p.tasksDone, 0) / mine.length,
        mine.filter((p) => p.status === "SUSPECT").length / mine.length,
        avg(hours),
      ],
    });
  }
  return rows;
}

/** Repli local (sans service IA) : écart robuste à la médiane (MAD) ; renvoie les ids atypiques avec la variable en cause. */
export function robustOutliers(rows: BehaviorRow[], features: readonly string[] = BEHAVIOR_FEATURES, threshold = 3.5, minRows = 8) {
  if (rows.length < minRows) return [] as Array<{ internshipId: number; feature: string; z: number }>;
  const out: Array<{ internshipId: number; feature: string; z: number }> = [];
  features.forEach((feature, j) => {
    const col = rows.map((r) => r.values[j]).filter((v): v is number => v !== null);
    if (col.length < minRows) return;
    const sorted = [...col].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const mad = [...col.map((v) => Math.abs(v - med))].sort((a, b) => a - b)[Math.floor(col.length / 2)] * 1.4826;
    if (mad < 1e-9) return;
    for (const r of rows) {
      const v = r.values[j];
      if (v === null) continue;
      const z = (v - med) / mad;
      if (Math.abs(z) >= threshold) out.push({ internshipId: r.internshipId, feature, z: Math.round(z * 10) / 10 });
    }
  });
  return out;
}

/* ------------------------------------------------------------------ bénéficiaires */

export interface BeneficiaryInput {
  id: number;
  projectId: number;
  name: string;
  age: number | null;
  birthDate: Date | null;
  phone: string | null;
  cinNumber: string | null;
  householdSize: number | null;
  childrenUnder5: number | null;
  outOfSchoolChildren: number | null;
  latitude: number | null;
  longitude: number | null;
  homeLatitude: number | null;
  homeLongitude: number | null;
}

export interface AttendanceInput {
  beneficiaryId: number;
  activityId: number;
  present: boolean;
  createdAt: Date;
}

export interface JourneyInput {
  beneficiaryId: number;
  status: string;
  statusDate: Date | null;
}

export interface ConsentInput {
  beneficiaryId: number;
  revokedAt: Date | null;
}

/** Madagascar (marge incluse) : latitude -26,0 → -11,5 ; longitude 42,5 → 50,7. */
export function insideMadagascar(lat: number, lng: number): boolean {
  return lat >= -26.0 && lat <= -11.5 && lng >= 42.5 && lng <= 50.7;
}

export function ageFromBirth(birth: Date, now: Date): number {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

export function beneficiaryAnomalies(
  people: BeneficiaryInput[],
  attendances: AttendanceInput[],
  journeys: JourneyInput[],
  consents: ConsentInput[],
  now: Date,
  silentDays = 60,
): RuleAnomaly[] {
  const rows: RuleAnomaly[] = [];
  const add = (b: BeneficiaryInput, type: string, severity: RuleAnomaly["severity"], title: string, detail: string) =>
    rows.push({
      key: `${type}:${b.id}`,
      type,
      severity,
      title: `${title} : ${b.name}`,
      detail,
      link: `/beneficiaries/${b.id}`,
      entityKind: "beneficiary",
      entityId: b.id,
      projectId: b.projectId,
      ownerIds: [],
    });

  const cinCount = new Map<string, number>();
  const phoneCount = new Map<string, number>();
  for (const b of people) {
    const cin = (b.cinNumber ?? "").replace(/\s+/g, "");
    if (cin) cinCount.set(cin, (cinCount.get(cin) ?? 0) + 1);
    const phone = (b.phone ?? "").replace(/\D+/g, "");
    if (phone.length >= 9) phoneCount.set(phone, (phoneCount.get(phone) ?? 0) + 1);
  }
  const journeyOf = new Map(journeys.map((j) => [j.beneficiaryId, j]));
  const consentOf = new Map(consents.map((c) => [c.beneficiaryId, c]));
  const attByPerson = new Map<number, AttendanceInput[]>();
  for (const a of attendances) attByPerson.set(a.beneficiaryId, [...(attByPerson.get(a.beneficiaryId) ?? []), a]);

  for (const b of people) {
    const realAge = b.birthDate ? ageFromBirth(b.birthDate, now) : b.age;

    if (b.birthDate && b.age !== null && Math.abs(ageFromBirth(b.birthDate, now) - b.age) > 1) {
      add(b, "BENEFICIARY_AGE_MISMATCH", "LOW", "Âge incohérent", `Âge saisi ${b.age} ans, mais la date de naissance donne ${ageFromBirth(b.birthDate, now)} ans.`);
    }

    const size = b.householdSize;
    if (size !== null && (size <= 0 || (b.childrenUnder5 ?? 0) > size || (b.outOfSchoolChildren ?? 0) > size)) {
      add(b, "BENEFICIARY_HOUSEHOLD_INCONSISTENT", "LOW", "Composition du ménage incohérente", `Taille du ménage ${size}, enfants de moins de 5 ans ${b.childrenUnder5 ?? "?"}, enfants non scolarisés ${b.outOfSchoolChildren ?? "?"}.`);
    }

    for (const [lat, lng] of [[b.homeLatitude, b.homeLongitude], [b.latitude, b.longitude]] as Array<[number | null, number | null]>) {
      if (lat !== null && lng !== null && !insideMadagascar(lat, lng)) {
        add(b, "BENEFICIARY_GPS_INVALID", "MEDIUM", "Position hors de Madagascar", `Coordonnées (${lat.toFixed(4)}, ${lng.toFixed(4)}) en dehors du territoire : latitude/longitude inversées ou mal saisies.`);
        break;
      }
    }

    const cin = (b.cinNumber ?? "").replace(/\s+/g, "");
    if (cin && (cinCount.get(cin) ?? 0) > 1) {
      add(b, "BENEFICIARY_CIN_DUPLICATE", "HIGH", "CIN en double", `Le même numéro de CIN est enregistré pour ${cinCount.get(cin)} bénéficiaires : doublon ou erreur de saisie.`);
    }
    const phone = (b.phone ?? "").replace(/\D+/g, "");
    if (phone.length >= 9 && (phoneCount.get(phone) ?? 0) >= 3) {
      add(b, "BENEFICIARY_PHONE_SHARED", "LOW", "Téléphone partagé", `Le même numéro est utilisé par ${phoneCount.get(phone)} bénéficiaires.`);
    }

    if (realAge !== null && realAge < 18) {
      const consent = consentOf.get(b.id);
      if (!consent || consent.revokedAt) {
        add(b, "BENEFICIARY_MINOR_NO_CONSENT", "MEDIUM", "Mineur sans consentement", "Aucun consentement valide du tuteur légal pour ce bénéficiaire mineur (protection des données).");
      }
    }

    const journey = journeyOf.get(b.id);
    const present = (attByPerson.get(b.id) ?? []).filter((a) => a.present).sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());
    if (journey?.status === "DROPPED_OUT" && journey.statusDate && present.length && present[0].createdAt.getTime() > journey.statusDate.getTime() + DAY_MS) {
      add(b, "BENEFICIARY_PRESENT_AFTER_DROPOUT", "MEDIUM", "Présent après abandon déclaré", `Abandon déclaré le ${dayKeyMg(journey.statusDate)}, mais une présence est enregistrée le ${dayKeyMg(present[0].createdAt)}.`);
    }
    if ((!journey || journey.status === "ACTIVE") && present.length >= 3 && now.getTime() - present[0].createdAt.getTime() > silentDays * DAY_MS) {
      add(b, "BENEFICIARY_SILENT_DROPOUT", "MEDIUM", "Abandon probable non déclaré", `${present.length} présences puis plus aucune depuis ${Math.floor((now.getTime() - present[0].createdAt.getTime()) / DAY_MS)} jours alors que le parcours est actif.`);
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ activités (séances) et projets */

export interface ActivityInput {
  id: number;
  projectId: number;
  title: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  budgetSpent: number | null;
  createdById: number | null;
  presentCount: number;
  lastRecordedAt: Date | null;
}

export interface ProjectInput {
  id: number;
  name: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  beneficiaryTarget: number | null;
  createdById: number | null;
  beneficiaries: number;
  milestonesOpen: number;
}

/** Séance de bénéficiaires avec présents un jour non ouvrable (jour de la séance ou jour de saisie). */
export function attendanceOnNonWorkingDay(activities: ActivityInput[], extra: Set<string> = extraClosureDays()): RuleAnomaly[] {
  const rows: RuleAnomaly[] = [];
  for (const a of activities) {
    if (a.presentCount < 1) continue;
    const sessionDay = a.startDate && (!a.endDate || dayKeyMg(a.endDate) === dayKeyMg(a.startDate)) ? dayKeyMg(a.startDate) : null;
    const recordedDay = a.lastRecordedAt ? dayKeyMg(a.lastRecordedAt) : null;
    const reason = (sessionDay && nonWorkingReason(sessionDay, extra)) || (recordedDay && nonWorkingReason(recordedDay, extra)) || null;
    if (!reason) continue;
    const day = sessionDay && nonWorkingReason(sessionDay, extra) ? sessionDay : recordedDay;
    rows.push({
      key: `ATTENDANCE_NON_WORKING_DAY:${a.id}`,
      type: "ATTENDANCE_NON_WORKING_DAY",
      severity: "MEDIUM",
      title: `Présences un jour non ouvrable : ${a.title}`,
      detail: `${a.presentCount} bénéficiaire(s) pointé(s) présent(s) alors que le ${day} est un ${reason}. Séance réellement tenue ? Date de la séance ou pointage à corriger.`,
      link: `/presences`,
      entityKind: "activity",
      entityId: a.id,
      projectId: a.projectId,
      ownerIds: owners(a.createdById),
    });
  }
  return rows;
}

export function projectAnomalies(projects: ProjectInput[], activities: ActivityInput[], now: Date): RuleAnomaly[] {
  const rows: RuleAnomaly[] = [];
  const byProject = new Map(projects.map((p) => [p.id, p]));
  const push = (p: ProjectInput | undefined, projectId: number, type: string, severity: RuleAnomaly["severity"], title: string, detail: string, link: string, kind: string, entityId: number) =>
    rows.push({ key: `${type}:${entityId}`, type, severity, title, detail, link, entityKind: kind, entityId, projectId, ownerIds: owners(p?.createdById) });

  for (const p of projects) {
    if (p.startDate && p.endDate && p.endDate.getTime() < p.startDate.getTime()) {
      push(p, p.id, "PROJECT_DATES_INVALID", "HIGH", `Dates de projet incohérentes : ${p.name}`, `La date de fin (${dayKeyMg(p.endDate)}) précède la date de début (${dayKeyMg(p.startDate)}).`, `/projects/${p.id}`, "project", p.id);
    }
    const acts = activities.filter((a) => a.projectId === p.id && a.status !== "CANCELLED");
    if (p.status === "COMPLETED") {
      const open = acts.filter((a) => a.status !== "COMPLETED").length;
      if (open > 0 || p.milestonesOpen > 0) {
        push(p, p.id, "PROJECT_COMPLETED_INCOMPLETE", "MEDIUM", `Projet clôturé mais inachevé : ${p.name}`, `${open} activité(s) et ${p.milestonesOpen} jalon(s) non terminés alors que le projet est marqué terminé.`, `/projects/${p.id}`, "project", p.id);
      }
    }
    if (p.status === "ACTIVE" && p.startDate && (p.beneficiaryTarget ?? 0) > 0 && p.beneficiaries === 0 && now.getTime() - p.startDate.getTime() > 30 * DAY_MS) {
      push(p, p.id, "PROJECT_ACTIVE_NO_BENEFICIARIES", "MEDIUM", `Projet actif sans bénéficiaire : ${p.name}`, `Cible de ${p.beneficiaryTarget} bénéficiaires, aucun inscrit depuis plus de 30 jours.`, `/projects/${p.id}`, "project", p.id);
    }
  }
  for (const a of activities) {
    if (a.budget !== null && a.budgetSpent !== null && a.budgetSpent > a.budget) {
      push(byProject.get(a.projectId), a.projectId, "ACTIVITY_SPENT_OVER_BUDGET", "MEDIUM", `Dépenses supérieures au budget : ${a.title}`, `Dépensé ${a.budgetSpent} pour un budget de ${a.budget}.`, `/activities/${a.id}`, "activity", a.id);
    }
    const p = byProject.get(a.projectId);
    const before = !!(a.startDate && p?.startDate && a.startDate.getTime() < p.startDate.getTime());
    const after = !!(p?.endDate && ((a.endDate && a.endDate.getTime() > p.endDate.getTime()) || (a.startDate && a.startDate.getTime() > p.endDate.getTime())));
    if (p && (before || after)) {
      push(p, a.projectId, "ACTIVITY_OUT_OF_PROJECT_WINDOW", "LOW", `Activité hors période du projet : ${a.title}`, `Les dates de l'activité dépassent la période du projet « ${p.name} ».`, `/activities/${a.id}`, "activity", a.id);
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ lien avec la note */

/** Anomalies qui doivent être vérifiées par le tuteur / la RH AVANT d'entrer dans la note du stagiaire. */
export const NOTE_AFFECTING_TYPES = new Set([
  "PRESENCE_NON_WORKING_DAY",
  "INTERN_GPS_REPEATED_SUSPECT",
  "INTERN_GPS_IDENTICAL",
  "INTERN_PRESENCE_OUTSIDE_STAGE",
  "INTERN_PRESENCE_SHORT_REPEATED",
]);

export type CaseDecision = "PENDING" | "IN_REVIEW" | "JUSTIFIED" | "CONFIRMED";

export interface NotePolicy {
  perCase: number; // points retirés sur 20 par cas confirmé
  cap: number; // plafond total
  scale: number;
}

export function notePolicy(env: NodeJS.ProcessEnv = process.env): NotePolicy {
  const perCase = Number(env.NOTE_ANOMALY_PENALTY_PER_CASE);
  const cap = Number(env.NOTE_ANOMALY_PENALTY_CAP);
  return {
    perCase: Number.isFinite(perCase) && perCase >= 0 && env.NOTE_ANOMALY_PENALTY_PER_CASE ? perCase : 0.25,
    cap: Number.isFinite(cap) && cap >= 0 && env.NOTE_ANOMALY_PENALTY_CAP ? cap : 2,
    scale: 20,
  };
}

export function penaltyPoints(confirmed: number, policy: NotePolicy = notePolicy()): number {
  return Math.round(Math.min(policy.cap, Math.max(0, confirmed) * policy.perCase) * 100) / 100;
}

export interface GateCounts {
  pending: number;
  inReview: number;
  justified: number;
  confirmed: number;
}

export function countDecisions(decisions: CaseDecision[]): GateCounts {
  return {
    pending: decisions.filter((d) => d === "PENDING").length,
    inReview: decisions.filter((d) => d === "IN_REVIEW").length,
    justified: decisions.filter((d) => d === "JUSTIFIED").length,
    confirmed: decisions.filter((d) => d === "CONFIRMED").length,
  };
}

/** Recommandations affichées avec la note (français). `current` = note actuelle sur 20 ou null. */
export function noteRecommendations(counts: GateCounts, current: number | null, policy: NotePolicy = notePolicy()): string[] {
  const out: string[] = [];
  const open = counts.pending + counts.inReview;
  const total = open + counts.justified + counts.confirmed;
  if (total === 0) return ["Aucune anomalie de présence : la note peut être publiée telle quelle."];
  if (open > 0) out.push(`${open} cas à vérifier avant de publier la note : le tuteur ou la RH doit confirmer ou justifier chaque cas.`);
  if (counts.confirmed > 0) {
    const pts = penaltyPoints(counts.confirmed, policy);
    const after = current === null ? null : Math.max(0, Math.round((current - pts) * 100) / 100);
    out.push(
      `${counts.confirmed} cas confirmé(s) : proposition de retirer ${pts} pt sur ${policy.scale}` +
        (after !== null ? ` (note ${current} → ${after})` : "") +
        ". Proposition à valider par la RH ; elle n'est jamais appliquée automatiquement.",
    );
  }
  if (counts.justified > 0) out.push(`${counts.justified} cas justifié(s) : aucun impact sur la note.`);
  if (counts.confirmed >= 3) out.push("Trois cas confirmés ou plus : un entretien avec le stagiaire est recommandé avant la clôture du stage.");
  return out;
}
