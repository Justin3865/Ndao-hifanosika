import { logger } from "../config/logger";

export interface ServiceProbe {
  name: string;
  url: string | null;
  status: "online" | "offline" | "not_configured";
  latencyMs: number | null;
  detail?: unknown;
  error?: string;
}

function baseUrl(envName: string): string | null {
  const raw = process.env[envName]?.trim();

  return raw ? raw.replace(/\/$/, "") : null;
}

/** Interroge GET {url}/health d'un micro-service FastAPI. */
async function probe(name: string, envName: string): Promise<ServiceProbe> {
  const url = baseUrl(envName);

  if (!url) {
    return { name, url: null, status: "not_configured", latencyMs: null };
  }

  const started = Date.now();

  try {
    const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2500) });
    const latencyMs = Date.now() - started;

    if (!response.ok) {
      return { name, url, status: "offline", latencyMs, error: `HTTP ${response.status}` };
    }

    return { name, url, status: "online", latencyMs, detail: await response.json().catch(() => null) };
  } catch (error) {
    return {
      name,
      url,
      status: "offline",
      latencyMs: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function probeAiServices(): Promise<ServiceProbe[]> {
  return Promise.all([
    probe("ai-service", "AI_SERVICE_URL"),
    probe("ml-service", "ML_SERVICE_URL"),
  ]);
}

/**
 * Demande au service ML (scikit-learn) de s'entraîner sur le jeu de données du backend.
 * Retourne null si le service n'est pas configuré ; { error } s'il échoue (non bloquant).
 */
export async function trainExternalMl(): Promise<Record<string, unknown> | null> {
  const url = baseUrl("ML_SERVICE_URL");

  if (!url) return null;

  try {
    const response = await fetch(`${url}/train`, {
      method: "POST",
      headers: { "x-service-key": process.env.AI_SERVICE_KEY ?? "" },
      signal: AbortSignal.timeout(120_000),
    });

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      return { error: String(body.detail ?? `HTTP ${response.status}`) };
    }

    return body;
  } catch (error) {
    logger.error("Entraînement ml-service impossible", error);

    return { error: error instanceof Error ? error.message : String(error) };
  }
}
