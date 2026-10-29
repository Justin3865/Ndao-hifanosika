import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";
import { runAnomalyAlerts } from "../controllers/anomalyAlerts.controller";

/* ===================================================================
 * Anomalies en TEMPS RÉEL
 *
 * Dès qu'une donnée métier est créée / modifiée / supprimée via l'API
 * (projet, jalon, activité, évaluation, bénéficiaire, stage, utilisateur…),
 * une analyse est programmée :
 *   - anti-rebond (DEBOUNCE_MS) : plusieurs modifications rapprochées = 1 analyse
 *   - intervalle minimal (MIN_GAP_MS) entre deux analyses
 *   - les anomalies déjà notifiées ne sont pas renvoyées (délai de 72 h,
 *     géré par runAnomalyAlerts)
 * Les notifications partent ensuite en temps réel (socket « notification:new »)
 * et la page « Détection d'anomalies » se rafraîchit seule (« anomaly:run »).
 *
 * .env (facultatif) :
 *   ANOMALY_REALTIME=false        -> désactive le déclenchement automatique
 *   ANOMALY_DEBOUNCE_SECONDS=8    -> attente après la dernière modification
 *   ANOMALY_MIN_GAP_SECONDS=30    -> intervalle minimal entre deux analyses
 * =================================================================== */

const ENABLED = String(process.env.ANOMALY_REALTIME ?? "true").toLowerCase() !== "false";
const DEBOUNCE_MS = Number(process.env.ANOMALY_DEBOUNCE_SECONDS ?? 8) * 1000;
const MIN_GAP_MS = Number(process.env.ANOMALY_MIN_GAP_SECONDS ?? 30) * 1000;

const DEFAULT_MIN = (["HIGH", "MEDIUM", "LOW"] as const).includes(process.env.ANOMALY_MIN_SEVERITY as "HIGH")
  ? (process.env.ANOMALY_MIN_SEVERITY as "HIGH" | "MEDIUM" | "LOW")
  : "MEDIUM";

/** Ressources dont la modification peut faire apparaître une anomalie. */
const WATCHED = [
  "/api/projects",
  "/api/activities",
  "/api/milestones",
  "/api/evaluations",
  "/api/evaluation-campaigns",
  "/api/beneficiaries",
  "/api/internships",
  "/api/internship-offers",
  "/api/members",
  "/api/users",
  "/api/vulnerability",
  "/api/elevation",
];

let timer: ReturnType<typeof setTimeout> | undefined;
let lastRun = 0;
let pending = false;

async function execute(): Promise<void> {
  pending = false;
  lastRun = Date.now();

  try {
    await runAnomalyAlerts({ minSeverity: DEFAULT_MIN, dryRun: false, source: "auto" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Une analyse est déjà en cours : on reprogramme pour ne rien perdre
    if (message.includes("déjà en cours")) {
      scheduleAnomalyCheck("reprise");
      return;
    }

    logger.error("Analyse temps réel des anomalies en échec", error);
  }
}

/** Programme une analyse (fusionne les demandes rapprochées). */
export function scheduleAnomalyCheck(reason = "modification"): void {
  if (!ENABLED) return;

  pending = true;
  if (timer) clearTimeout(timer);

  const wait = Math.max(DEBOUNCE_MS, MIN_GAP_MS - (Date.now() - lastRun));

  timer = setTimeout(() => {
    timer = undefined;
    if (pending) void execute();
  }, wait);

  timer.unref?.();
  logger.info(`Analyse d'anomalies programmée dans ${Math.round(wait / 1000)} s (${reason})`);
}

/** Middleware Express : après une écriture réussie sur une ressource surveillée. */
export function anomalyWatcher(req: Request, res: Response, next: NextFunction): void {
  if (!ENABLED || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();

  res.on("finish", () => {
    if (res.statusCode >= 400) return;

    const path = req.originalUrl.split("?")[0];
    if (WATCHED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      scheduleAnomalyCheck(`${req.method} ${path}`);
    }
  });

  next();
}

export function isAnomalyRealtimeEnabled(): boolean {
  return ENABLED;
}

/** Au démarrage : une première analyse peu après le lancement du serveur. */
export function startAnomalyRealtime(): void {
  if (!ENABLED) {
    logger.info("Anomalies temps réel désactivées (ANOMALY_REALTIME=false)");
    return;
  }

  setTimeout(() => scheduleAnomalyCheck("démarrage"), 20_000).unref?.();
  logger.success(`Anomalies en temps réel actives (anti-rebond ${DEBOUNCE_MS / 1000} s)`);
}
