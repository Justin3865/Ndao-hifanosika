// src/routes/aiDropout.routes.ts  (AJOUT — aucune route existante modifiée)
// Pilotage du modèle de risque d'abandon du service ML depuis la plateforme :
//   POST /api/ai/dropout/train   (ADMIN, DSI)                  -> ml_service POST /v1/train/dropout
//   GET  /api/ai/dropout/report  (ADMIN, DIRECTION, DSI)       -> ml_service GET  /v1/dropout/report
// Le service ML n'est jamais exposé au navigateur : tout passe par ce backend (cahier des charges §7.3).
// Tant que le verdict n'est pas « retenu », le score à règles reste la référence (dégradation gracieuse).

import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

function mlBase(): string | null {
  const raw = process.env.ML_SERVICE_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

async function callMl(path: string, method: "GET" | "POST", timeoutMs: number) {
  const base = mlBase();
  if (!base) return { status: 503, body: { success: false, message: "ML_SERVICE_URL non configuré." } };
  try {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-service-key": process.env.AI_SERVICE_KEY ?? "" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const detail = typeof payload.detail === "string" ? payload.detail : `ml_service HTTP ${response.status}`;
      // 422 = données insuffisantes : message métier lisible, pas une panne.
      return { status: response.status === 422 ? 422 : 502, body: { success: false, message: detail } };
    }
    return { status: 200, body: { success: true, data: payload } };
  } catch {
    return { status: 503, body: { success: false, message: "Service ML indisponible." } };
  }
}

router.post("/dropout/train", authenticate, authorizeRoles("ADMIN", "DSI"), async (_req, res) => {
  const result = await callMl("/v1/train/dropout", "POST", 120_000);
  res.status(result.status).json(result.body);
});

router.get("/dropout/report", authenticate, authorizeRoles("ADMIN", "DIRECTION", "DSI"), async (_req, res) => {
  const result = await callMl("/v1/dropout/report", "GET", 10_000);
  res.status(result.status).json(result.body);
});

export default router;
