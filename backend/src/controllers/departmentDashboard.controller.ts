import { Response } from "express";

import { logger } from "../config/logger";
import { ScopedRequest } from "../middlewares/coordinatorScope.middleware";
import { sendError } from "../middlewares/error.middleware";
import { buildDepartmentDashboard } from "../services/departmentDashboard.service";

/**
 * GET /api/dashboard/department
 * Tableau de bord adapté au rôle (RH / DAF / Communication / Direction), cahier des charges §5.5.
 * Le périmètre « coordinateur → ses projets » est appliqué par le middleware coordinatorScope.
 */
export async function getDepartmentDashboard(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const scope = req.projectScope ?? { scoped: false, allowed: [] };
    const data = await buildDepartmentDashboard(req.user!.role, scope);
    res.json({ success: true, data });
  } catch (error) {
    logger.error("Erreur tableau de bord par département", error);
    sendError(res, error, "Erreur lors du calcul du tableau de bord par département");
  }
}
