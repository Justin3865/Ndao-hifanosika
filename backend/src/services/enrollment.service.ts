import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { haversineKm } from "../ml/geo";
import { Household, retrainSoon, scoreHouseholdRows, scoreHouseholds } from "../ml/vulnerability";
import { emitToTracking } from "../realtime/socket";
import { db } from "../utils/db";
import { beneficiaryMatricule, ensureAgentMatricule, surveyCode } from "../utils/entityMatricule";
import { getActiveMission, validCoords } from "./field.service";

/* ===================================================================
 * SÉLECTION DES BÉNÉFICIAIRES À PARTIR DES ENQUÊTES DE MISSION
 *
 *  1. L'agent enquête un ménage NOUVEAU pendant sa mission -> « candidat ».
 *  2. L'IA (modèles de vulnérabilité) note chaque candidat de 0 à 100.
 *  3. Chaque projet a ses critères (EnrollmentRule) et son quota (Project.beneficiaryTarget).
 *  4. Les candidats qui remplissent les critères sont classés par score ; les N premiers
 *     (N = places restantes du quota) deviennent bénéficiaires, les autres sont en liste d'attente.
 *  5. La justification de chaque décision est conservée (decision) ; les actions sont journalisées.
 *
 * FICHIER NOUVEAU : aucune table ni fonction existante n'est modifiée.
 * =================================================================== */

export type CandidateStatus = "PENDING" | "WAITLIST" | "NOT_ELIGIBLE" | "ENROLLED";

export interface RuleInput {
  enabled?: boolean;
  autoEnroll?: boolean;
  /** score de départ (70 par défaut) */
  topScore?: number;
  /** score plancher (50 par défaut) */
  minScore?: number;
  gender?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  maxMonthlyIncome?: number | null;
  minHouseholdSize?: number | null;
  minChildrenUnder5?: number | null;
  requireDisability?: boolean;
  requireVulnerable?: boolean;
  localityContains?: string | null;
}

export interface Rule {
  projectId: number;
  enabled: boolean;
  autoEnroll: boolean;
  /** score de départ : on retient d'abord les ménages ayant au moins ce score */
  topScore: number;
  /** score plancher : le seuil descend par paliers de 5 jusqu'ici tant que le quota n'est pas atteint */
  minScore: number;
  gender: "FEMALE" | "MALE" | null;
  ageMin: number | null;
  ageMax: number | null;
  maxMonthlyIncome: number | null;
  minHouseholdSize: number | null;
  minChildrenUnder5: number | null;
  requireDisability: boolean;
  requireVulnerable: boolean;
  localityContains: string | null;
}

/** Candidat tel que lu en base (db = client non typé). */
interface Candidate {
  id: number;
  code: string | null;
  firstName: string;
  lastName: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  locality: string | null;
  adminCommune: string | null;
  adminFokontany: string | null;
  addressDetail: string | null;
  email: string | null;
  birthDate: Date | null;
  birthPlace: string | null;
  cinNumber: string | null;
  cinIssuedAt: Date | null;
  cinIssuedPlace: string | null;
  cinDuplicata: boolean;
  adminProvince: string | null;
  adminRegion: string | null;
  adminDistrict: string | null;
  zoneUnits: string | null;
  disabilityTypes: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  householdSize: number | null;
  monthlyIncome: number | null;
  childrenUnder5: number | null;
  outOfSchoolChildren: number | null;
  mealsPerDay: number | null;
  hasDisability: boolean;
  healthIssues: boolean | null;
  waterAccess: boolean | null;
  electricityAccess: boolean | null;
  housingType: string | null;
  vulnerable: boolean;
  notes: string | null;
  agentId: number;
  agentMatricule: string | null;
  missionId: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  projectId: number | null;
  status: CandidateStatus;
  score: number | null;
  scoreMethod: string | null;
  scoredAt: Date | null;
  decision: unknown;
  waitlistProjectId: number | null;
  waitlistRank: number | null;
  enrolledProjectId: number | null;
  beneficiaryId: number | null;
  enrolledAt: Date | null;
  createdAt: Date;
}

/** Projets sur lesquels un candidat peut être sélectionné (hors projets terminés / annulés). */
const OPEN_STATUSES = ["DRAFT", "ACTIVE", "SUSPENDED"];

/* ------------------------------ utilitaires ------------------------------ */

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const int = (v: unknown, max = 1000): number | null => {
  const n = num(v);
  return n === null || n < 0 || n > max ? null : Math.round(n);
};

const bool = (v: unknown): boolean | null => (v === true || v === "true" ? true : v === false || v === "false" ? false : null);

const text = (v: unknown, max = 120): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
};

export class EnrollmentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ------------------------------ matricule d'enquête ------------------------------ */

/** Pas des paliers de score (70, 65, 60 … puis plancher) */
const SCORE_STEP = 5;

/**
 * Un ménage enquêté en mission reçoit un matricule d'ENQUÊTE NH-AAAA-ENQ-xxxx (même suite que les autres enquêtes),
 * rattaché au matricule de l'agent (NH-AAAA-AGT-xxxx) qui l'a réalisée.
 * Le matricule bénéficiaire NH-AAAA-BEN-xxxxxxx n'est attribué qu'à la sélection (suite = dernier bénéficiaire + 1).
 */
const ENQ_RE = /^NH-\d{4}-ENQ-\d+$/;

function pastDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) || d.getTime() > Date.now() ? null : d;
}

/* ------------------------------ critères ------------------------------ */

export function defaultRule(projectId: number): Rule {
  return {
    projectId,
    enabled: true,
    autoEnroll: true,
    topScore: 70,
    minScore: 50,
    gender: null,
    ageMin: null,
    ageMax: null,
    maxMonthlyIncome: null,
    minHouseholdSize: null,
    minChildrenUnder5: null,
    requireDisability: false,
    requireVulnerable: false,
    localityContains: null,
  };
}

function toRule(row: Record<string, unknown>): Rule {
  const base = defaultRule(Number(row.projectId));
  const g = typeof row.gender === "string" ? row.gender.toUpperCase() : null;

  return {
    ...base,
    enabled: row.enabled !== false,
    autoEnroll: row.autoEnroll !== false,
    topScore: typeof row.topScore === "number" ? row.topScore : base.topScore,
    minScore: typeof row.minScore === "number" ? row.minScore : base.minScore,
    gender: g === "FEMALE" || g === "MALE" ? g : null,
    ageMin: num(row.ageMin),
    ageMax: num(row.ageMax),
    maxMonthlyIncome: num(row.maxMonthlyIncome),
    minHouseholdSize: num(row.minHouseholdSize),
    minChildrenUnder5: num(row.minChildrenUnder5),
    requireDisability: row.requireDisability === true,
    requireVulnerable: row.requireVulnerable === true,
    localityContains: text(row.localityContains, 80),
  };
}

export async function getRule(projectId: number): Promise<{ rule: Rule; configured: boolean }> {
  const row = await db.enrollmentRule.findUnique({ where: { projectId } });
  return row ? { rule: toRule(row), configured: true } : { rule: defaultRule(projectId), configured: false };
}

export async function saveRule(projectId: number, input: RuleInput, userId: number): Promise<Rule> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) throw new EnrollmentError(404, "Projet introuvable");

  const gender = typeof input.gender === "string" ? input.gender.toUpperCase() : null;
  const minScore = num(input.minScore);
  const topScore = num(input.topScore);

  if (minScore !== null && (minScore < 0 || minScore > 100)) throw new EnrollmentError(400, "Le score plancher doit être compris entre 0 et 100.");
  if (topScore !== null && (topScore < 0 || topScore > 100)) throw new EnrollmentError(400, "Le score de départ doit être compris entre 0 et 100.");

  const floorValue = minScore === null ? 50 : Math.round(minScore);
  const topValue = topScore === null ? 70 : Math.round(topScore);

  if (topValue < floorValue) throw new EnrollmentError(400, "Le score de départ doit être supérieur ou égal au score plancher.");

  const ageMin = int(input.ageMin, 120);
  const ageMax = int(input.ageMax, 120);

  if (ageMin !== null && ageMax !== null && ageMin > ageMax) throw new EnrollmentError(400, "L'âge minimum dépasse l'âge maximum.");

  const data = {
    enabled: input.enabled !== false,
    autoEnroll: input.autoEnroll !== false,
    topScore: topValue,
    minScore: floorValue,
    gender: gender === "FEMALE" || gender === "MALE" ? gender : null,
    ageMin,
    ageMax,
    maxMonthlyIncome: num(input.maxMonthlyIncome) !== null && Number(input.maxMonthlyIncome) >= 0 ? Number(input.maxMonthlyIncome) : null,
    minHouseholdSize: int(input.minHouseholdSize, 100),
    minChildrenUnder5: int(input.minChildrenUnder5, 50),
    requireDisability: input.requireDisability === true,
    requireVulnerable: input.requireVulnerable === true,
    localityContains: text(input.localityContains, 80),
    updatedById: userId,
  };

  const row = await db.enrollmentRule.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });

  return toRule(row);
}

/** Motifs pour lesquels le candidat ne remplit PAS les critères du projet (liste vide = éligible). */
export function failedCriteria(c: Pick<Candidate, "gender" | "age" | "monthlyIncome" | "householdSize" | "childrenUnder5" | "hasDisability" | "vulnerable" | "locality" | "adminCommune" | "adminFokontany">, score: number | null, rule: Rule): string[] {
  const reasons: string[] = [];

  if (score === null || score < rule.minScore) reasons.push(`Score ${score ?? "—"} inférieur au seuil minimal actuel ${rule.minScore}`);
  if (rule.gender && c.gender !== rule.gender) reasons.push(rule.gender === "FEMALE" ? "Projet réservé aux femmes" : "Projet réservé aux hommes");
  if (rule.ageMin !== null && (c.age === null || c.age < rule.ageMin)) reasons.push(`Âge inférieur à ${rule.ageMin} ans`);
  if (rule.ageMax !== null && (c.age === null || c.age > rule.ageMax)) reasons.push(`Âge supérieur à ${rule.ageMax} ans`);
  if (rule.maxMonthlyIncome !== null && (c.monthlyIncome === null || c.monthlyIncome > rule.maxMonthlyIncome)) reasons.push(`Revenu mensuel supérieur à ${rule.maxMonthlyIncome} Ar`);
  if (rule.minHouseholdSize !== null && (c.householdSize === null || c.householdSize < rule.minHouseholdSize)) reasons.push(`Ménage de moins de ${rule.minHouseholdSize} personnes`);
  if (rule.minChildrenUnder5 !== null && (c.childrenUnder5 === null || c.childrenUnder5 < rule.minChildrenUnder5)) reasons.push(`Moins de ${rule.minChildrenUnder5} enfant(s) de moins de 5 ans`);
  if (rule.requireDisability && !c.hasDisability) reasons.push("Aucune situation de handicap dans le ménage");
  if (rule.requireVulnerable && !c.vulnerable) reasons.push("Ménage non jugé vulnérable");

  if (rule.localityContains) {
    const wanted = rule.localityContains.toLowerCase();
    const where = [c.locality, c.adminCommune, c.adminFokontany].filter(Boolean).join(" ").toLowerCase();
    if (!where.includes(wanted)) reasons.push(`Hors de la zone « ${rule.localityContains} »`);
  }

  return reasons;
}

/* ------------------------------ score IA ------------------------------ */

async function loadZones(): Promise<Array<{ latitude: number; longitude: number; isHeadquarters?: boolean }>> {
  return (await db.zone.findMany({ where: { isActive: true } })) as Array<{ latitude: number; longitude: number; isHeadquarters?: boolean }>;
}

/** Ligne « ménage » (même structure que loadHouseholds) pour passer un candidat dans les modèles. */
function toHousehold(c: Candidate, zones: Awaited<ReturnType<typeof loadZones>>): Household {
  const hq = zones.find((z) => z.isHeadquarters) ?? null;
  const lat = c.latitude;
  const lng = c.longitude;

  const remoteKm = lat !== null && lng !== null && zones.length ? Math.min(...zones.map((z) => haversineKm(lat, lng, z.latitude, z.longitude))) : null;

  return {
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    firstName: c.firstName,
    lastName: c.lastName,
    age: c.age,
    locality: c.locality,
    zoneName: null,
    zoneId: null,
    projectId: c.projectId ?? 0,
    projectName: "",
    vulnerable: c.vulnerable,
    latitude: lat,
    longitude: lng,
    altitude: c.altitude,
    householdSize: c.householdSize,
    monthlyIncome: c.monthlyIncome,
    childrenUnder5: c.childrenUnder5,
    hasDisability: c.hasDisability,
    remoteKm,
    distanceToHqKm: lat !== null && lng !== null && hq ? Math.round(haversineKm(lat, lng, hq.latitude, hq.longitude) * 10) / 10 : null,
    surveyed: true,
    lastSurveyAt: (c.endedAt ?? c.createdAt).toISOString(),
    lastSurvey: {
      agentName: "",
      createdAt: (c.endedAt ?? c.createdAt).toISOString(),
      householdSize: c.householdSize,
      monthlyIncome: c.monthlyIncome,
      childrenUnder5: c.childrenUnder5,
      outOfSchoolChildren: c.outOfSchoolChildren,
      mealsPerDay: c.mealsPerDay,
      hasDisability: c.hasDisability,
      healthIssues: c.healthIssues,
      waterAccess: c.waterAccess,
      electricityAccess: c.electricityAccess,
      housingType: c.housingType,
      vulnerable: c.vulnerable,
      notes: c.notes,
    },
    // Variables propres au projet (suspendu, non lancé, jalons, évaluations) : neutres, le score mesure le BESOIN du ménage
    raw: [
      c.age,
      c.householdSize,
      c.monthlyIncome !== null ? Math.log1p(c.monthlyIncome) : null,
      c.childrenUnder5,
      c.hasDisability ? 1 : 0,
      c.altitude,
      remoteKm,
      c.gender === "FEMALE" ? 1 : 0,
      0,
      0,
      0,
      null,
      c.outOfSchoolChildren,
      c.mealsPerDay,
      c.healthIssues === null ? null : c.healthIssues ? 1 : 0,
      c.waterAccess === null ? null : c.waterAccess ? 0 : 1,
      c.electricityAccess === null ? null : c.electricityAccess ? 0 : 1,
    ],
  };
}

/** Calcule (et enregistre si le score a changé) le score IA de ces candidats. */
async function scoreCandidates(list: Candidate[], persist = true): Promise<void> {
  if (!list.length) return;

  const zones = await loadZones();
  const scored = await scoreHouseholdRows(list.map((c) => toHousehold(c, zones)));

  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const s = scored[i];
    const changed = c.score !== s.score || c.scoreMethod !== s.method;

    c.score = s.score;
    c.scoreMethod = s.method;
    c.scoredAt = new Date();

    if (persist && changed) {
      await db.enrollmentCandidate.update({ where: { id: c.id }, data: { score: s.score, scoreMethod: s.method, scoredAt: c.scoredAt } });
    }
  }
}

/* ------------------------------ enquête d'un nouveau ménage ------------------------------ */

export interface CandidateSurveyInput {
  firstName?: string;
  lastName?: string;
  gender?: string | null;
  age?: number | string | null;
  phone?: string | null;
  locality?: string | null;
  adminCommune?: string | null;
  adminFokontany?: string | null;
  addressDetail?: string | null;
  projectId?: number | string | null;
  startedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  householdSize?: number | null;
  monthlyIncome?: number | null;
  childrenUnder5?: number | null;
  outOfSchoolChildren?: number | null;
  mealsPerDay?: number | null;
  hasDisability?: boolean;
  healthIssues?: boolean | null;
  waterAccess?: boolean | null;
  electricityAccess?: boolean | null;
  housingType?: string | null;
  vulnerable?: boolean;
  notes?: string | null;
  /** Formulaire commun avec « Bénéficiaires » */
  matricule?: string | null;
  email?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  cinNumber?: string | null;
  cinIssuedAt?: string | null;
  cinIssuedPlace?: string | null;
  cinDuplicata?: boolean;
  adminProvince?: string | null;
  adminRegion?: string | null;
  adminDistrict?: string | null;
  zoneUnits?: string | null;
  disabilityTypes?: string | null;
}

/** Enquête d'un ménage qui n'est pas encore bénéficiaire (uniquement pendant une mission). */
export async function createCandidateSurvey(userId: number, body: CandidateSurveyInput) {
  const mission = await getActiveMission(userId);

  if (!mission) throw new EnrollmentError(409, "Démarrez votre mission avant de réaliser une enquête.");

  const lastName = text(body.lastName, 80);
  const firstName = text(body.firstName, 80) ?? "";

  if (!lastName) throw new EnrollmentError(400, "Le nom du chef de ménage est obligatoire.");

  const gender = typeof body.gender === "string" ? body.gender.toUpperCase() : null;
  const age = int(body.age, 120);

  let phone: string | null = null;
  if (body.phone !== undefined && body.phone !== null && String(body.phone).trim() !== "") {
    const digits = String(body.phone).replace(/\D/g, "");
    if (digits.length !== 10) throw new EnrollmentError(400, "Le téléphone doit comporter 10 chiffres (ex. 0340000000).");
    phone = digits;
  }

  let projectId: number | null = null;
  if (body.projectId !== undefined && body.projectId !== null && String(body.projectId) !== "") {
    projectId = Number(body.projectId);
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new EnrollmentError(404, "Projet visé introuvable");
  }

  const agent = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, latitude: true, longitude: true, altitude: true },
  });

  // Position du ménage = position GPS de l'agent au moment de l'enquête (comme pour l'enquête d'un bénéficiaire)
  const useBody = validCoords(body.latitude, body.longitude);
  const latitude = useBody ? Number(body.latitude) : agent?.latitude ?? null;
  const longitude = useBody ? Number(body.longitude) : agent?.longitude ?? null;
  const altitude = useBody ? num(body.altitude) ?? agent?.altitude ?? null : agent?.altitude ?? null;

  if (latitude === null || longitude === null) {
    throw new EnrollmentError(409, "Position GPS indisponible : attendez le signal GPS puis réessayez.");
  }

  const endedAt = new Date();
  let startedAt: Date | null = null;

  if (body.startedAt) {
    const parsed = new Date(body.startedAt);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() <= endedAt.getTime() && parsed.getTime() >= mission.startedAt.getTime()) startedAt = parsed;
  }

  // Matricule de l'agent (NH-AAAA-AGT-xxxx) : l'enquête y est rattachée
  const agentMat = await ensureAgentMatricule(userId);

  const income = num(body.monthlyIncome);

  // Identité (mêmes règles que la fiche bénéficiaire)
  const birthDate = pastDate(body.birthDate);
  const cinDigits = body.cinNumber ? String(body.cinNumber).replace(/\D/g, "") : "";
  if (cinDigits && cinDigits.length !== 12) throw new EnrollmentError(400, "Le numéro de CIN doit contenir exactement 12 chiffres.");
  const computedAge = birthDate ? Math.max(0, Math.floor((Date.now() - birthDate.getTime()) / 31_557_600_000)) : null;

  // Matricule d'enquête : celui proposé par le formulaire (modifiable, unique) sinon le suivant de la suite ENQ
  const givenMatricule = text(body.matricule, 40);

  if (givenMatricule) {
    if (!ENQ_RE.test(givenMatricule)) throw new EnrollmentError(400, "Le matricule d'une enquête doit avoir la forme NH-AAAA-ENQ-0001.");

    const [takenSurvey, takenCandidate] = await Promise.all([
      db.survey.findUnique({ where: { code: givenMatricule }, select: { id: true } }),
      db.enrollmentCandidate.findUnique({ where: { code: givenMatricule }, select: { id: true } }),
    ]);
    if (takenSurvey || takenCandidate) throw new EnrollmentError(409, "Ce matricule d'enquête existe déjà.");
  }

  const created: Candidate = await surveyCode.createWith(givenMatricule, (code) =>
    db.enrollmentCandidate.create({
      data: {
        code,
        firstName,
        lastName,
        gender: gender === "FEMALE" || gender === "MALE" || gender === "OTHER" ? gender : null,
        age: computedAge ?? age,
        phone,
        locality: text(body.locality, 120) ?? text(body.adminFokontany, 120) ?? text(body.adminCommune, 120),
        email: text(body.email, 120),
        birthDate,
        birthPlace: text(body.birthPlace, 120),
        cinNumber: cinDigits || null,
        cinIssuedAt: pastDate(body.cinIssuedAt),
        cinIssuedPlace: text(body.cinIssuedPlace, 120),
        cinDuplicata: body.cinDuplicata === true,
        adminProvince: text(body.adminProvince, 120),
        adminRegion: text(body.adminRegion, 120),
        adminDistrict: text(body.adminDistrict, 120),
        adminCommune: text(body.adminCommune, 120),
        adminFokontany: text(body.adminFokontany, 120),
        addressDetail: text(body.addressDetail, 300),
        zoneUnits: typeof body.zoneUnits === "string" && body.zoneUnits.length <= 20000 ? body.zoneUnits : null,
        disabilityTypes: body.hasDisability === true ? text(body.disabilityTypes, 120) : null,
        latitude,
        longitude,
        altitude,
        householdSize: int(body.householdSize, 100),
        monthlyIncome: income !== null && income >= 0 ? income : null,
        childrenUnder5: int(body.childrenUnder5, 50),
        outOfSchoolChildren: int(body.outOfSchoolChildren, 50),
        mealsPerDay: int(body.mealsPerDay, 10),
        hasDisability: body.hasDisability === true,
        healthIssues: bool(body.healthIssues),
        waterAccess: bool(body.waterAccess),
        electricityAccess: bool(body.electricityAccess),
        housingType: text(body.housingType, 60),
        vulnerable: body.vulnerable === true,
        notes: text(body.notes, 1000),
        agentId: userId,
        agentMatricule: agentMat,
        missionId: mission.id,
        startedAt,
        endedAt,
        projectId,
        status: "PENDING",
      },
    }),
  );

  await scoreCandidates([created]);

  emitToTracking("survey:new", {
    id: created.id,
    candidateId: created.id,
    beneficiaryName: `${created.firstName} ${created.lastName}`.trim(),
    agentId: userId,
    agentName: `${agent?.firstName ?? ""} ${agent?.lastName ?? ""}`.trim(),
  });

  // Sélection automatique : seuls les projets dont les critères sont en mode « automatique » sont traités
  let selection: SelectionSummary | null = null;
  try {
    selection = await runSelection({ projectId: projectId ?? undefined, force: false });
  } catch (error) {
    logger.error("Sélection automatique impossible après une enquête", error);
  }

  const fresh: Candidate | null = await db.enrollmentCandidate.findUnique({ where: { id: created.id } });

  return { candidate: fresh ?? created, selection };
}

/* ------------------------------ sélection par quota ------------------------------ */

export interface SelectionOptions {
  /** Un seul projet (sinon tous les projets ayant des critères actifs) */
  projectId?: number;
  /** true : calcule sans rien enregistrer */
  dryRun?: boolean;
  /** true : ignore l'option « automatique » du projet (bouton « Lancer la sélection ») */
  force?: boolean;
  /** Périmètre d'un coordinateur : projets autorisés (null = tous) */
  allowedProjects?: number[] | null;
}

export interface SelectionProjectResult {
  projectId: number;
  projectName: string;
  target: number | null;
  enrolled: number;
  remaining: number;
  autoEnroll: boolean;
  /** Candidats retenus (devenus bénéficiaires, ou à valider si dryRun / mode manuel) */
  selected: Array<{ candidateId: number; name: string; score: number; beneficiaryId: number | null }>;
  waitlisted: number;
  ineligible: number;
  /** Score de départ, plancher actuel et palier atteint pour remplir le quota */
  top: number;
  floor: number;
  threshold: number | null;
  /** Places du quota encore vides alors que le plancher est atteint (0 = quota rempli) */
  shortfall: number;
  canLower: boolean;
  skipped?: string;
}

export interface SelectionSummary {
  dryRun: boolean;
  projects: SelectionProjectResult[];
  enrolledNow: number;
}

let queue: Promise<unknown> = Promise.resolve();

/** Les sélections sont exécutées l'une après l'autre : deux enquêtes simultanées ne peuvent pas dépasser le quota. */
export function runSelection(options: SelectionOptions = {}): Promise<SelectionSummary> {
  const run = queue.then(() => doSelection(options));
  queue = run.catch(() => undefined);
  return run;
}

/** Paliers de score : du score de départ au plancher par pas de 5 (le plancher est toujours le dernier palier). */
export function scoreTiers(rule: Pick<Rule, "topScore" | "minScore">): number[] {
  const tiers: number[] = [];
  for (let t = rule.topScore; t > rule.minScore; t -= SCORE_STEP) tiers.push(t);
  tiers.push(rule.minScore);
  return tiers;
}

/** Premier palier (le plus exigeant) qui suffit à remplir les places restantes ; à défaut, le plancher. */
function tierReached(eligible: Candidate[], remaining: number, rule: Pick<Rule, "topScore" | "minScore">): number {
  const tiers = scoreTiers(rule);
  if (remaining <= 0) return tiers[0];

  for (const t of tiers) {
    if (eligible.filter((c) => (c.score ?? 0) >= t).length >= remaining) return t;
  }

  return tiers[tiers.length - 1];
}

const byPriority = (a: Candidate, b: Candidate): number =>
  (b.score ?? 0) - (a.score ?? 0) ||
  Number(b.vulnerable) - Number(a.vulnerable) ||
  (b.childrenUnder5 ?? 0) - (a.childrenUnder5 ?? 0) ||
  (a.endedAt ?? a.createdAt).getTime() - (b.endedAt ?? b.createdAt).getTime();

async function doSelection(options: SelectionOptions): Promise<SelectionSummary> {
  const dryRun = options.dryRun === true;
  const force = options.force === true;
  const allowed = options.allowedProjects ?? null;

  const ruleRows: Array<Record<string, unknown>> = await db.enrollmentRule.findMany({
    where: options.projectId ? { projectId: options.projectId } : {},
  });
  const explicit = new Map<number, Rule>(ruleRows.map((r) => [Number(r.projectId), toRule(r)]));

  const openProjects = await prisma.project.findMany({
    where: { status: { in: OPEN_STATUSES as never[] }, ...(options.projectId ? { id: options.projectId } : {}) },
    select: { id: true, name: true, beneficiaryTarget: true },
    orderBy: { id: "asc" },
  });

  // Critères enregistrés : on les suit (sauf sélection désactivée). Projet SANS critères : critères par défaut (score 70 puis paliers de 5 jusqu'à 50), dès qu'il a un quota.
  const projects = openProjects.filter((p: { id: number; beneficiaryTarget: number | null }) => {
    const r = explicit.get(p.id);
    return r ? r.enabled : (p.beneficiaryTarget ?? 0) > 0;
  });
  const rules = new Map<number, Rule>(projects.map((p: { id: number }) => [p.id, explicit.get(p.id) ?? defaultRule(p.id)] as [number, Rule]));

  const summary: SelectionSummary = { dryRun, projects: [], enrolledNow: 0 };

  // Candidats non encore bénéficiaires, notés à nouveau (les modèles ont pu être réentraînés)
  const pool: Candidate[] = await db.enrollmentCandidate.findMany({ where: { status: { not: "ENROLLED" } }, orderBy: { createdAt: "asc" } });
  await scoreCandidates(pool, !dryRun);

  const taken = new Set<number>();
  const settled = new Set<number>();

  for (const project of projects) {
    const rule = rules.get(project.id) as Rule;

    if (allowed && !allowed.includes(project.id)) continue;

    const target = project.beneficiaryTarget ?? null;
    const enrolled = await prisma.beneficiary.count({ where: { projectId: project.id } });
    const remaining = target !== null && target > 0 ? Math.max(0, target - enrolled) : 0;

    const result: SelectionProjectResult = {
      projectId: project.id,
      projectName: project.name,
      target,
      enrolled,
      remaining,
      autoEnroll: rule.autoEnroll,
      selected: [],
      waitlisted: 0,
      ineligible: 0,
      top: rule.topScore,
      floor: rule.minScore,
      threshold: null,
      shortfall: 0,
      canLower: rule.minScore > 0,
    };

    if (target === null || target <= 0) result.skipped = "Quota (bénéficiaires visés) non défini pour ce projet.";

    const eligible: Candidate[] = [];

    for (const c of pool) {
      if (taken.has(c.id)) continue;
      if (c.projectId !== null && c.projectId !== project.id) continue;

      const reasons = failedCriteria(c, c.score, rule);

      if (reasons.length === 0) {
        eligible.push(c);
        settled.add(c.id);
      } else {
        result.ineligible += 1;
        if (!dryRun && (c.projectId === project.id || c.waitlistProjectId === project.id)) {
          await db.enrollmentCandidate.update({
            where: { id: c.id },
            data: {
              status: c.projectId === project.id ? "NOT_ELIGIBLE" : "PENDING",
              waitlistProjectId: null,
              waitlistRank: null,
              decision: { at: new Date().toISOString(), projectId: project.id, projectName: project.name, score: c.score, reasons },
            },
          });
        }
      }
    }

    eligible.sort(byPriority);

    const automatic = (rule.autoEnroll || force) && !result.skipped;
    const picked = automatic ? eligible.slice(0, remaining) : [];
    const rest = eligible.slice(picked.length);

    // Paliers : on part du score le plus exigeant et on descend de 5 en 5 jusqu'au plancher tant que le quota n'est pas atteint
    result.threshold = tierReached(eligible, remaining, rule);

    for (const c of picked) {
      taken.add(c.id);
      let beneficiaryId: number | null = null;

      if (!dryRun) {
        const reason = { at: new Date().toISOString(), projectId: project.id, projectName: project.name, score: c.score, reasons: [] as string[], rank: result.selected.length + 1, quota: target, threshold: result.threshold, floor: rule.minScore };
        beneficiaryId = await enrollCandidate(c, project.id, reason);
        summary.enrolledNow += 1;
      }

      result.selected.push({ candidateId: c.id, name: `${c.firstName} ${c.lastName}`.trim(), score: c.score ?? 0, beneficiaryId });
    }

    // Reste de la liste : en attente (quota atteint, ou validation manuelle demandée)
    for (let i = 0; i < rest.length; i++) {
      const c = rest[i];
      result.waitlisted += 1;

      if (!dryRun) {
        await db.enrollmentCandidate.update({
          where: { id: c.id },
          data: {
            status: "WAITLIST",
            waitlistProjectId: project.id,
            waitlistRank: i + 1,
            decision: {
              at: new Date().toISOString(),
              projectId: project.id,
              projectName: project.name,
              score: c.score,
              reasons: [result.skipped ?? (!automatic ? "Éligible : en attente de validation (sélection manuelle)" : `Quota atteint (${enrolled + result.selected.length}/${target})`)],
              rank: i + 1,
            },
          },
        });
      }
    }

    if (!dryRun && picked.length) {
      result.enrolled = enrolled + picked.length;
      result.remaining = Math.max(0, remaining - picked.length);
    }

    // Quota non atteint alors que le plancher est atteint : alerte (ajouter des enquêtes, ou abaisser le seuil de 5 points)
    if (!result.skipped) {
      const covered = automatic ? picked.length : Math.min(eligible.length, remaining);
      result.shortfall = Math.max(0, remaining - covered);
    }

    summary.projects.push(result);
  }

  // Candidats qu'aucun projet n'a retenus ni mis en attente : « non éligible » (ou « en attente » si aucun critère n'existe)
  if (!dryRun && !options.projectId) {
    for (const c of pool) {
      if (taken.has(c.id) || settled.has(c.id) || c.status === "ENROLLED") continue;

      const candidateRules = [...rules.values()].filter((r) => (c.projectId === null || c.projectId === r.projectId) && projects.some((p: { id: number }) => p.id === r.projectId));

      if (candidateRules.length === 0) {
        if (c.status !== "PENDING") {
          await db.enrollmentCandidate.update({ where: { id: c.id }, data: { status: "PENDING", waitlistProjectId: null, waitlistRank: null } });
        }
        continue;
      }

      // Le projet dont les critères manquent le moins
      let best = { projectId: candidateRules[0].projectId, reasons: failedCriteria(c, c.score, candidateRules[0]) };
      for (const r of candidateRules.slice(1)) {
        const reasons = failedCriteria(c, c.score, r);
        if (reasons.length < best.reasons.length) best = { projectId: r.projectId, reasons };
      }

      const name = projects.find((p: { id: number }) => p.id === best.projectId)?.name ?? null;

      await db.enrollmentCandidate.update({
        where: { id: c.id },
        data: {
          status: "NOT_ELIGIBLE",
          waitlistProjectId: null,
          waitlistRank: null,
          decision: { at: new Date().toISOString(), projectId: best.projectId, projectName: name, score: c.score, reasons: best.reasons },
        },
      });
    }
  }

  if (summary.enrolledNow > 0) retrainSoon();

  return summary;
}

/** Candidat retenu -> bénéficiaire du projet (+ son enquête, qui rejoint le jeu de données d'entraînement). */
async function enrollCandidate(c: Candidate, projectId: number, decision: Record<string, unknown>): Promise<number> {
  const createBeneficiary = (matricule: string): Promise<{ id: number }> =>
    prisma.beneficiary.create({
      data: {
        projectId,
        firstName: c.firstName,
        lastName: c.lastName,
        gender: (c.gender as never) ?? undefined,
        age: c.age ?? undefined,
        phone: c.phone ?? undefined,
        vulnerable: c.vulnerable,
        locality: c.locality ?? undefined,
        matricule,
      },
      select: { id: true },
    });

  // Le ménage sélectionné reçoit son matricule bénéficiaire : dernier de la suite BEN + 1 (son matricule d'enquête ENQ reste celui de l'enquête)
  const beneficiary: { id: number } = await beneficiaryMatricule.createWith(null, createBeneficiary);

  // Champs du dossier non typés dans le client généré (même pratique que createSurvey)
  await db.beneficiary.update({
    where: { id: beneficiary.id },
    data: {
      homeLatitude: c.latitude,
      homeLongitude: c.longitude,
      homeAltitude: c.altitude,
      householdSize: c.householdSize,
      monthlyIncome: c.monthlyIncome,
      childrenUnder5: c.childrenUnder5,
      hasDisability: c.hasDisability,
      adminCommune: c.adminCommune,
      adminFokontany: c.adminFokontany,
      addressDetail: c.addressDetail,
      email: c.email,
      birthDate: c.birthDate,
      birthPlace: c.birthPlace,
      cinNumber: c.cinNumber,
      cinIssuedAt: c.cinIssuedAt,
      cinIssuedPlace: c.cinIssuedPlace,
      cinDuplicata: c.cinDuplicata,
      adminProvince: c.adminProvince,
      adminRegion: c.adminRegion,
      adminDistrict: c.adminDistrict,
      zoneUnits: c.zoneUnits,
      disabilityTypes: c.disabilityTypes,
      outOfSchoolChildren: c.outOfSchoolChildren,
      mealsPerDay: c.mealsPerDay,
      healthIssues: c.healthIssues,
      waterAccess: c.waterAccess,
      electricityAccess: c.electricityAccess,
      housingType: c.housingType,
      notes: c.notes,
    },
  });

  // Le candidat est marqué en premier : il ne pourra jamais être inscrit deux fois
  await db.enrollmentCandidate.update({
    where: { id: c.id },
    data: {
      status: "ENROLLED",
      enrolledProjectId: projectId,
      beneficiaryId: beneficiary.id,
      enrolledAt: new Date(),
      waitlistProjectId: null,
      waitlistRank: null,
      decision,
    },
  });

  try {
    // L'enquête recopiée garde le matricule d'enquête du ménage (ENQ) ; sinon un nouveau numéro de la suite ENQ
    const reuse = !!c.code && ENQ_RE.test(c.code) && !(await db.survey.findUnique({ where: { code: c.code }, select: { id: true } }));

    const createSurvey = (code: string) =>
      db.survey.create({
        data: {
          code,
          beneficiaryId: beneficiary.id,
          agentId: c.agentId,
          missionId: c.missionId,
          latitude: c.latitude,
          longitude: c.longitude,
          altitude: c.altitude,
          householdSize: c.householdSize,
          monthlyIncome: c.monthlyIncome,
          childrenUnder5: c.childrenUnder5,
          outOfSchoolChildren: c.outOfSchoolChildren,
          mealsPerDay: c.mealsPerDay,
          hasDisability: c.hasDisability,
          healthIssues: c.healthIssues,
          waterAccess: c.waterAccess,
          electricityAccess: c.electricityAccess,
          housingType: c.housingType,
          vulnerable: c.vulnerable,
          notes: c.notes,
          startedAt: c.startedAt,
          endedAt: c.endedAt,
        },
      });

    await (reuse ? createSurvey(c.code as string) : surveyCode.createWith(null, createSurvey));
  } catch (error) {
    logger.error(`Enquête du candidat #${c.id} non recopiée sur le bénéficiaire #${beneficiary.id}`, error);
  }

  logger.info(`Candidat #${c.id} -> bénéficiaire #${beneficiary.id} (projet #${projectId})`);
  return beneficiary.id;
}

/** Inscription manuelle d'un candidat (sécurité : ADMIN / DIRECTION), même si le quota est atteint. */
export async function enrollManually(candidateId: number, projectId: number, userId: number): Promise<number> {
  const [candidate, project]: [Candidate | null, { id: number; name: string } | null] = await Promise.all([
    db.enrollmentCandidate.findUnique({ where: { id: candidateId } }),
    prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } }),
  ]);

  if (!candidate) throw new EnrollmentError(404, "Candidat introuvable");
  if (!project) throw new EnrollmentError(404, "Projet introuvable");
  if (candidate.status === "ENROLLED") throw new EnrollmentError(409, "Ce candidat est déjà bénéficiaire.");

  return enrollCandidate(candidate, projectId, {
    at: new Date().toISOString(),
    projectId,
    projectName: project.name,
    score: candidate.score,
    reasons: ["Inscription manuelle"],
    manualBy: userId,
  }).then((id) => {
    retrainSoon();
    return id;
  });
}

/**
 * Quota non atteint alors que le plancher est atteint : abaisse le plancher de 5 points (ex. 50 -> 45) et relance la sélection du projet.
 * On peut le répéter tant que le quota n'est pas rempli.
 */
export async function lowerThreshold(projectId: number, userId: number): Promise<{ rule: Rule; selection: SelectionSummary }> {
  const { rule } = await getRule(projectId);

  if (rule.minScore <= 0) throw new EnrollmentError(409, "Le seuil est déjà à 0 : aucun ménage ne peut être retenu à un score plus bas.");

  const saved = await saveRule(projectId, { ...rule, minScore: Math.max(0, rule.minScore - SCORE_STEP) }, userId);
  const selection = await runSelection({ projectId, force: true });

  return { rule: saved, selection };
}

/** Prochain matricule d'enquête proposé au formulaire de mission + matricule de l'agent (l'enquête y est rattachée). */
export async function nextEnqueteInfo(userId: number): Promise<{ code: string; agentMatricule: string | null }> {
  const [code, agentMat] = await Promise.all([surveyCode.next(), ensureAgentMatricule(userId)]);
  return { code, agentMatricule: agentMat };
}

/* ------------------------------ lecture : vue d'ensemble par projet ------------------------------ */

export async function overview(allowed: number[] | null) {
  const rules: Array<Record<string, unknown>> = await db.enrollmentRule.findMany();
  const ruleOf = new Map<number, Rule>(rules.map((r) => [Number(r.projectId), toRule(r)]));

  const projects = await prisma.project.findMany({
    where: { status: { in: OPEN_STATUSES as never[] }, ...(allowed ? { id: { in: allowed } } : {}) },
    select: { id: true, name: true, code: true, status: true, beneficiaryTarget: true },
    orderBy: { name: "asc" },
  });

  const [counts, byStatus, waits, fromCandidates] = await Promise.all([
    prisma.beneficiary.groupBy({ by: ["projectId"], _count: { _all: true } }),
    db.enrollmentCandidate.groupBy({ by: ["status"], _count: { _all: true } }) as Promise<Array<{ status: string; _count: { _all: number } }>>,
    db.enrollmentCandidate.groupBy({ by: ["waitlistProjectId"], where: { status: "WAITLIST" }, _count: { _all: true } }) as Promise<Array<{ waitlistProjectId: number | null; _count: { _all: number } }>>,
    db.enrollmentCandidate.groupBy({ by: ["enrolledProjectId"], where: { status: "ENROLLED" }, _count: { _all: true } }) as Promise<Array<{ enrolledProjectId: number | null; _count: { _all: number } }>>,
  ]);

  const enrolledOf = new Map<number, number>(counts.map((c: { projectId: number; _count: { _all: number } }) => [c.projectId, c._count._all] as [number, number]));
  const waitOf = new Map<number | null, number>(waits.map((w) => [w.waitlistProjectId, w._count._all] as [number | null, number]));
  const fromOf = new Map<number | null, number>(fromCandidates.map((w) => [w.enrolledProjectId, w._count._all] as [number | null, number]));

  const statusCount = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;

  // Ménages non encore bénéficiaires : sert à annoncer combien tomberaient au prochain palier (plancher - 5)
  const pool: Candidate[] = await db.enrollmentCandidate.findMany({ where: { status: { not: "ENROLLED" }, score: { not: null } } });

  return {
    nextBeneficiaryMatricule: await beneficiaryMatricule.next(),
    totals: {
      surveys: byStatus.reduce((sum, x) => sum + x._count._all, 0),
      pending: statusCount("PENDING"),
      waitlist: statusCount("WAITLIST"),
      notEligible: statusCount("NOT_ELIGIBLE"),
      enrolled: statusCount("ENROLLED"),
    },
    projects: projects.map((p: { id: number; name: string; code: string; status: string; beneficiaryTarget: number | null }) => {
      const enrolled = enrolledOf.get(p.id) ?? 0;
      const target = p.beneficiaryTarget ?? null;
      const rule = ruleOf.get(p.id);
      const effective = rule ?? defaultRule(p.id);
      const remaining = target !== null && target > 0 ? Math.max(0, target - enrolled) : null;
      const active = effective.enabled && remaining !== null;
      const shortfall = active ? remaining ?? 0 : 0;
      const nextFloor = effective.minScore > 0 ? Math.max(0, effective.minScore - SCORE_STEP) : null;

      // Ménages qui remplissent tous les autres critères et dont le score est juste sous le plancher actuel
      const nextFloorCount =
        shortfall > 0 && nextFloor !== null
          ? pool.filter(
              (cd) =>
                (cd.projectId === null || cd.projectId === p.id) &&
                (cd.score ?? 0) >= (nextFloor as number) &&
                (cd.score ?? 0) < effective.minScore &&
                failedCriteria(cd, cd.score, { ...effective, minScore: 0 }).length === 0,
            ).length
          : 0;

      return {
        projectId: p.id,
        name: p.name,
        code: p.code,
        status: p.status,
        target,
        enrolled,
        remaining,
        configured: !!rule,
        rule: effective,
        shortfall,
        nextFloor,
        nextFloorCount,
        waitlist: waitOf.get(p.id) ?? 0,
        enrolledFromSurveys: fromOf.get(p.id) ?? 0,
      };
    }),
  };
}

/* ------------------------------ lecture : toutes les enquêtes de mission ------------------------------ */

export interface EnqueteRow {
  key: string;
  kind: "CANDIDATE" | "BENEFICIARY";
  id: number;
  code: string | null;
  name: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  locality: string | null;
  vulnerable: boolean;
  hasDisability: boolean;
  householdSize: number | null;
  monthlyIncome: number | null;
  childrenUnder5: number | null;
  /** Statut du candidat ; « ENROLLED » aussi pour une enquête faite sur un bénéficiaire existant */
  status: CandidateStatus;
  score: number | null;
  method: string | null;
  projectId: number | null;
  projectName: string | null;
  targetProjectName: string | null;
  waitlistRank: number | null;
  beneficiaryId: number | null;
  agentId: number;
  agentName: string;
  /** Matricule de l'agent qui a réalisé l'enquête (NH-AAAA-AGT-xxxx) */
  agentMatricule: string | null;
  /** Matricule bénéficiaire (NH-AAAA-BEN-xxxxxxx) : seulement une fois le ménage sélectionné */
  beneficiaryMatricule: string | null;
  missionId: number | null;
  missionCode: string | null;
  surveyedAt: string;
  decision: unknown;
}

export interface ListFilters {
  q?: string;
  status?: string;
  kind?: string;
  projectId?: number | null;
  /** Coordinateur : projets autorisés + son identifiant (ses propres enquêtes) */
  scope?: { allowed: number[]; userId: number } | null;
  limit?: number;
}

export async function listEnquetes(filters: ListFilters): Promise<{ total: number; rows: EnqueteRow[] }> {
  const q = (filters.q ?? "").trim();
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 300);
  const status = (filters.status ?? "").toUpperCase();
  const kind = (filters.kind ?? "").toUpperCase();
  const scope = filters.scope ?? null;

  const [users, projects, missions] = await Promise.all([
    prisma.user.findMany({ select: { id: true, firstName: true, lastName: true, agentMatricule: true } }),
    prisma.project.findMany({ select: { id: true, name: true } }),
    prisma.mission.findMany({ select: { id: true, code: true } }),
  ]);

  const agentName = new Map<number, string>(users.map((u: { id: number; firstName: string; lastName: string }) => [u.id, `${u.firstName} ${u.lastName}`.trim()] as [number, string]));
  const agentMat = new Map<number, string | null>(users.map((u: { id: number; agentMatricule: string | null }) => [u.id, u.agentMatricule ?? null] as [number, string | null]));
  const projectName = new Map<number, string>(projects.map((p: { id: number; name: string }) => [p.id, p.name] as [number, string]));
  const missionCode = new Map<number, string | null>(missions.map((m: { id: number; code: string | null }) => [m.id, m.code ?? null] as [number, string | null]));

  const rows: EnqueteRow[] = [];

  /* --- candidats --- */
  if (kind !== "BENEFICIARY" && (!status || ["PENDING", "WAITLIST", "NOT_ELIGIBLE", "ENROLLED"].includes(status))) {
    const and: Array<Record<string, unknown>> = [];

    if (status) and.push({ status });
    if (filters.projectId) and.push({ OR: [{ projectId: filters.projectId }, { enrolledProjectId: filters.projectId }, { waitlistProjectId: filters.projectId }] });
    if (scope) and.push({ OR: [{ agentId: scope.userId }, { projectId: { in: scope.allowed } }, { enrolledProjectId: { in: scope.allowed } }] });
    if (q) {
      and.push({
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
          { agentMatricule: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { locality: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const list: Candidate[] = await db.enrollmentCandidate.findMany({ where: and.length ? { AND: and } : undefined, orderBy: { createdAt: "desc" }, take: 300 });

    // Matricule bénéficiaire des ménages déjà sélectionnés
    const benefIds = list.filter((c) => c.beneficiaryId !== null).map((c) => c.beneficiaryId as number);
    const benefMat = new Map<number, string | null>(
      benefIds.length
        ? (await prisma.beneficiary.findMany({ where: { id: { in: benefIds } }, select: { id: true, matricule: true } })).map((b: { id: number; matricule: string | null }) => [b.id, b.matricule ?? null] as [number, string | null])
        : [],
    );

    for (const c of list) {
      const shownProject = c.enrolledProjectId ?? c.waitlistProjectId ?? c.projectId;

      rows.push({
        key: `c-${c.id}`,
        kind: "CANDIDATE",
        id: c.id,
        code: c.code,
        name: `${c.firstName} ${c.lastName}`.trim(),
        firstName: c.firstName,
        lastName: c.lastName,
        gender: c.gender,
        age: c.age,
        phone: c.phone,
        locality: c.locality,
        vulnerable: c.vulnerable,
        hasDisability: c.hasDisability,
        householdSize: c.householdSize,
        monthlyIncome: c.monthlyIncome,
        childrenUnder5: c.childrenUnder5,
        status: c.status,
        score: c.score,
        method: c.scoreMethod,
        projectId: shownProject,
        projectName: shownProject ? projectName.get(shownProject) ?? null : null,
        targetProjectName: c.projectId ? projectName.get(c.projectId) ?? null : null,
        waitlistRank: c.waitlistRank,
        beneficiaryId: c.beneficiaryId,
        agentId: c.agentId,
        agentName: agentName.get(c.agentId) ?? "Agent",
        agentMatricule: c.agentMatricule ?? agentMat.get(c.agentId) ?? null,
        beneficiaryMatricule: c.beneficiaryId ? benefMat.get(c.beneficiaryId) ?? null : null,
        missionId: c.missionId,
        missionCode: c.missionId ? missionCode.get(c.missionId) ?? null : null,
        surveyedAt: (c.endedAt ?? c.createdAt).toISOString(),
        decision: c.decision ?? null,
      });
    }
  }

  /* --- enquêtes réalisées sur des bénéficiaires déjà inscrits --- */
  if (kind !== "CANDIDATE" && (!status || status === "ENROLLED")) {
    const and: Array<Record<string, unknown>> = [];
    const benef: Record<string, unknown> = {};

    if (filters.projectId) benef.projectId = filters.projectId;
    if (scope) benef.projectId = filters.projectId && scope.allowed.includes(filters.projectId) ? filters.projectId : { in: scope.allowed };
    if (Object.keys(benef).length) and.push({ beneficiary: benef });

    if (q) {
      and.push({
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { beneficiary: { firstName: { contains: q, mode: "insensitive" } } },
          { beneficiary: { lastName: { contains: q, mode: "insensitive" } } },
          { beneficiary: { matricule: { contains: q, mode: "insensitive" } } },
          { beneficiary: { locality: { contains: q, mode: "insensitive" } } },
        ],
      });
    }

    const surveys: Array<Record<string, any>> = await db.survey.findMany({
      where: and.length ? { AND: and } : undefined,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { beneficiary: { select: { id: true, firstName: true, lastName: true, gender: true, age: true, phone: true, locality: true, projectId: true, matricule: true } } },
    });

    // Une enquête recopiée à l'inscription d'un candidat est déjà listée comme candidat : on ne la double pas
    const enrolledIds = new Set<number>(
      (await db.enrollmentCandidate.findMany({ where: { beneficiaryId: { not: null } }, select: { beneficiaryId: true } })).map((r: { beneficiaryId: number }) => r.beneficiaryId),
    );

    let scoreOf = new Map<number, { score: number; method: string }>();
    const needScore = surveys.some((s) => s.beneficiary && !enrolledIds.has(s.beneficiary.id));

    if (needScore) {
      try {
        scoreOf = new Map((await scoreHouseholds()).map((h) => [h.id, { score: h.score, method: h.method }]));
      } catch {
        scoreOf = new Map();
      }
    }

    for (const s of surveys) {
      const b = s.beneficiary;
      if (!b || enrolledIds.has(b.id)) continue;

      rows.push({
        key: `s-${s.id}`,
        kind: "BENEFICIARY",
        id: b.id,
        code: s.code ?? null,
        name: `${b.firstName} ${b.lastName}`.trim(),
        firstName: b.firstName,
        lastName: b.lastName,
        gender: b.gender ?? null,
        age: b.age ?? null,
        phone: b.phone ?? null,
        locality: b.locality ?? null,
        vulnerable: s.vulnerable === true,
        hasDisability: s.hasDisability === true,
        householdSize: s.householdSize ?? null,
        monthlyIncome: s.monthlyIncome ?? null,
        childrenUnder5: s.childrenUnder5 ?? null,
        status: "ENROLLED",
        score: scoreOf.get(b.id)?.score ?? null,
        method: scoreOf.get(b.id)?.method ?? null,
        projectId: b.projectId,
        projectName: projectName.get(b.projectId) ?? null,
        targetProjectName: null,
        waitlistRank: null,
        beneficiaryId: b.id,
        agentId: s.agentId,
        agentName: agentName.get(s.agentId) ?? "Agent",
        agentMatricule: agentMat.get(s.agentId) ?? null,
        beneficiaryMatricule: b.matricule ?? null,
        missionId: s.missionId ?? null,
        missionCode: s.missionId ? missionCode.get(s.missionId) ?? null : null,
        surveyedAt: new Date(s.endedAt ?? s.createdAt).toISOString(),
        decision: null,
      });
    }
  }

  rows.sort((a, b) => b.surveyedAt.localeCompare(a.surveyedAt));

  return { total: rows.length, rows: rows.slice(0, limit) };
}
