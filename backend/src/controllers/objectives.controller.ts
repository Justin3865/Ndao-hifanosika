import { Response } from "express";
import { z } from "zod";

import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import { db } from "../utils/db";
import {
  OBJECTIVE_STATUSES,
  isObjectiveOverdue,
  nextObjectiveStatus,
  objectiveProgress,
} from "../utils/gapRules";

/** Rôles qui gèrent les objectifs des autres membres (cahier §4 : RH = accès complet au module membres). */
export const OBJECTIVE_MANAGERS = ["ADMIN", "RH", "DIRECTION"];

const intOrUndef = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const baseSchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().trim().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  kpi: z.string().max(200).optional().nullable(),
  unit: z.string().max(30).optional().nullable(),
  targetValue: z.number().finite().optional().nullable(),
  currentValue: z.number().finite().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.enum(OBJECTIVE_STATUSES).optional(),
  projectId: z.number().int().positive().optional().nullable(),
});

const progressSchema = z.object({
  currentValue: z.number().finite(),
  status: z.enum(OBJECTIVE_STATUSES).optional(),
});

type Row = {
  id: number; userId: number; status: string; targetValue: number | null; currentValue: number | null; dueDate: Date | null;
};

const decorate = (o: Row) => ({
  ...o,
  progress: objectiveProgress(o.currentValue, o.targetValue),
  overdue: isObjectiveOverdue(o),
});

const isManager = (role: string) => OBJECTIVE_MANAGERS.includes(role.toUpperCase());

/** GET /api/objectives?userId= — soi-même par défaut ; les gestionnaires peuvent lire ceux d'un autre membre */
export async function listObjectives(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const me = req.user!;
    const requested = intOrUndef(req.query.userId);
    const target = requested ?? me.id;
    if (target !== me.id && !isManager(me.role)) {
      return void res.status(403).json({ success: false, message: "Vous ne pouvez consulter que vos propres objectifs." });
    }
    const rows: Row[] = await db.memberObjective.findMany({ where: { userId: target }, orderBy: [{ dueDate: "asc" }, { id: "desc" }] });
    res.json({ success: true, data: rows.map(decorate) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des objectifs");
  }
}

/** GET /api/objectives/alerts — objectifs en retard (alerte RH, cahier §5.3) */
export async function objectiveAlerts(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const rows: Array<Row & { title: string }> = await db.memberObjective.findMany({
      where: { dueDate: { lt: new Date() }, status: { in: ["PLANNED", "IN_PROGRESS"] } },
      orderBy: { dueDate: "asc" },
      take: 500,
    });
    const users: Array<{ id: number; firstName: string; lastName: string }> = await db.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
      select: { id: true, firstName: true, lastName: true },
    });
    const names = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
    res.json({ success: true, data: rows.map((r) => ({ ...decorate(r), memberName: names.get(r.userId) ?? `#${r.userId}` })) });
  } catch (error) {
    sendError(res, error, "Erreur lors du calcul des alertes d'objectifs");
  }
}

export async function createObjective(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const input = baseSchema.parse(req.body);
    const user = await db.user.findUnique({ where: { id: input.userId }, select: { id: true } });
    if (!user) return void res.status(404).json({ success: false, message: "Membre introuvable." });
    const status = nextObjectiveStatus(input.status ?? "PLANNED", input.currentValue, input.targetValue);
    const created = await db.memberObjective.create({ data: { ...input, status, createdById: req.user!.id } });
    res.status(201).json({ success: true, message: "Objectif créé.", data: decorate(created) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la création de l'objectif");
  }
}

export async function updateObjective(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = intOrUndef(req.params.id);
    if (!id) return void res.status(400).json({ success: false, message: "Identifiant invalide." });
    const input = baseSchema.partial().parse(req.body);
    const existing = await db.memberObjective.findUnique({ where: { id } });
    if (!existing) return void res.status(404).json({ success: false, message: "Objectif introuvable." });
    const merged = { ...existing, ...input };
    const status = input.status ?? nextObjectiveStatus(existing.status, merged.currentValue, merged.targetValue);
    const updated = await db.memberObjective.update({ where: { id }, data: { ...input, status } });
    res.json({ success: true, message: "Objectif mis à jour.", data: decorate(updated) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la mise à jour de l'objectif");
  }
}

/** PATCH /api/objectives/:id/progress — le membre met à jour SA valeur atteinte (ou un gestionnaire) */
export async function updateProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = intOrUndef(req.params.id);
    if (!id) return void res.status(400).json({ success: false, message: "Identifiant invalide." });
    const { currentValue, status } = progressSchema.parse(req.body);
    const existing = await db.memberObjective.findUnique({ where: { id } });
    if (!existing) return void res.status(404).json({ success: false, message: "Objectif introuvable." });
    if (existing.userId !== req.user!.id && !isManager(req.user!.role)) {
      return void res.status(403).json({ success: false, message: "Cet objectif ne vous appartient pas." });
    }
    const next = status ?? nextObjectiveStatus(existing.status, currentValue, existing.targetValue);
    const updated = await db.memberObjective.update({ where: { id }, data: { currentValue, status: next } });
    res.json({ success: true, message: "Progression enregistrée.", data: decorate(updated) });
  } catch (error) {
    sendError(res, error, "Erreur lors de l'enregistrement de la progression");
  }
}

export async function deleteObjective(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = intOrUndef(req.params.id);
    if (!id) return void res.status(400).json({ success: false, message: "Identifiant invalide." });
    const existing = await db.memberObjective.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return void res.status(404).json({ success: false, message: "Objectif introuvable." });
    await db.memberObjective.delete({ where: { id } });
    res.json({ success: true, message: "Objectif supprimé." });
  } catch (error) {
    sendError(res, error, "Erreur lors de la suppression de l'objectif");
  }
}
