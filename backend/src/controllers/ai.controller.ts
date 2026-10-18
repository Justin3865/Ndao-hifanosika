import { Request, Response } from "express";
import { logger } from "../config/logger";

import { sendError } from "../middlewares/error.middleware";
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

export async function scoreDropoutRisk(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      age,
      attendanceRate,
      evaluationAverage,
      activitiesCompleted,
      missedActivities,
    } = req.body;

    if (
      attendanceRate === undefined ||
      evaluationAverage === undefined
    ) {
      res.status(400).json({
        success: false,
        message:
          "attendanceRate et evaluationAverage sont obligatoires",
      });
      return;
    }

    /*
     * Version MVP :
     * Le calcul définit simplement un score indicatif.
     *
     * Dans la version finale, cette fonction appellera
     * le service FastAPI /score/dropout-risk.
     */

    const attendance = Number(attendanceRate);
    const average = Number(evaluationAverage);
    const missed = Number(missedActivities ?? 0);
    const completed = Number(activitiesCompleted ?? 0);

    let riskScore = 0;

    if (attendance < 50) {
      riskScore += 40;
    } else if (attendance < 70) {
      riskScore += 25;
    } else if (attendance < 85) {
      riskScore += 10;
    }

    if (average < 8) {
      riskScore += 30;
    } else if (average < 10) {
      riskScore += 20;
    } else if (average < 12) {
      riskScore += 10;
    }

    if (missed >= 5) {
      riskScore += 20;
    } else if (missed >= 3) {
      riskScore += 10;
    }

    if (completed === 0) {
      riskScore += 10;
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    let level: "LOW" | "MEDIUM" | "HIGH";

    if (riskScore >= 60) {
      level = "HIGH";
    } else if (riskScore >= 30) {
      level = "MEDIUM";
    } else {
      level = "LOW";
    }

    res.status(200).json({
      success: true,
      data: {
        age: age !== undefined ? Number(age) : null,
        attendanceRate: attendance,
        evaluationAverage: average,
        activitiesCompleted: completed,
        missedActivities: missed,
        riskScore,
        riskLevel: level,
        model: "MVP",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Erreur score risque abandon", error);

    sendError(res, error, "Erreur lors du calcul du risque d'abandon");
  }
}