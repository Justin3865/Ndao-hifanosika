import { logger } from "../config/logger";

/**
 * Appels au service Python (ai-service) pour les données calculées sur la base.
 *
 *  - Mode « live » : le service lit lui-même PostgreSQL (GET /v1/live/...) ;
 *  - si le service est arrêté, sans pilote psycopg ou sans accès à la base, le backend
 *    retombe sur l'envoi de données (POST /v1/insights) puis sur le calcul local.
 *
 * AI_SERVICE_DB_MODE=off désactive le mode live.
 */

const COOLDOWN_MS = 60_000;
let liveDownUntil = 0;

function baseUrl(): string | null {
  const url = process.env.AI_SERVICE_URL?.trim();
  return url ? url.replace(/\/+$/, "") : null;
}

function headers(): Record<string, string> {
  return { "content-type": "application/json", "x-service-key": process.env.AI_SERVICE_KEY ?? "" };
}

export function liveModeEnabled(): boolean {
  return process.env.AI_SERVICE_DB_MODE?.trim().toLowerCase() !== "off" && baseUrl() !== null;
}

/** GET sur un endpoint /v1/live/* ; null si indisponible (puis pause d'une minute). */
export async function fetchLive<T>(path: string): Promise<T | null> {
  const url = baseUrl();

  if (!url || !liveModeEnabled() || Date.now() < liveDownUntil) return null;

  try {
    const response = await fetch(`${url}${path}`, { headers: headers(), signal: AbortSignal.timeout(25_000) });

    if (!response.ok) {
      liveDownUntil = Date.now() + COOLDOWN_MS;

      const detail = await response.text().catch(() => "");
      logger.warn(`ai-service ${path} : HTTP ${response.status} ${detail.slice(0, 160)} — repli sur l'envoi de données.`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    liveDownUntil = Date.now() + COOLDOWN_MS;
    logger.warn(`ai-service ${path} injoignable — repli sur l'envoi de données.`, error instanceof Error ? error.message : error);
    return null;
  }
}

/** POST de données vers le service Python ; null si indisponible. */
export async function postPython<T>(path: string, body: unknown): Promise<T | null> {
  const url = baseUrl();

  if (!url) return null;

  try {
    const response = await fetch(`${url}${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      logger.warn(`ai-service ${path} : HTTP ${response.status}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    logger.warn(`ai-service ${path} injoignable.`, error instanceof Error ? error.message : error);
    return null;
  }
}
