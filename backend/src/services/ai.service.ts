import { scoreDropout, DropoutRiskInput, DropoutRiskResult } from "./dropoutScoring";

/**
 * Façade conservée pour compatibilité : le calcul du risque d'abandon n'existe plus qu'à un seul
 * endroit (services/dropoutScoring.ts — ml_service puis règle de repli).
 */
export type { DropoutRiskInput, DropoutRiskResult };

export async function checkAIHealth() {
  return {
    service: "Ndao Hifanosika AI",
    status: "online",
    provider: "Express (modèles natifs) + FastAPI (optionnel)",
    timestamp: new Date().toISOString(),
  };
}

export async function calculateDropoutRisk(input: DropoutRiskInput): Promise<DropoutRiskResult> {
  return scoreDropout(input);
}
