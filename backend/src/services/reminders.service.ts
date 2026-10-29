import { logger } from "../config/logger";
import { db } from "../utils/db";
import { notifyUsers, ReminderKind } from "../utils/notify";

/**
 * Rappels automatiques liés aux réglages « Rappels d'évaluation / de projets / de rapports ».
 *
 * Toutes les REMINDERS_INTERVAL_MIN minutes (60 par défaut, 0 = désactivé), le service repère
 * les échéances proches et prévient les personnes concernées. Chaque rappel n'est envoyé qu'une
 * fois (table ReminderLog). Une personne qui a désactivé le rappel correspondant dans ses
 * paramètres ne reçoit rien (filtre appliqué par notifyUsers).
 */

const DAY = 24 * 3600 * 1000;
const STUDENT_ROLES = ["STAGIAIRE_L3", "STAGIAIRE_M2"];
const CLOSED_STATUSES = ["CLOSED", "COMPLETED", "DONE", "CANCELLED", "ARCHIVED", "FINISHED"];

const day = (value: Date | string) => new Date(value).toLocaleDateString("fr-FR");

/** true la toute première fois pour cette clé (le rappel doit alors être envoyé). */
async function firstTime(key: string, kind: ReminderKind): Promise<boolean> {
  const result = await db.reminderLog.createMany({ data: [{ key, kind }], skipDuplicates: true });
  return result.count > 0;
}

async function departmentStaff(departmentId: number | null): Promise<number[]> {
  if (departmentId === null || departmentId === undefined) return [];

  const rows = (await db.user.findMany({
    where: { departmentId, status: "ACTIVE", role: { notIn: STUDENT_ROLES } },
    select: { id: true },
  })) as Array<{ id: number }>;

  return rows.map((row) => row.id);
}

async function usersWithRoles(roles: string[]): Promise<number[]> {
  const rows = (await db.user.findMany({ where: { status: "ACTIVE", role: { in: roles } }, select: { id: true } })) as Array<{ id: number }>;
  return rows.map((row) => row.id);
}

async function remind(ids: Array<number | null | undefined>, reminder: ReminderKind, title: string, message: string): Promise<number> {
  const recipients = Array.from(new Set(ids.filter((id): id is number => typeof id === "number")));
  if (recipients.length === 0) return 0;

  await notifyUsers(recipients, { title, message, type: "INFO", reminder });
  return recipients.length;
}

/* ----------------------------- Rappels d'évaluation ----------------------------- */

async function evaluationReminders(now: number): Promise<number> {
  let sent = 0;

  // Campagnes d'évaluation qui se terminent dans 3 jours
  const campaigns = (await db.evaluationCampaign.findMany({
    where: { endDate: { gte: new Date(now), lte: new Date(now + 3 * DAY) } },
  })) as Array<{ id: number; name: string; status: string; endDate: Date; createdById: number | null }>;

  for (const campaign of campaigns) {
    if (CLOSED_STATUSES.includes(String(campaign.status).toUpperCase())) continue;
    if (!(await firstTime(`campaign-end:${campaign.id}`, "evaluations"))) continue;

    const evaluators = await usersWithRoles(["TUTEUR_L3", "TUTEUR_M2", "COORDINATOR"]);

    sent += await remind(
      [...evaluators, campaign.createdById],
      "evaluations",
      "Campagne d'évaluation bientôt terminée",
      `La campagne « ${campaign.name} » se termine le ${day(campaign.endDate)}. Pensez à finaliser vos évaluations.`,
    );
  }

  // Fin de stage proche : le tuteur doit évaluer le stagiaire
  const internships = (await db.internship.findMany({
    where: { status: "IN_PROGRESS", supervisorId: { not: null }, endDate: { gte: new Date(now), lte: new Date(now + 7 * DAY) } },
    select: { id: true, title: true, endDate: true, supervisorId: true },
  })) as Array<{ id: number; title: string; endDate: Date; supervisorId: number }>;

  for (const internship of internships) {
    if (!(await firstTime(`internship-eval:${internship.id}`, "evaluations"))) continue;

    sent += await remind(
      [internship.supervisorId],
      "evaluations",
      "Évaluation de fin de stage à préparer",
      `Le stage « ${internship.title} » se termine le ${day(internship.endDate)}. Préparez l'évaluation du stagiaire.`,
    );
  }

  // Évaluations restées en brouillon depuis plus de 7 jours
  const drafts = (await db.evaluation.findMany({
    where: { status: "DRAFT", createdAt: { lt: new Date(now - 7 * DAY) } },
    select: { id: true, title: true, createdById: true },
    take: 200,
  })) as Array<{ id: number; title: string; createdById: number }>;

  for (const draft of drafts) {
    if (!(await firstTime(`evaluation-draft:${draft.id}`, "evaluations"))) continue;

    sent += await remind(
      [draft.createdById],
      "evaluations",
      "Évaluation en brouillon",
      `L'évaluation « ${draft.title} » est en brouillon depuis plus d'une semaine. Soumettez-la ou supprimez-la.`,
    );
  }

  return sent;
}

/* ----------------------------- Rappels de projets ----------------------------- */

async function projectReminders(now: number): Promise<number> {
  let sent = 0;

  const projects = (await db.project.findMany({
    where: { status: "ACTIVE", endDate: { gte: new Date(now), lte: new Date(now + 14 * DAY) } },
    select: { id: true, name: true, endDate: true, createdById: true, departmentId: true },
  })) as Array<{ id: number; name: string; endDate: Date; createdById: number; departmentId: number | null }>;

  for (const project of projects) {
    const daysLeft = Math.ceil((new Date(project.endDate).getTime() - now) / DAY);
    const threshold = daysLeft <= 3 ? "3j" : "14j";

    if (!(await firstTime(`project-end:${project.id}:${threshold}`, "projects"))) continue;

    sent += await remind(
      [project.createdById, ...(await departmentStaff(project.departmentId))],
      "projects",
      `Projet bientôt terminé (${daysLeft} jour${daysLeft > 1 ? "s" : ""})`,
      `Le projet « ${project.name} » se termine le ${day(project.endDate)}. Vérifiez les jalons et le budget restants.`,
    );
  }

  const milestones = (await db.milestone.findMany({
    where: { completedAt: null, dueDate: { gte: new Date(now), lte: new Date(now + 3 * DAY) } },
    select: { id: true, title: true, dueDate: true, project: { select: { name: true, createdById: true } } },
  })) as Array<{ id: number; title: string; dueDate: Date; project: { name: string; createdById: number } | null }>;

  for (const milestone of milestones) {
    if (!milestone.project || !(await firstTime(`milestone-due:${milestone.id}`, "projects"))) continue;

    sent += await remind(
      [milestone.project.createdById],
      "projects",
      "Échéance de jalon proche",
      `Le jalon « ${milestone.title} » (${milestone.project.name}) arrive à échéance le ${day(milestone.dueDate)}.`,
    );
  }

  return sent;
}

/* ----------------------------- Rappels de rapports ----------------------------- */

/** Stagiaire accepté sur une activité terminée depuis moins de 14 jours et qui n'a pas remis son rapport. */
async function reportReminders(now: number): Promise<number> {
  const participations = (await db.activityParticipation.findMany({
    where: { status: "ACCEPTED", reportAt: null, remindedReportAt: null },
    select: { id: true, activityId: true, userId: true },
    take: 500,
  })) as Array<{ id: number; activityId: number; userId: number }>;

  if (participations.length === 0) return 0;

  const activities = (await db.activity.findMany({
    where: { id: { in: Array.from(new Set(participations.map((p) => p.activityId))) }, endDate: { gte: new Date(now - 14 * DAY), lte: new Date(now) } },
    select: { id: true, title: true, endDate: true },
  })) as Array<{ id: number; title: string; endDate: Date }>;

  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  let sent = 0;

  for (const participation of participations) {
    const activity = byId.get(participation.activityId);
    if (!activity) continue;

    if (!(await firstTime(`report-due:${participation.id}`, "reports"))) continue;

    sent += await remind(
      [participation.userId],
      "reports",
      "Rapport d'activité à remettre",
      `L'activité « ${activity.title} » s'est terminée le ${day(activity.endDate)}. Pensez à remettre votre rapport.`,
    );

    await db.activityParticipation.update({ where: { id: participation.id }, data: { remindedReportAt: new Date() } }).catch(() => undefined);
  }

  return sent;
}

/* ----------------------------- Exécution ----------------------------- */

let running = false;

export async function runReminders(): Promise<{ evaluations: number; projects: number; reports: number }> {
  if (running) return { evaluations: 0, projects: 0, reports: 0 };
  running = true;

  try {
    const now = Date.now();
    const result = { evaluations: 0, projects: 0, reports: 0 };

    for (const [name, job] of [
      ["evaluations", evaluationReminders],
      ["projects", projectReminders],
      ["reports", reportReminders],
    ] as const) {
      try {
        result[name] = await job(now);
      } catch (error) {
        logger.error(`Rappels « ${name} » en erreur`, error);
      }
    }

    // Journal des rappels : on garde 180 jours
    await db.reminderLog.deleteMany({ where: { sentAt: { lt: new Date(now - 180 * DAY) } } }).catch(() => undefined);

    return result;
  } finally {
    running = false;
  }
}

/** Lance les rappels toutes les REMINDERS_INTERVAL_MIN minutes (60 par défaut, 0 = désactivé). */
export function startReminderScheduler(): void {
  const minutes = Number(process.env.REMINDERS_INTERVAL_MIN ?? 60);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    logger.info("Rappels automatiques désactivés (REMINDERS_INTERVAL_MIN=0).");
    return;
  }

  const tick = () => {
    runReminders()
      .then((result) => {
        const total = result.evaluations + result.projects + result.reports;
        if (total > 0) logger.info(`Rappels : ${result.evaluations} évaluation(s), ${result.projects} projet(s), ${result.reports} rapport(s).`);
      })
      .catch((error) => logger.error("Erreur des rappels automatiques", error));
  };

  setTimeout(tick, 90_000).unref?.();
  setInterval(tick, minutes * 60_000).unref?.();

  logger.info(`Rappels automatiques : toutes les ${minutes} minute(s).`);
}
