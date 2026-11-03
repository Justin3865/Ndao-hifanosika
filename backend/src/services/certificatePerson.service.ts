import { prisma } from "../config/database";
import { mentionFromScore20, type Mention } from "../utils/mention";

/**
 * Données proposées automatiquement pour les certificats « personne » (hors stage et bénéficiaire) :
 *
 *   STAFF      Mission / emploi à l'ONG : activités créées + activités où la personne est acceptée,
 *              missions terrain GPS, projets concernés.
 *   VOLUNTEER  Bénévolat : participations ACCEPTÉES aux activités (présence, rapports, notes).
 *   TRAINING   Formation suivie : participations ACCEPTÉES aux activités de type formation / atelier.
 *
 * Tout est lu dans PostgreSQL (Activity, ActivityParticipation, Mission, Project) — le même
 * socle que le Suivi & Évaluation, l'Évaluation finale et les Analyses IA. Rien n'est écrit ici.
 */

export type PersonCertificateType = "STAFF" | "VOLUNTEER" | "TRAINING";

export const PERSON_TYPES: PersonCertificateType[] = ["STAFF", "VOLUNTEER", "TRAINING"];

export const isPersonType = (value: string): value is PersonCertificateType => (PERSON_TYPES as string[]).includes(value);

/** Une activité est une « formation » si son titre ou sa description contient l'un de ces mots. */
const TRAINING_PATTERN = /(formation|atelier|s[ée]minaire|training|workshop|renforcement|capacit|fampiofanana|fiofanana)/i;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  DIRECTION: "Direction",
  DSI: "DSI",
  DAF: "DAF",
  RH: "Ressources Humaines",
  COMMUNICATION: "Communication",
  COORDINATOR: "Coordinateur",
  TUTEUR_L3: "Tuteur L3",
  TUTEUR_M2: "Tuteur M2",
  STAGIAIRE_L3: "Stagiaire L3",
  STAGIAIRE_M2: "Stagiaire M2",
};

/** Ville du siège : lieu par défaut quand aucune activité n'a de lieu. */
const ORG_CITY = process.env.ORG_CITY || "Fianarantsoa";

export interface PersonCertificateSuggestion {
  type: PersonCertificateType;
  /** true si la base contient au moins une trace (activité, participation ou mission) */
  hasData: boolean;
  title: string;
  theme: string | null;
  departmentName: string | null;
  missionLocation: string | null;
  locationSource: "ACTIVITES" | "SIEGE" | null;
  /** AAAA-MM-JJ (valeur d'un <input type="date">) */
  startDate: string | null;
  endDate: string | null;
  projectIds: number[];
  projects: Array<{ id: number; name: string }>;
  /** moyenne des notes /100 reçues sur les activités, ramenée sur 20 (information, jamais imposée) */
  scoreOn20: number | null;
  mention: Mention | null;
  breakdown: {
    activities: number;
    accepted: number;
    attended: number;
    reports: number;
    ratings: number;
    missions: number;
    distanceKm: number;
    createdActivities: number;
  };
}

const day = (date: Date | null | undefined): string | null => (date ? date.toISOString().slice(0, 10) : null);
const round1 = (n: number) => Math.round(n * 10) / 10;

interface ActivityLite {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  location: string | null;
  start: Date | null;
  end: Date | null;
}

export async function getPersonCertificateSuggestion(userId: number, type: PersonCertificateType): Promise<PersonCertificateSuggestion | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, createdAt: true, department: { select: { name: true } } },
  });
  if (!user) return null;

  const [participations, created, missions] = await Promise.all([
    prisma.activityParticipation.findMany({
      where: { userId, status: "ACCEPTED" },
      select: { activityId: true, checkedInAt: true, report: true, rating: true },
    }),
    prisma.activity.findMany({ where: { createdById: userId }, select: { id: true } }),
    prisma.mission.findMany({ where: { agentId: userId }, select: { startedAt: true, endedAt: true, distanceKm: true } }),
  ]);

  const participationByActivity = new Map(participations.map((p) => [p.activityId, p]));

  // STAFF : activités créées + activités suivies ; VOLUNTEER / TRAINING : participations acceptées seulement
  const activityIds = new Set<number>(participations.map((p) => p.activityId));
  if (type === "STAFF") created.forEach((a) => activityIds.add(a.id));

  const rows = activityIds.size
    ? await prisma.activity.findMany({
        where: { id: { in: [...activityIds] }, status: { not: "CANCELLED" } },
        select: { id: true, projectId: true, title: true, description: true, location: true, startDate: true, endDate: true, actualStartDate: true, actualEndDate: true },
      })
    : [];

  let activities: ActivityLite[] = rows.map((a) => ({
    id: a.id,
    projectId: a.projectId,
    title: a.title,
    description: a.description,
    location: a.location,
    start: a.actualStartDate ?? a.startDate,
    end: a.actualEndDate ?? a.endDate,
  }));

  if (type === "TRAINING") activities = activities.filter((a) => TRAINING_PATTERN.test(`${a.title} ${a.description ?? ""}`));

  const kept = new Set(activities.map((a) => a.id));
  const mine = participations.filter((p) => kept.has(p.activityId));

  // --- période : première → dernière trace, sans dépasser aujourd'hui ---
  const now = new Date();
  const starts: Date[] = [];
  const ends: Date[] = [];

  activities.forEach((a) => {
    if (a.start) starts.push(a.start);
    const end = a.end ?? a.start;
    if (end) ends.push(end);
  });

  if (type === "STAFF") {
    missions.forEach((m) => {
      starts.push(m.startedAt);
      ends.push(m.endedAt ?? m.startedAt);
    });
  }

  const earliest = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null;
  const latestRaw = ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null;
  const latest = latestRaw && latestRaw.getTime() > now.getTime() ? now : latestRaw;

  // --- projets concernés (ordre : le plus fréquent d'abord) ---
  const projectCount = new Map<number, number>();
  activities.forEach((a) => projectCount.set(a.projectId, (projectCount.get(a.projectId) ?? 0) + 1));
  const projectIds = [...projectCount.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

  const projectRows = projectIds.length
    ? await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true, department: { select: { name: true } } } })
    : [];
  const projects = projectIds.map((id) => projectRows.find((p) => p.id === id)).filter((p): p is (typeof projectRows)[number] => !!p);

  // --- lieu : le plus fréquent parmi les activités, sinon la ville du siège ---
  const locations = new Map<string, number>();
  activities.forEach((a) => {
    const name = a.location?.trim();
    if (name) locations.set(name, (locations.get(name) ?? 0) + 1);
  });
  const bestLocation = [...locations.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // --- notes reçues (/100) → /20 ---
  const rated = mine.filter((p) => typeof p.rating === "number") as Array<{ rating: number }>;
  const scoreOn20 = rated.length ? round1((rated.reduce((sum, p) => sum + p.rating, 0) / rated.length / 100) * 20) : null;

  const hasData = activities.length > 0 || (type === "STAFF" && missions.length > 0);

  // --- intitulé + thème ---
  const projectNames = projects.map((p) => p.name);
  const joined = projectNames.slice(0, 3).join(", ");
  const more = projectNames.length > 3 ? ` (+${projectNames.length - 3})` : "";
  const sortedByDate = [...activities].sort((a, b) => (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0));

  let title = "";
  let theme: string | null = null;

  if (type === "STAFF") {
    title = `${ROLE_LABELS[user.role] ?? "Collaborateur"}${joined ? ` — ${joined}${more}` : " à Ndao Hifanosika"}`;
    theme = sortedByDate.length ? sortedByDate.slice(0, 3).map((a) => a.title).join(" ; ") : null;
  } else if (type === "VOLUNTEER") {
    title = `Bénévole${joined ? ` — ${joined}${more}` : " à Ndao Hifanosika"}`;
    theme = sortedByDate.length ? sortedByDate.slice(0, 3).map((a) => a.title).join(" ; ") : null;
  } else {
    title = sortedByDate.length === 1 ? `Formation : ${sortedByDate[0].title}` : sortedByDate.length > 1 ? `Formations suivies — ${joined || "Ndao Hifanosika"}${more}` : "Formation suivie";
    theme = sortedByDate.length ? sortedByDate.slice(0, 3).map((a) => a.title).join(" ; ") : null;
  }

  return {
    type,
    hasData,
    title,
    theme,
    departmentName: user.department?.name ?? projects.find((p) => p.department?.name)?.department?.name ?? null,
    missionLocation: bestLocation ?? (hasData ? ORG_CITY : null),
    locationSource: bestLocation ? "ACTIVITES" : hasData ? "SIEGE" : null,
    startDate: day(earliest),
    endDate: day(latest),
    projectIds,
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
    scoreOn20,
    mention: mentionFromScore20(scoreOn20),
    breakdown: {
      activities: activities.length,
      accepted: mine.length,
      attended: mine.filter((p) => p.checkedInAt).length,
      reports: mine.filter((p) => p.report && p.report.trim()).length,
      ratings: rated.length,
      missions: type === "STAFF" ? missions.length : 0,
      distanceKm: type === "STAFF" ? round1(missions.reduce((sum, m) => sum + (m.distanceKm ?? 0), 0)) : 0,
      createdActivities: type === "STAFF" ? created.filter((a) => kept.has(a.id)).length : 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Liste des personnes concernées (pour choisir dans une liste au lieu de chercher un nom)
// ---------------------------------------------------------------------------

export interface PersonCandidateStat {
  userId: number;
  /** nombre d'activités (+ missions pour STAFF) retenues pour ce type */
  count: number;
  /** AAAA-MM-JJ de la dernière trace */
  last: string | null;
  label: string;
}

/**
 * VOLUNTEER : comptes ayant au moins une participation ACCEPTÉE à une activité.
 * TRAINING  : comptes ayant participé (ACCEPTÉ) à une activité de type formation / atelier.
 * STAFF     : comptes du personnel (hors stagiaires) actifs, ou ayant créé / suivi une activité ou une mission.
 */
export async function listPersonCandidates(type: PersonCertificateType): Promise<PersonCandidateStat[]> {
  const stats = new Map<number, { count: number; last: Date | null; missions: number }>();
  const touch = (userId: number, date: Date | null, kind: "activity" | "mission" = "activity") => {
    const row = stats.get(userId) ?? { count: 0, last: null, missions: 0 };
    if (kind === "mission") row.missions += 1;
    else row.count += 1;
    if (date && (!row.last || date.getTime() > row.last.getTime())) row.last = date;
    stats.set(userId, row);
  };

  const participations = await prisma.activityParticipation.findMany({
    where: { status: "ACCEPTED" },
    select: { userId: true, activityId: true },
  });

  const activityIds = [...new Set(participations.map((p) => p.activityId))];
  const activities = activityIds.length
    ? await prisma.activity.findMany({
        where: { id: { in: activityIds }, status: { not: "CANCELLED" } },
        select: { id: true, title: true, description: true, startDate: true, endDate: true, actualStartDate: true, actualEndDate: true },
      })
    : [];

  const byId = new Map(activities.map((a) => [a.id, a]));
  const dateOf = (a: { startDate?: Date | null; endDate?: Date | null; actualStartDate?: Date | null; actualEndDate?: Date | null }): Date | null =>
    a.actualEndDate ?? a.endDate ?? a.actualStartDate ?? a.startDate ?? null;

  for (const p of participations) {
    const activity = byId.get(p.activityId);
    if (!activity) continue;
    if (type === "TRAINING" && !TRAINING_PATTERN.test(`${activity.title} ${activity.description ?? ""}`)) continue;
    touch(p.userId, dateOf(activity));
  }

  if (type === "STAFF") {
    const [created, missions, staff] = await Promise.all([
      prisma.activity.findMany({ where: { status: { not: "CANCELLED" } }, select: { createdById: true, startDate: true, endDate: true, actualEndDate: true, actualStartDate: true } }),
      prisma.mission.findMany({ select: { agentId: true, startedAt: true, endedAt: true } }),
      prisma.user.findMany({ where: { status: "ACTIVE", NOT: { role: { in: ["STAGIAIRE_L3", "STAGIAIRE_M2"] } } }, select: { id: true } }),
    ]);

    created.forEach((a) => touch(a.createdById, dateOf(a)));
    missions.forEach((m) => touch(m.agentId, m.endedAt ?? m.startedAt, "mission"));
    staff.forEach((u) => { if (!stats.has(u.id)) stats.set(u.id, { count: 0, last: null, missions: 0 }); });
  }

  const label = (row: { count: number; missions: number }) => {
    if (type === "STAFF") {
      const parts = [row.count ? `${row.count} activité(s)` : "", row.missions ? `${row.missions} mission(s)` : ""].filter(Boolean);
      return parts.length ? parts.join(" · ") : "Personnel (aucune activité enregistrée)";
    }
    return type === "TRAINING" ? `${row.count} formation(s)` : `${row.count} activité(s)`;
  };

  return [...stats.entries()]
    .map(([userId, row]) => ({ userId, count: row.count + row.missions, last: day(row.last), label: label(row) }))
    .sort((a, b) => b.count - a.count || (b.last ?? "").localeCompare(a.last ?? ""))
    .slice(0, 100);
}
