import { Request, Response } from "express";
import { logger } from "../config/logger";

import { db } from "../utils/db";
import { sendError } from "../middlewares/error.middleware";
import { scoreDropout } from "../services/dropoutScoring";
import { probeAiServices } from "../services/pyservices.service";
export async function aiHealth(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const services = await probeAiServices();

    res.status(200).json({
      success: true,
      data: {
        service: "Ndao Hifanosika AI",
        // Le backend lui-même répond : les modèles natifs (scoring, chatbot) sont toujours disponibles.
        status: "online",
        provider: "Express (modèles natifs) + FastAPI (optionnel)",
        services,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Erreur AI health", error);

    sendError(res, error, "Service IA indisponible");
  }
}

/**
 * POST /api/ai/score/dropout-risk
 *
 * MODÈLE DE RÉFÉRENCE UNIQUE : services/dropoutScoring.ts
 *   1) ml_service (méthode R : régression logistique entraînée sur les labels du parcours)
 *   2) repli : règle pondérée (rules-v1)
 *
 * Corps : { beneficiaryId? , age?, attendanceRate?, evaluationAverage, activitiesCompleted?, missedActivities? }
 * Si beneficiaryId est fourni et attendanceRate absent, le taux de présence est calculé
 * depuis BeneficiaryAttendance (séances pointées présent / séances pointées).
 */
export async function scoreDropoutRisk(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { age, activitiesCompleted, missedActivities } = req.body ?? {};
    let { attendanceRate } = req.body ?? {};
    const { evaluationAverage, beneficiaryId } = req.body ?? {};

    let attendanceSource: "request" | "attendance" = "request";
    let sessionsRecorded: number | null = null;

    if ((attendanceRate === undefined || attendanceRate === null) && beneficiaryId !== undefined) {
      const id = Number(beneficiaryId);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ success: false, message: "beneficiaryId invalide." });
        return;
      }
      const rows = await db.beneficiaryAttendance.findMany({
        where: { beneficiaryId: id },
        select: { present: true },
      });
      sessionsRecorded = rows.length;
      if (rows.length > 0) {
        attendanceRate = Math.round((rows.filter((r: { present: boolean }) => r.present).length / rows.length) * 1000) / 10;
        attendanceSource = "attendance";
      }
    }

    if (attendanceRate === undefined || attendanceRate === null || evaluationAverage === undefined) {
      res.status(400).json({
        success: false,
        message:
          "evaluationAverage est obligatoire, ainsi que attendanceRate (ou un beneficiaryId ayant des présences pointées)",
      });
      return;
    }

    const attendance = Number(attendanceRate);
    const average = Number(evaluationAverage);
    const missed = Number(missedActivities ?? 0);
    const completed = Number(activitiesCompleted ?? 0);
    if ([attendance, average, missed, completed].some((v) => !Number.isFinite(v))) {
      res.status(400).json({ success: false, message: "Valeurs numériques invalides." });
      return;
    }

    const result = await scoreDropout({
      age: age !== undefined && age !== null ? Number(age) : null,
      attendanceRate: attendance,
      evaluationAverage: average,
      activitiesCompleted: completed,
      missedActivities: missed,
    });

    res.status(200).json({
      success: true,
      data: {
        age: age !== undefined && age !== null ? Number(age) : null,
        attendanceRate: attendance,
        attendanceSource,
        sessionsRecorded,
        evaluationAverage: average,
        activitiesCompleted: completed,
        missedActivities: missed,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        probability: result.probability,
        model: result.model,
        source: result.source,
        factors: result.factors,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Erreur score risque abandon", error);

    sendError(res, error, "Erreur lors du calcul du risque d'abandon");
  }
}
