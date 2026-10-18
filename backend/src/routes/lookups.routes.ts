import { Router, Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { getReqUser } from "../utils/dataScope";
import { db } from "../utils/db";

import { sendError } from "../middlewares/error.middleware";
/**
 * GET /api/lookups/:kind
 * Listes légères (id + libellé) pour alimenter les listes déroulantes.
 * kinds : projects | departments | students | tutors | users
 */
const router = Router();

router.use(authenticate);

const STUDENT_ROLES = ["STAGIAIRE_L3", "STAGIAIRE_M2"];
const TUTOR_ROLES = ["TUTEUR_L3", "TUTEUR_M2"];
const USER_LIST_ROLES = ["ADMIN", "DIRECTION", "DSI", "RH"];

router.get("/:kind", async (req: Request, res: Response) => {
  const user = getReqUser(req);
  const kind = String(req.params.kind);

  const forbidden = () =>
    res.status(403).json({
      success: false,
      message: "Accès refusé à cette liste.",
    });

  try {
    if (!user) return forbidden();

    const isStudent = STUDENT_ROLES.includes(user.role);

    if (kind === "projects") {
      const rows = await prisma.project.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      });

      return res.json({
        success: true,
        data: rows.map((row) => ({
          id: row.id,
          label: `${row.code} — ${row.name}`,
        })),
      });
    }

    if (kind === "zones") {
      if (isStudent) return forbidden();

      const rows = (await db.zone.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })) as Array<{ id: number; name: string }>;

      return res.json({
        success: true,
        data: rows.map((row) => ({ id: row.id, label: row.name })),
      });
    }

    if (kind === "grids") {
      const rows = await (prisma as unknown as {
        evaluationGrid: { findMany: (a: object) => Promise<Array<{ id: number; name: string }>> };
      }).evaluationGrid.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

      return res.json({
        success: true,
        data: rows.map((row) => ({ id: row.id, label: row.name })),
      });
    }

    if (kind === "departments") {
      const rows = await prisma.department.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      return res.json({
        success: true,
        data: rows.map((row) => ({ id: row.id, label: row.name })),
      });
    }

    if (kind === "students" || kind === "tutors" || kind === "users") {
      if (isStudent) return forbidden();
      if (kind === "users" && !USER_LIST_ROLES.includes(user.role)) {
        return forbidden();
      }

      const roles =
        kind === "students"
          ? STUDENT_ROLES
          : kind === "tutors"
            ? TUTOR_ROLES
            : undefined;

      const rows = await prisma.user.findMany({
        where: (roles ? { role: { in: roles } } : {}) as never,
        select: { id: true, firstName: true, lastName: true, role: true },
        orderBy: { lastName: "asc" },
      });

      return res.json({
        success: true,
        data: rows.map((row) => ({
          id: row.id,
          label:
            kind === "users"
              ? `${row.firstName} ${row.lastName} (${row.role})`
              : `${row.firstName} ${row.lastName}`,
        })),
      });
    }

    return res.status(404).json({
      success: false,
      message: "Liste inconnue.",
    });
  } catch (error) {
    logger.error("Erreur lookups", error);

    return sendError(res, error, "Erreur lors du chargement de la liste.");
  }
});

export default router;
