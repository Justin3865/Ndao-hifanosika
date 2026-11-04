import { z } from "zod";

import { logger } from "../config/logger";
import { db } from "../utils/db";
import { notifyUsers } from "../utils/notify";
import {
  FOLLOW_UP_HORIZONS,
  REMIND_BEFORE_DAYS,
  classify,
  computeSchedule,
  programEndDate,
  summarize,
} from "../utils/followUpRules";

const DAY = 24 * 60 * 60 * 1000;

export const completeFollowUpSchema = z.object({
  occupation: z.enum(["EMPLOYED", "SELF_EMPLOYED", "IN_TRAINING", "SEEKING", "INACTIVE"]),
  activityCreated: z.boolean().optional(),
  monthlyIncome: z.number().min(0).max(1_000_000_000).optional(),
  satisfaction: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
});

/** true la première fois pour cette clé (évite d'envoyer deux fois le même rappel). */
async function firstTime(key: string): Promise<boolean> {
  const result = await db.reminderLog.createMany({ data: [{ key, kind: "projects" }], skipDuplicates: true });
  return result.count > 0;
}

/**
 * Crée les relances manquantes (3, 6, 12 mois) pour les bénéficiaires des projets clôturés,
 * et marque « manquées » celles dont le délai de grâce est dépassé. Idempotent.
 */
export async function syncFollowUps(now: Date = new Date()): Promise<{ created: number; missed: number }> {
  const projects = (await db.project.findMany({
    where: { status: "COMPLETED" },
    select: { id: true, status: true, endDate: true, updatedAt: true, beneficiaries: { select: { id: true } } },
  })) as Array<{ id: number; status: string; endDate: Date | null; updatedAt: Date; beneficiaries: Array<{ id: number }> }>;

  const data: Array<{ beneficiaryId: number; horizonMonths: number; dueDate: Date }> = [];
  for (const project of projects) {
    const end = programEndDate(project);
    if (!end) continue;
    for (const b of project.beneficiaries) {
      for (const s of computeSchedule(end)) data.push({ beneficiaryId: b.id, ...s });
    }
  }

  let created = 0;
  for (let i = 0; i < data.length; i += 500) {
    const r = await db.postProgramFollowUp.createMany({ data: data.slice(i, i + 500), skipDuplicates: true });
    created += r.count;
  }

  const pending = (await db.postProgramFollowUp.findMany({
    where: { status: "PENDING" },
    select: { id: true, dueDate: true, status: true },
  })) as Array<{ id: number; dueDate: Date; status: string }>;
  const toMiss = pending.filter((f) => classify(f, now) === "missed").map((f) => f.id);
  if (toMiss.length) await db.postProgramFollowUp.updateMany({ where: { id: { in: toMiss } }, data: { status: "MISSED" } });

  return { created, missed: toMiss.length };
}

/** Rappelle aux responsables de projet les relances à réaliser dans les 7 prochains jours. */
export async function remindDueFollowUps(now: Date = new Date()): Promise<number> {
  const rows = (await db.postProgramFollowUp.findMany({
    where: { status: "PENDING", dueDate: { lte: new Date(now.getTime() + REMIND_BEFORE_DAYS * DAY) } },
    include: { beneficiary: { select: { firstName: true, lastName: true, project: { select: { name: true, createdById: true } } } } },
  })) as Array<{
    id: number; horizonMonths: number; dueDate: Date;
    beneficiary: { firstName: string; lastName: string; project: { name: string; createdById: number } };
  }>;

  let sent = 0;
  for (const f of rows) {
    if (classify({ status: "PENDING", dueDate: f.dueDate }, now) === "missed") continue;
    if (!(await firstTime(`followup:${f.id}`))) continue;
    await notifyUsers([f.beneficiary.project.createdById], {
      title: `Relance post-programme à ${f.horizonMonths} mois`,
      message: `Contacter ${f.beneficiary.firstName} ${f.beneficiary.lastName} (projet « ${f.beneficiary.project.name} ») avant le ${new Date(f.dueDate).toLocaleDateString("fr-FR")}.`,
      type: "INFO",
    });
    sent += 1;
  }
  return sent;
}

export async function listFollowUps(filter: { projectId?: number; status?: string; horizon?: number }) {
  const where: Record<string, unknown> = {};
  if (filter.status) where.status = filter.status;
  if (filter.horizon) where.horizonMonths = filter.horizon;
  if (filter.projectId) where.beneficiary = { projectId: filter.projectId };

  const rows = await db.postProgramFollowUp.findMany({
    where,
    orderBy: [{ dueDate: "asc" }],
    include: {
      beneficiary: { select: { id: true, firstName: true, lastName: true, gender: true, vulnerable: true, projectId: true, project: { select: { name: true } } } },
    },
    take: 1000,
  });
  const now = new Date();
  return (rows as Array<{ status: string; dueDate: Date }>).map((r) => ({ ...r, phase: classify(r, now) }));
}

export async function completeFollowUp(id: number, input: z.infer<typeof completeFollowUpSchema>, userId: number) {
  const existing = await db.postProgramFollowUp.findUnique({ where: { id } });
  if (!existing) return null;
  return db.postProgramFollowUp.update({
    where: { id },
    data: { ...input, status: "DONE", completedAt: new Date(), completedById: userId },
  });
}

export async function followUpImpact(projectId?: number) {
  const rows = await db.postProgramFollowUp.findMany({
    where: projectId ? { beneficiary: { projectId } } : {},
    select: { horizonMonths: true, status: true, occupation: true, activityCreated: true, monthlyIncome: true, satisfaction: true },
  });
  return { horizons: FOLLOW_UP_HORIZONS, summary: summarize(rows) };
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function startFollowUpScheduler(): void {
  const tick = async () => {
    try {
      const sync = await syncFollowUps();
      const reminded = await remindDueFollowUps();
      if (sync.created || sync.missed || reminded) {
        logger.info(`Suivi post-programme : ${sync.created} créées, ${sync.missed} manquées, ${reminded} rappels`);
      }
    } catch (error) {
      logger.error("Suivi post-programme : tâche en erreur", error);
    }
  };
  setInterval(tick, SIX_HOURS).unref();
  setTimeout(() => void tick(), 30_000).unref();
  logger.success("Suivi post-programme (3/6/12 mois) : planificateur démarré");
}
