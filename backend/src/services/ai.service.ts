import { logger } from "../config/logger";

export type DropoutRiskInput = {
  age?: number;
  attendanceRate: number;
  evaluationAverage: number;
  activitiesCompleted?: number;
  missedActivities?: number;
};

export type DropoutRiskResult = {
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  model: string;
};

export async function checkAIHealth() {
  return {
    service: "Ndao Hifanosika AI",
    status: "online",
    provider: "FastAPI",
    timestamp: new Date().toISOString(),
  };
}

export async function calculateDropoutRisk(
  input: DropoutRiskInput,
): Promise<DropoutRiskResult> {
  try {
    const attendance = Number(input.attendanceRate);
    const average = Number(input.evaluationAverage);
    const missed = Number(input.missedActivities ?? 0);
    const completed = Number(input.activitiesCompleted ?? 0);

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

    riskScore = Math.min(
      100,
      Math.max(0, riskScore),
    );

    let riskLevel: "LOW" | "MEDIUM" | "HIGH";

    if (riskScore >= 60) {
      riskLevel = "HIGH";
    } else if (riskScore >= 30) {
      riskLevel = "MEDIUM";
    } else {
      riskLevel = "LOW";
    }

    return {
      riskScore,
      riskLevel,
      model: "MVP",
    };
  } catch (error) {
    logger.error("Erreur calcul risque IA", error);
    throw new Error("AI_RISK_CALCULATION_ERROR");
  }
}