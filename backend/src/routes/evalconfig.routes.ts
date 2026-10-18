import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { getReqUser } from "../utils/dataScope";

import { sendError } from "../middlewares/error.middleware";
/** CRUD des grilles et campagnes d'évaluation (ADMIN, DIRECTION, COORDINATOR). */

const ROLES = ["ADMIN", "DIRECTION", "COORDINATOR"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

/** Message d'erreur si la date de fin précède la date de début. */
function invalidDateRange(start: unknown, end: unknown): string | null {
  if (!start || !end) return null;

  const a = new Date(String(start)).getTime();
  const b = new Date(String(end)).getTime();

  if (Number.isNaN(a) || Number.isNaN(b)) return "Date invalide.";

  return b < a ? "La date de fin doit être postérieure à la date de début." : null;
}

function parseCriteria(text: string): Array<{ label: string; weight: number }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, weight] = line.split("|").map((part) => part.trim());
      return { label, weight: Number(weight) || 1 };
    });
}

function presentGrid(grid: Json) {
  const criteria = Array.isArray(grid.criteria) ? grid.criteria : [];

  return {
    ...grid,
    criteriaText: criteria
      .map((c: { label: string; weight: number }) => `${c.label} | ${c.weight}`)
      .join("\n"),
  };
}

function buildRouter(
  model: "evaluationGrid" | "evaluationCampaign",
  toData: (body: Json) => Json,
  present: (row: Json) => Json,
): Router {
  const router = Router();
  const delegate = (prisma as Json)[model];

  router.use(authenticate, authorizeRoles(...ROLES));

  router.get("/", async (_req: Request, res: Response) => {
    try {
      const rows = await delegate.findMany({ orderBy: { createdAt: "desc" } });
      res.json({ success: true, data: rows.map(present) });
    } catch (error) {
      logger.error(`Erreur liste ${model}`, error);
      sendError(res, error, "Erreur serveur");
    }
  });

  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const row = await delegate.findUnique({ where: { id: Number(req.params.id) } });
      if (!row) return res.status(404).json({ success: false, message: "Introuvable" });
      res.json({ success: true, data: present(row) });
    } catch (error) {
      logger.error(`Erreur lecture ${model}`, error);
      sendError(res, error, "Erreur serveur");
    }
  });

  router.post("/", async (req: Request, res: Response) => {
    try {
      if (!String(req.body?.name ?? "").trim()) {
        return res.status(400).json({ success: false, message: "Le nom est obligatoire" });
      }

      const badRange = invalidDateRange(req.body?.startDate, req.body?.endDate);
      if (badRange) return res.status(400).json({ success: false, message: badRange });

      const row = await delegate.create({
        data: { ...toData(req.body), createdById: getReqUser(req)?.id ?? null },
      });
      res.status(201).json({ success: true, data: present(row) });
    } catch (error) {
      logger.error(`Erreur création ${model}`, error);
      sendError(res, error, "Erreur serveur");
    }
  });

  router.put("/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const exists = await delegate.findUnique({ where: { id } });
      if (!exists) return res.status(404).json({ success: false, message: "Introuvable" });

      const badRange = invalidDateRange(
        req.body?.startDate ?? exists.startDate,
        req.body?.endDate ?? exists.endDate,
      );
      if (badRange) return res.status(400).json({ success: false, message: badRange });

      const row = await delegate.update({ where: { id }, data: toData(req.body) });
      res.json({ success: true, data: present(row) });
    } catch (error) {
      logger.error(`Erreur mise à jour ${model}`, error);
      sendError(res, error, "Erreur serveur");
    }
  });

  router.delete("/:id", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
    try {
      await delegate.delete({ where: { id: Number(req.params.id) } });
      res.json({ success: true });
    } catch (error) {
      logger.error(`Erreur suppression ${model}`, error);
      res.status(404).json({ success: false, message: "Introuvable" });
    }
  });

  return router;
}

const date = (value: unknown) => (value ? new Date(String(value)) : null);
const num = (value: unknown) => (value ? Number(value) : null);

export const gridsRouter = buildRouter(
  "evaluationGrid",
  (body) => ({
    name: String(body.name ?? "").trim(),
    description: body.description ? String(body.description) : null,
    criteria: parseCriteria(String(body.criteriaText ?? "")),
  }),
  presentGrid,
);

export const campaignsRouter = buildRouter(
  "evaluationCampaign",
  (body) => ({
    name: String(body.name ?? "").trim(),
    description: body.description ? String(body.description) : null,
    gridId: num(body.gridId),
    projectId: num(body.projectId),
    startDate: date(body.startDate),
    endDate: date(body.endDate),
    status: ["DRAFT", "ACTIVE", "CLOSED"].includes(body.status) ? body.status : "DRAFT",
  }),
  (row) => row,
);
