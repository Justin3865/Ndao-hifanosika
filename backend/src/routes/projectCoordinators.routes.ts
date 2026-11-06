import { Response, Router } from "express";
import { z } from "zod";

import { authenticate, AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { db } from "../utils/db";

const router = Router();
router.use(authenticate, authorizeRoles("ADMIN", "DIRECTION"));

const assignSchema = z.object({ projectId: z.coerce.number().int().positive(), userId: z.coerce.number().int().positive() });

/** GET /api/project-coordinators?projectId=&userId= */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: Record<string, number> = {};
    const p = Number(req.query.projectId), u = Number(req.query.userId);
    if (Number.isInteger(p) && p > 0) where.projectId = p;
    if (Number.isInteger(u) && u > 0) where.userId = u;
    res.json({ success: true, data: await db.projectCoordinator.findMany({ where, orderBy: { id: "asc" } }) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des affectations");
  }
});

/** POST /api/project-coordinators { projectId, userId } */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, userId } = assignSchema.parse(req.body);
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || String(user.role).toUpperCase() !== "COORDINATOR") {
      return void res.status(400).json({ success: false, message: "L'utilisateur doit avoir le rôle COORDINATOR." });
    }
    if (!(await db.project.findUnique({ where: { id: projectId }, select: { id: true } }))) {
      return void res.status(404).json({ success: false, message: "Projet introuvable." });
    }
    const row = await db.projectCoordinator.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, assignedById: req.user!.id },
      update: {},
    });
    res.status(201).json({ success: true, message: "Coordinateur affecté au projet.", data: row });
  } catch (error) {
    sendError(res, error, "Erreur lors de l'affectation du coordinateur");
  }
});

/** DELETE /api/project-coordinators/:id */
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return void res.status(400).json({ success: false, message: "Identifiant invalide." });
    await db.projectCoordinator.deleteMany({ where: { id } });
    res.json({ success: true, message: "Affectation retirée." });
  } catch (error) {
    sendError(res, error, "Erreur lors du retrait de l'affectation");
  }
});

export default router;
