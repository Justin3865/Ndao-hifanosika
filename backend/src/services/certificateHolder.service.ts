import { prisma } from "../config/database";
import { db } from "../utils/db";

/**
 * Données proposées automatiquement pour les certificats AUTRES que « stage » :
 *  - VOLUNTEER   : bénévolat   -> activités acceptées du compte (lieu, période, projets, département)
 *  - TRAINING    : formation   -> activités suivies (le choix d'une activité précise est possible)
 *  - STAFF       : mission / emploi à l'ONG -> fonction, département, lieu (activités créées / GPS), projets
 *  - BENEFICIARY : fiche du bénéficiaire -> projet, département, localité / zone
 *
 * Le certificat de STAGE n'est PAS concerné : il garde son service (certificateSuggestion.service.ts).
 * Rien n'est jamais écrit ici : on LIT seulement la base de données.
 */

export type HolderType = "VOLUNTEER" | "STAFF" | "TRAINING" | "BENEFICIARY";
export type HolderSource = "USER" | "BENEFICIARY";

export const HOLDER_TYPES: HolderType[] = ["VOLUNTEER", "STAFF", "TRAINING", "BENEFICIARY"];

/** Ville du siège : lieu par défaut quand aucune activité ni position GPS n'existe. */
const ORG_CITY = process.env.ORG_CITY || "Fianarantsoa";

/** Rôles qui sont des stagiaires : exclus de « Mission / emploi à l'ONG ». */
export const INTERN_ROLES = ["STAGIAIRE_L3", "STAGIAIRE_M2"];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrateur système",
  DIRECTION: "Direction",
  DSI: "Responsable des Systèmes d'Information",
  DAF: "Responsable Administratif et Financier",
  RH: "Responsable des Ressources Humaines",
  COMMUNICATION: "Chargé(e) de communication",
  COORDINATOR: "Coordinateur(trice)",
  TUTEUR_L3: "Tuteur (Licence 3)",
  TUTEUR_M2: "Tuteur (Master 2)",
};

export interface HolderActivity {
  id: number;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  projectId: number | null;
  projectName: string | null;
  departmentName: string | null;
}

export interface HolderSuggestion {
  type: HolderType;
  source: HolderSource;
  /** Intitulé proposé (vide pour un bénéficiaire : le certificat imprime le nom du projet) */
  title: string | null;
  theme: string | null;
  departmentName: string | null;
  missionLocation: string | null;
  locationSource: "ACTIVITES" | "GPS" | "SIEGE" | "FICHE" | null;
  startDate: string | null;
  endDate: string | null;
  projectIds: number[];
  /** Activités proposées (bénévolat / formation) : on peut en choisir une seule */
  activities: HolderActivity[];
  /** Phrase courte expliquant d'où viennent les informations */
  note: string;
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Valeur la plus fréquente d'une liste de textes. */
function mostFrequent(values: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>();
  values.forEach((v) => {
    const name = v?.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

const uniqueIds = (ids: Array<number | null | undefined>): number[] =>
  Array.from(new Set(ids.filter((v): v is number => typeof v === "number" && v > 0)));

/** Zone d'intervention la plus proche de la position GPS moyenne des missions terrain du compte. */
async function gpsLocationOf(userId: number): Promise<string | null> {
  const points = await prisma.missionPoint.findMany({
    where: { mission: { agentId: userId } },
    select: { latitude: true, longitude: true },
    take: 2000,
  });

  if (points.length === 0) return null;

  const lat = points.reduce((a, p) => a + p.latitude, 0) / points.length;
  const lng = points.reduce((a, p) => a + p.longitude, 0) / points.length;
  const zones = await prisma.zone.findMany({ where: { isActive: true }, select: { name: true, region: true, latitude: true, longitude: true } });

  let best: string | null = null;
  let bestKm = Infinity;

  for (const z of zones) {
    const km = distanceKm(lat, lng, z.latitude, z.longitude);
    if (km <= 50 && km < bestKm) {
      bestKm = km;
      best = z.region ? `${z.name} / ${z.region}` : z.name;
    }
  }

  return best;
}

/** Activités auxquelles le compte a participé (participation acceptée). */
async function participationsOf(userId: number): Promise<HolderActivity[]> {
  // ActivityParticipation n'a pas de relation Prisma : on lit les activités par leurs identifiants
  const rows = await prisma.activityParticipation.findMany({
    where: { userId, status: "ACCEPTED" },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { activityId: true },
  });

  const ids = rows.map((r) => r.activityId);
  if (ids.length === 0) return [];

  const activities = await prisma.activity.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      location: true,
      startDate: true,
      endDate: true,
      actualStartDate: true,
      actualEndDate: true,
      projectId: true,
      project: { select: { name: true, department: { select: { name: true } } } },
    },
  });

  // On garde l'ordre des participations (la plus récente d'abord)
  return ids
    .map((id) => activities.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({
      id: a.id,
      title: a.title,
      location: a.location?.trim() || null,
      startDate: iso(a.actualStartDate ?? a.startDate),
      endDate: iso(a.actualEndDate ?? a.endDate),
      projectId: a.projectId ?? null,
      projectName: a.project?.name ?? null,
      departmentName: a.project?.department?.name?.trim() || null,
    }));
}

/** Période couverte par des activités : plus ancien début -> dernière fin. */
function periodOf(activities: HolderActivity[]): { startDate: string | null; endDate: string | null } {
  const starts = activities.map((a) => a.startDate).filter((v): v is string => !!v).sort();
  const ends = activities.map((a) => a.endDate ?? a.startDate).filter((v): v is string => !!v).sort();

  return { startDate: starts[0] ?? null, endDate: ends[ends.length - 1] ?? null };
}

/** Bénévolat + formation : tout vient des activités acceptées du compte. */
async function fromActivities(type: "VOLUNTEER" | "TRAINING", userId: number): Promise<HolderSuggestion> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { department: { select: { name: true } } },
  });

  const activities = await participationsOf(userId);
  const period = periodOf(activities);
  const projectIds = uniqueIds(activities.map((a) => a.projectId));
  const projectNames = Array.from(new Set(activities.map((a) => a.projectName).filter((v): v is string => !!v)));

  const location = mostFrequent(activities.map((a) => a.location)) ?? (await gpsLocationOf(userId));
  const department = mostFrequent(activities.map((a) => a.departmentName)) ?? user?.department?.name?.trim() ?? null;

  const label = type === "VOLUNTEER" ? "Bénévolat" : "Formation";
  const first = activities[0];

  return {
    type,
    source: "USER",
    title: projectNames.length ? `${label} — ${projectNames.slice(0, 3).join(", ")}` : null,
    theme: first?.title ?? null,
    departmentName: department,
    missionLocation: location ?? ORG_CITY,
    locationSource: location ? "ACTIVITES" : "SIEGE",
    ...period,
    projectIds,
    activities,
    note: activities.length
      ? `${activities.length} activité(s) acceptée(s) trouvée(s) dans la base de données.`
      : "Aucune activité acceptée pour ce compte : complétez les champs à la main.",
  };
}

/** Mission / emploi à l'ONG : fonction, département, lieu et projets du compte. */
async function fromStaff(userId: number): Promise<HolderSuggestion> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      createdAt: true,
      department: { select: { name: true } },
    },
  });

  if (!user) throw new Error("USER_NOT_FOUND");

  const [created, projects] = await Promise.all([
    prisma.activity.findMany({ where: { createdById: userId }, select: { location: true, projectId: true } }),
    prisma.project.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, name: true, department: { select: { name: true } } },
    }),
  ]);

  const location = mostFrequent(created.map((a) => a.location)) ?? (await gpsLocationOf(userId));
  const role = ROLE_LABEL[String(user.role)] ?? String(user.role ?? "");

  return {
    type: "STAFF",
    source: "USER",
    title: role || null,
    theme: projects[0]?.name ?? null,
    departmentName: user.department?.name?.trim() || projects[0]?.department?.name?.trim() || null,
    missionLocation: location ?? ORG_CITY,
    locationSource: location ? "ACTIVITES" : "SIEGE",
    // Début = création du compte ; fin = aujourd'hui (modifiables avant la délivrance)
    startDate: iso(user.createdAt),
    endDate: iso(new Date()),
    projectIds: uniqueIds([...projects.map((p) => p.id), ...created.map((a) => a.projectId)]).slice(0, 3),
    activities: [],
    note: "Fonction, département, lieu et projets lus dans le compte. Vérifiez la période (début = création du compte).",
  };
}

/** Bénéficiaire : projet, département et localité lus dans sa fiche. */
async function fromBeneficiary(beneficiaryId: number): Promise<HolderSuggestion> {
  const b = await db.beneficiary.findUnique({
    where: { id: beneficiaryId },
    select: {
      projectId: true,
      locality: true,
      createdAt: true,
      zone: { select: { name: true } },
      project: { select: { name: true, endDate: true, department: { select: { name: true } } } },
    },
  });

  if (!b) throw new Error("BENEFICIARY_NOT_FOUND");

  const location = [b.locality, b.zone?.name].filter(Boolean).join(" / ") || null;
  const projectEnd: Date | null = b.project?.endDate ?? null;

  return {
    type: "BENEFICIARY",
    source: "BENEFICIARY",
    // Le certificat imprime « a bénéficié du projet « nom : slogan » » : pas d'intitulé libre
    title: null,
    theme: null,
    departmentName: b.project?.department?.name?.trim() || null,
    missionLocation: location,
    locationSource: location ? "FICHE" : null,
    startDate: iso(b.createdAt),
    endDate: projectEnd && projectEnd.getTime() <= Date.now() ? iso(projectEnd) : null,
    projectIds: b.projectId ? [b.projectId] : [],
    activities: [],
    note: "Projet, département et localité lus dans la fiche du bénéficiaire.",
  };
}

/**
 * Point d'entrée : proposition automatique pour un type de certificat (hors stage).
 * `id` = id du compte (USER) ou du bénéficiaire (BENEFICIARY).
 */
export async function getHolderSuggestion(type: HolderType, id: number): Promise<HolderSuggestion> {
  if (type === "BENEFICIARY") return fromBeneficiary(id);
  if (type === "STAFF") return fromStaff(id);

  return fromActivities(type, id);
}
