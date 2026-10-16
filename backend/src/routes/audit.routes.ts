import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/** GET /api/audit?limit=100 — journal d'audit (ADMIN, DSI) */
router.get("/", authorizeRoles("ADMIN", "DSI"), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(300, Math.max(1, Number(req.query.limit) || 100));

    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const userIds = Array.from(
      new Set(rows.map((row) => row.userId).filter((id): id is number => !!id)),
    );

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    const byId = new Map(users.map((user) => [user.id, user]));

    res.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        details: row.details,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt,
        user: row.userId ? byId.get(row.userId) ?? null : null,
      })),
    });
  } catch (error) {
    logger.error("Erreur audit", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
