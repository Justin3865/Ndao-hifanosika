// src/routes/milestoneDeliverables.routes.ts  (AJOUT) — livrables attendus par jalon (cahier §5.2).
//   GET    /api/milestone-deliverables?milestoneId=&projectId=   lecture : ADMIN, DIRECTION, COORDINATOR (son périmètre), tuteurs
//   POST   /api/milestone-deliverables                           création : ADMIN, DIRECTION, COORDINATOR
//   PATCH  /api/milestone-deliverables/:id                       modification (titre, échéance, lien, statut DELIVERED)
//   POST   /api/milestone-deliverables/:id/review                { decision: VALIDATED | REJECTED, comment } : ADMIN, DIRECTION, COORDINATOR
//   DELETE /api/milestone-deliverables/:id                       ADMIN, DIRECTION, COORDINATOR
// Statuts : PLANNED -> DELIVERED -> VALIDATED | REJECTED (un livrable rejeté peut être re-livré).
import { Response, Router } from "express";
import { z } from "zod";

import { authenticate, AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { loadScope } from "../services/projectScope.service";
import { db } from "../utils/db";

const router = Router();
const READERS = ["ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"] as const;
const WRITERS = ["ADMIN", "DIRECTION", "COORDINATOR"] as const;

type Row = Record<string, any>;

/** Le coordinateur n'agit que sur les projets de son périmètre (même règle que les autres routes). */
async function projectAllowed(req: AuthenticatedRequest, projectId: number): Promise<boolean> {
  if (req.user!.role !== "COORDINATOR") return true;
  const scope = await loadScope(req.user!);
  return !scope.scoped || scope.allowed.includes(projectId);
}

async function milestoneProject(milestoneId: number): Promise<number | null> {
  const m: Row | null = await db.milestone.findUnique({ where: { id: milestoneId }, select: { projectId: true } });
  return m ? m.projectId : null;
}

router.get("/", authenticate, authorizeRoles(...READERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = z.object({ milestoneId: z.coerce.number().int().positive().optional(), projectId: z.coerce.number().int().positive().optional() }).parse(req.query);
    const where: Row = {};
    if (q.milestoneId) where.milestoneId = q.milestoneId;
    if (q.projectId) where.milestone = { projectId: q.projectId };
    if (req.user!.role === "COORDINATOR") {
      const scope = await loadScope(req.user!);
      if (scope.scoped) where.milestone = { ...(where.milestone ?? {}), projectId: q.projectId ? (scope.allowed.includes(q.projectId) ? q.projectId : -1) : { in: scope.allowed } };
    }
    const rows = await db.milestoneDeliverable.findMany({ where, orderBy: [{ milestoneId: "asc" }, { dueDate: "asc" }], include: { milestone: { select: { id: true, title: true, projectId: true } } } });
    res.json({ success: true, data: rows });
  } catch (error) {
    sendError(res, error, "Impossible de charger les livrables");
  }
});

const createSchema = z.object({
  milestoneId: z.number().int().positive(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
});

router.post("/", authenticate, authorizeRoles(...WRITERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = createSchema.parse(req.body);
    const projectId = await milestoneProject(b.milestoneId);
    if (projectId === null) return void res.status(404).json({ success: false, message: "Jalon introuvable." });
    if (!(await projectAllowed(req, projectId))) return void res.status(403).json({ success: false, message: "Ce projet n'est pas dans votre périmètre." });
    const row = await db.milestoneDeliverable.create({ data: { ...b, createdById: req.user!.id } });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    sendError(res, error, "Création du livrable impossible");
  }
});

const patchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  fileUrl: z.string().trim().url().max(1000).nullable().optional(),
  markDelivered: z.boolean().optional(),
});

async function loadOwned(req: AuthenticatedRequest, res: Response): Promise<Row | null> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ success: false, message: "Identifiant invalide." }); return null; }
  const row: Row | null = await db.milestoneDeliverable.findUnique({ where: { id }, include: { milestone: { select: { projectId: true } } } });
  if (!row) { res.status(404).json({ success: false, message: "Livrable introuvable." }); return null; }
  if (!(await projectAllowed(req, row.milestone.projectId))) { res.status(403).json({ success: false, message: "Ce projet n'est pas dans votre périmètre." }); return null; }
  return row;
}

router.patch("/:id", authenticate, authorizeRoles(...WRITERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const row = await loadOwned(req, res);
    if (!row) return;
    const { markDelivered, ...data } = patchSchema.parse(req.body);
    const extra: Row = {};
    if (markDelivered) {
      if (row.status === "VALIDATED") return void res.status(409).json({ success: false, message: "Livrable déjà validé." });
      Object.assign(extra, { status: "DELIVERED", deliveredAt: new Date(), deliveredById: req.user!.id, reviewComment: null });
    }
    res.json({ success: true, data: await db.milestoneDeliverable.update({ where: { id: row.id }, data: { ...data, ...extra } }) });
  } catch (error) {
    sendError(res, error, "Modification du livrable impossible");
  }
});

router.post("/:id/review", authenticate, authorizeRoles(...WRITERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const row = await loadOwned(req, res);
    if (!row) return;
    const b = z.object({ decision: z.enum(["VALIDATED", "REJECTED"]), comment: z.string().trim().max(1000).optional() }).parse(req.body);
    if (row.status !== "DELIVERED") return void res.status(409).json({ success: false, message: "Seul un livrable livré peut être validé ou rejeté." });
    if (b.decision === "REJECTED" && !(b.comment && b.comment.length >= 5)) return void res.status(422).json({ success: false, message: "Indiquez le motif du rejet (5 caractères minimum)." });
    const data = await db.milestoneDeliverable.update({ where: { id: row.id }, data: { status: b.decision, reviewComment: b.comment ?? null, validatedAt: new Date(), validatedById: req.user!.id } });
    await db.auditLog.create({ data: { userId: req.user!.id, action: `DELIVERABLE_${b.decision}`, entity: "milestone_deliverable", entityId: row.id, details: { comment: b.comment ?? null } } });
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error, "Décision impossible");
  }
});

router.delete("/:id", authenticate, authorizeRoles(...WRITERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const row = await loadOwned(req, res);
    if (!row) return;
    await db.milestoneDeliverable.delete({ where: { id: row.id } });
    res.json({ success: true, message: "Livrable supprimé." });
  } catch (error) {
    sendError(res, error, "Suppression impossible");
  }
});

export default router;
