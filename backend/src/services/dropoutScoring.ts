import { logger } from "../config/logger";

/**
 * MODÈLE DE RÉFÉRENCE UNIQUE du risque d'abandon.
 *
 *   1) ml_service (optionnel) : POST {ML_SERVICE_URL}/predict-dropout
 *      -> utilisé seulement si l'URL est configurée ET que le service répond.
 *      (Si le service n'expose pas cette route, on bascule définitivement sur la règle.)
 *   2) repli : règle pondérée « rules-v1 », toujours disponible.
 */

export interface DropoutRiskInput {
  age: number | null;
  attendanceRate: number; // 0..100
  evaluationAverage: number; // 0..100
  activitiesCompleted: number;
  missedActivities: number;
}

export interface DropoutRiskResult {
  riskScore: number; // 0..100
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  probability: number; // 0..1
  model: string;
  source: "ml_service" | "rules";
  factors: string[];
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function levelFromScore(score: number): DropoutRiskResult["riskLevel"] {
  return score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
}

/** Règle pondérée rules-v1 (max théorique = 100). */
export function scoreWithRules(input: DropoutRiskInput): DropoutRiskResult {
  const factors: string[] = [];
  let risk = 0;

  // Présence (jusqu'à 40 pts)
  const attendance = clamp(input.attendanceRate);
  if (attendance < 50) {
    risk += 40;
    factors.push(`Présence très faible (${Math.round(attendance)} %)`);
  } else if (attendance < 70) {
    risk += 25;
    factors.push(`Présence insuffisante (${Math.round(attendance)} %)`);
  } else if (attendance < 85) {
    risk += 10;
    factors.push(`Présence moyenne (${Math.round(attendance)} %)`);
  }

  // Évaluations (jusqu'à 30 pts)
  const average = clamp(input.evaluationAverage);
  if (average < 50) {
    risk += 30;
    factors.push(`Résultats d'évaluation faibles (${Math.round(average)}/100)`);
  } else if (average < 60) {
    risk += 20;
    factors.push(`Résultats d'évaluation insuffisants (${Math.round(average)}/100)`);
  } else if (average < 70) {
    risk += 10;
    factors.push(`Résultats d'évaluation moyens (${Math.round(average)}/100)`);
  }

  // Activités manquées (jusqu'à 20 pts)
  const missed = Math.max(0, input.missedActivities);
  const completed = Math.max(0, input.activitiesCompleted);
  const total = missed + completed;
  if (missed > 0) {
    const ratio = total > 0 ? missed / total : 1;
    risk += Math.round(ratio * 20);
    factors.push(`${missed} activité(s) manquée(s)`);
  }

  // Âge (jusqu'à 10 pts)
  if (input.age !== null && Number.isFinite(input.age)) {
    if (input.age < 14) {
      risk += 5;
      factors.push("Très jeune (< 14 ans)");
    } else if (input.age >= 18) {
      risk += 5;
      factors.push("Âge supérieur à 18 ans (risque d'abandon plus élevé)");
    }
  }

  const riskScore = Math.round(clamp(risk));

  return {
    riskScore,
    riskLevel: levelFromScore(riskScore),
    probability: Math.round((riskScore / 100) * 1000) / 1000,
    model: "rules-v1",
    source: "rules",
    factors,
  };
}

/* ------------------------------ ml_service ------------------------------ */

let mlRouteMissing = false;

async function scoreWithMl(input: DropoutRiskInput): Promise<DropoutRiskResult | null> {
  const base = process.env.ML_SERVICE_URL?.trim().replace(/\/$/, "");
  if (!base || mlRouteMissing) return null;

  try {
    const response = await fetch(`${base}/predict-dropout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": process.env.AI_SERVICE_KEY ?? "",
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(2500),
    });

    if (response.status === 404) {
      mlRouteMissing = true; // ne plus réessayer tant que le backend n'est pas redémarré
      return null;
    }
    if (!response.ok) return null;

    const body = (await response.json()) as Record<string, unknown>;
    const probability = Number(body.probability);
    if (!Number.isFinite(probability)) return null;

    const p = clamp(probability, 0, 1);
    const riskScore = Math.round(p * 100);

    return {
      riskScore,
      riskLevel: levelFromScore(riskScore),
      probability: Math.round(p * 1000) / 1000,
      model: typeof body.model === "string" ? body.model : "ml-logistic",
      source: "ml_service",
      factors: Array.isArray(body.factors) ? body.factors.map(String) : scoreWithRules(input).factors,
    };
  } catch (error) {
    logger.warn?.("ml_service indisponible pour le risque d'abandon, repli sur la règle", error);
    return null;
  }
}

export async function scoreDropout(input: DropoutRiskInput): Promise<DropoutRiskResult> {
  return (await scoreWithMl(input)) ?? scoreWithRules(input);
}
