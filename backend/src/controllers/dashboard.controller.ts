import { Request, Response } from "express";
import { logger } from "../config/logger";

import { sendError } from "../middlewares/error.middleware";
import { getDashboard as buildDashboard, loadExtras } from "../services/aiDashboard.service";
import { ANOMALY_CATALOG, ANOMALY_SCOPES } from "../services/anomalyCatalog";
import { loadData, runAnalysis } from "../services/insights.service";

/** GET /api/ai/dashboard — toutes les données des graphiques (courbes, secteurs, histogrammes). */
export async function getDashboard(_req: Request, res: Response): Promise<void> {
  try {
    const dashboard = await buildDashboard();

    res.json({ success: true, data: dashboard, engine: dashboard.engine });
  } catch (error) {
    logger.error("Erreur tableau de bord IA", error);
    sendError(res, error, "Erreur lors du calcul du tableau de bord");
  }
}

/**
 * GET /api/ai/anomalies/cases — TOUS les cas d'anomalie possibles, chacun avec la règle qui en
 * fait une anomalie, le nombre de cas détectés actuellement et quelques exemples.
 */
export async function getAnomalyCases(_req: Request, res: Response): Promise<void> {
  try {
    const [data, extras] = await Promise.all([loadData(), loadExtras()]);
    const analysis = await runAnalysis(data);

    const departmentOf = new Map<number, number | null>(
      data.projects.map((project): [number, number | null] => [project.id, project.departmentId ?? null]),
    );
    const departmentName = new Map<number, string>(
      data.departments.map((department): [number, string] => [department.id, department.name]),
    );

    interface Example {
      title: string;
      detail: string;
      link: string;
      severity: string;
      departmentName: string | null;
    }

    const grouped = new Map<string, { count: number; examples: Example[]; severities: Record<string, number> }>();

    for (const anomaly of analysis.anomalies) {
      const entry = grouped.get(anomaly.type) ?? { count: 0, examples: [], severities: { HIGH: 0, MEDIUM: 0, LOW: 0 } };
      const departmentId = anomaly.projectId !== null ? (departmentOf.get(anomaly.projectId) ?? null) : null;

      entry.count += 1;
      entry.severities[anomaly.severity] += 1;
      if (entry.examples.length < 5) {
        entry.examples.push({
          title: anomaly.title,
          detail: anomaly.detail,
          link: anomaly.link,
          severity: anomaly.severity,
          departmentName: departmentId !== null ? (departmentName.get(departmentId) ?? null) : null,
        });
      }

      grouped.set(anomaly.type, entry);
    }

    // Ménages très vulnérables non encore classés (modèle de vulnérabilité)
    if (extras.suspected.length > 0) {
      grouped.set("HOUSEHOLD_VULNERABLE", {
        count: extras.suspected.length,
        severities: { HIGH: extras.suspected.length, MEDIUM: 0, LOW: 0 },
        examples: extras.suspected.slice(0, 5).map((household) => ({
          title: `Ménage vulnérable : ${household.name}`,
          detail: `${household.projectName} — score de vulnérabilité ${household.score}/100.`,
          link: "/ai/vulnerability",
          severity: "HIGH",
          departmentName: null,
        })),
      });
    }

    const cases = ANOMALY_CATALOG.map((type) => ({
      ...type,
      count: grouped.get(type.code)?.count ?? 0,
      examples: grouped.get(type.code)?.examples ?? [],
    }));

    const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>;
    const byScope = new Map<string, number>();

    for (const item of cases) {
      if (item.count === 0) continue;

      // La gravité est celle de chaque occurrence (ex. jalon : faible / moyenne / élevée selon le retard)
      const severities = grouped.get(item.code)?.severities ?? { HIGH: 0, MEDIUM: 0, LOW: 0 };
      for (const level of Object.keys(bySeverity)) bySeverity[level] += severities[level] ?? 0;

      byScope.set(item.scope, (byScope.get(item.scope) ?? 0) + item.count);
    }

    const total = cases.reduce((sum, item) => sum + item.count, 0);

    res.json({
      success: true,
      engine: analysis.engine,
      data: {
        engine: analysis.engine,
        total,
        typesDetected: cases.filter((item) => item.count > 0).length,
        typesTotal: cases.length,
        bySeverity: [
          { key: "HIGH", label: "Critiques", value: bySeverity.HIGH },
          { key: "MEDIUM", label: "Moyennes", value: bySeverity.MEDIUM },
          { key: "LOW", label: "Faibles", value: bySeverity.LOW },
        ],
        byScope: Array.from(byScope, ([key, value]) => ({ key, label: key, value })).sort((a, b) => b.value - a.value),
        scopes: Array.from(new Set(ANOMALY_CATALOG.map((type) => ANOMALY_SCOPES[type.code]))),
        cases,
      },
    });
  } catch (error) {
    logger.error("Erreur cas d'anomalies", error);
    sendError(res, error, "Erreur lors de la lecture des cas d'anomalies");
  }
}
