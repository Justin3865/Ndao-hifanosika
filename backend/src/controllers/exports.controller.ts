import { Response } from "express";

import { ScopedRequest } from "../middlewares/coordinatorScope.middleware";
import { sendError } from "../middlewares/error.middleware";
import { db } from "../utils/db";
import { EXPORT_DATASETS, ExportDataset, anonymizeRow, canExport } from "../utils/gapRules";
import { canAccessProject } from "../utils/projectScopeRules";

const intOrUndef = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

// Jamais exportés, quel que soit le rôle.
const NEVER = ["trackingToken", "passwordHash", "password"];
const strip = (row: Record<string, unknown>) => {
  const out = { ...row };
  for (const k of NEVER) delete out[k];
  return out;
};

/**
 * GET /api/exports/json?dataset=projects|beneficiaries|activities|evaluations|internships&projectId=
 * Export JSON (cahier §6 « portabilité des données »). Même périmètre que le reste de l'API :
 * un coordinateur ne reçoit que ses projets ; la Communication reçoit des lignes pseudonymisées.
 */
export async function exportJson(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const dataset = String(req.query.dataset ?? "") as ExportDataset;
    if (!(EXPORT_DATASETS as readonly string[]).includes(dataset)) {
      return void res.status(400).json({ success: false, message: `dataset invalide (${EXPORT_DATASETS.join(", ")}).` });
    }
    const mode = canExport(req.user!.role, dataset);
    if (!mode) return void res.status(403).json({ success: false, message: "Export non autorisé pour votre rôle." });

    const scope = req.projectScope ?? { scoped: false, allowed: [] };
    const projectId = intOrUndef(req.query.projectId);
    if (projectId && !canAccessProject(scope, projectId)) {
      return void res.status(403).json({ success: false, message: "Ce projet ne fait pas partie de votre périmètre." });
    }
    const projectWhere = projectId
      ? { projectId }
      : scope.scoped
        ? { projectId: { in: scope.allowed } }
        : {};
    const take = 10000;

    let rows: Array<Record<string, unknown>>;
    switch (dataset) {
      case "projects":
        rows = await db.project.findMany({
          where: projectId ? { id: projectId } : scope.scoped ? { id: { in: scope.allowed } } : {},
          orderBy: { id: "asc" },
          take,
        });
        break;
      case "beneficiaries":
        rows = await db.beneficiary.findMany({ where: projectWhere, orderBy: { id: "asc" }, take });
        break;
      case "activities":
        rows = await db.activity.findMany({ where: projectWhere, orderBy: { id: "asc" }, take });
        break;
      case "evaluations":
        rows = await db.evaluation.findMany({ where: projectWhere, orderBy: { id: "asc" }, take });
        break;
      default:
        rows = await db.internship.findMany({ where: projectId ? { projectId } : {}, orderBy: { id: "asc" }, take });
    }

    const data = rows.map((r) => (mode === "anonymized" && dataset === "beneficiaries" ? anonymizeRow(strip(r)) : strip(r)));
    res.setHeader("Content-Disposition", `attachment; filename="export-${dataset}.json"`);
    res.json({ success: true, dataset, anonymized: mode === "anonymized", count: data.length, exportedAt: new Date().toISOString(), data });
  } catch (error) {
    sendError(res, error, "Erreur lors de l'export JSON");
  }
}
