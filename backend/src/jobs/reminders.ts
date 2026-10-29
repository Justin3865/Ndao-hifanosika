import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { alreadySent, notifyUsers } from "../utils/notify";
import { userAllows, type BoolKey } from "../utils/userSettings";

const DAY = 24 * 60 * 60 * 1000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const fr = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { timeZone: "Indian/Antananarivo" }) : "");

/**
 * Mettre à false si un job de rappels « rapport d'activité » existe déjà dans votre projet
 * (les champs remindedStartAt / remindedReportAt le laissent penser) : dans ce cas, ajoutez
 * plutôt `await userAllows(userId, "reportReminders")` dans ce job existant.
 */
const INCLUDE_ACTIVITY_REPORTS = true;

async function remind(userId: number | null | undefined, setting: BoolKey, key: string, title: string, message: string) {
  if (!userId) return;
  if (!(await userAllows(userId, setting))) return;   // réglage désactivé ou compte inactif
  if (await alreadySent(userId, key)) return;         // déjà rappelé
  await notifyUsers([userId], { title, message, type: "WARNING", dedupKey: key });
}

export async function runRemindersOnce(): Promise<void> {
  const now = new Date();
  const in3 = new Date(now.getTime() + 3 * DAY);
  const in7 = new Date(now.getTime() + 7 * DAY);

  /* ---------- Rappels de projets ---------- */
  const milestones = await prisma.milestone.findMany({
    where: { completedAt: null, dueDate: { gte: now, lte: in3 }, project: { status: "ACTIVE" } },
    include: { project: { select: { name: true, createdById: true } } },
  });
  for (const m of milestones) {
    await remind(m.project.createdById, "projectReminders", `rem:ms:${m.id}:${ymd(m.dueDate!)}`,
      "Jalon bientôt échu", `Le jalon « ${m.title} » du projet « ${m.project.name} » arrive à échéance le ${fr(m.dueDate)}.`);
  }

  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE", endDate: { gte: now, lte: in7 } },
    select: { id: true, name: true, endDate: true, createdById: true },
  });
  for (const p of projects) {
    await remind(p.createdById, "projectReminders", `rem:prj:${p.id}:${ymd(p.endDate!)}`,
      "Projet bientôt terminé", `Le projet « ${p.name} » se termine le ${fr(p.endDate)}.`);
  }

  /* ---------- Rappels d'évaluation ---------- */
  const week = Math.floor(now.getTime() / (7 * DAY));
  const drafts = await prisma.evaluation.findMany({
    where: { status: "DRAFT", createdAt: { lte: new Date(now.getTime() - 3 * DAY) } },
    select: { id: true, title: true, createdById: true },
  });
  for (const e of drafts) {
    await remind(e.createdById, "evaluationReminders", `rem:eval:${e.id}:${week}`,
      "Évaluation à soumettre", `L'évaluation « ${e.title} » est toujours en brouillon.`);
  }

  const campaigns = await prisma.evaluationCampaign.findMany({
    where: { endDate: { gte: now, lte: in3 }, status: { notIn: ["CANCELLED", "CLOSED", "COMPLETED", "DONE"] } },
    select: { id: true, name: true, endDate: true, createdById: true },
  });
  for (const c of campaigns) {
    await remind(c.createdById, "evaluationReminders", `rem:camp:${c.id}:${ymd(c.endDate!)}`,
      "Campagne d'évaluation bientôt clôturée", `La campagne « ${c.name} » se termine le ${fr(c.endDate)}.`);
  }

  /* ---------- Rappels de rapports (stagiaires) ---------- */
  if (INCLUDE_ACTIVITY_REPORTS) {
    const ended = await prisma.activity.findMany({
      where: { endDate: { gte: new Date(now.getTime() - 5 * DAY), lt: now }, status: { not: "CANCELLED" } },
      select: { id: true, title: true },
    });
    if (ended.length) {
      const titles = new Map(ended.map((a) => [a.id, a.title]));
      const parts = await prisma.activityParticipation.findMany({
        where: { activityId: { in: ended.map((a) => a.id) }, status: "ACCEPTED", report: null },
        select: { id: true, userId: true, activityId: true },
      });
      for (const p of parts) {
        await remind(p.userId, "reportReminders", `rem:rpt:${p.id}:${ymd(now)}`,
          "Rapport d'activité à remettre", `Pensez à déposer votre rapport pour l'activité « ${titles.get(p.activityId)} ».`);
      }
    }
  }
}

let timer: ReturnType<typeof setInterval> | undefined;

/** À appeler une fois au démarrage du serveur. Vérifie toutes les heures. */
export function startReminderJob(intervalMs = 60 * 60 * 1000): void {
  if (timer) return;
  const tick = () => runRemindersOnce().catch((e) => logger.error("Erreur rappels automatiques", e));
  setTimeout(tick, 30_000);
  timer = setInterval(tick, intervalMs);
  timer.unref?.();
}
