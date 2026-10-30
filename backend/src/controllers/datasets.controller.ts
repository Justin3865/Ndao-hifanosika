import { Request, Response } from "express";
import { logger } from "../config/logger";
import { sendError } from "../middlewares/error.middleware";
import {
  datasetHistory,
  datasetRun,
  datasetsOverview,
  isDatasetKind,
  latestDataset,
  runAndStoreDataset,
} from "../ml/datasets";

/**
 * Jeux de données d'apprentissage (ménages, stagiaires, Suivi & Évaluation des projets) :
 * liste d'entraînement, liste de test, résultats par méthode. Routes montées sur /api/ai.
 */

const bad = (res: Response, message: string) => res.status(400).json({ success: false, message });

export async function getDatasets(_req: Request, res: Response) {
  try {
    res.json({ success: true, data: await datasetsOverview() });
  } catch (error) {
    logger.error("Erreur jeux de données", error);
    sendError(res, error, "Erreur lors du chargement des jeux de données");
  }
}

export async function getDatasetLatest(req: Request, res: Response) {
  const kind = String(req.params.kind);
  if (!isDatasetKind(kind)) return bad(res, "Source inconnue");

  try {
    res.json({ success: true, data: await latestDataset(kind) });
  } catch (error) {
    logger.error("Erreur dernier test", error);
    sendError(res, error, "Erreur lors de la lecture du dernier test");
  }
}

export async function getDatasetHistory(req: Request, res: Response) {
  const kind = String(req.params.kind);
  if (!isDatasetKind(kind)) return bad(res, "Source inconnue");

  try {
    res.json({ success: true, data: await datasetHistory(kind) });
  } catch (error) {
    logger.error("Erreur historique jeux de données", error);
    sendError(res, error, "Erreur lors de l'historique");
  }
}

export async function getDatasetRun(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return bad(res, "Identifiant invalide");

  try {
    const run = await datasetRun(id);
    if (!run) return res.status(404).json({ success: false, message: "Test introuvable" });
    res.json({ success: true, data: run });
  } catch (error) {
    logger.error("Erreur lecture test", error);
    sendError(res, error, "Erreur lors de la lecture du test");
  }
}

/** Corps : { shuffle?: boolean (nouveau tirage aléatoire), seed?: number, testRatio?: 0.1–0.5 } */
export async function runDatasetTest(req: Request, res: Response) {
  const kind = String(req.params.kind);
  if (!isDatasetKind(kind)) return bad(res, "Source inconnue");

  try {
    const body = (req.body ?? {}) as { shuffle?: boolean; seed?: unknown; testRatio?: unknown };
    const seed = body.shuffle ? Math.floor(Math.random() * 1_000_000) : Number.isFinite(Number(body.seed)) && body.seed !== undefined ? Number(body.seed) : undefined;
    const ratio = Number(body.testRatio);

    res.json({
      success: true,
      data: await runAndStoreDataset(kind, { seed, testRatio: Number.isFinite(ratio) && ratio > 0 ? ratio : undefined }),
    });
  } catch (error) {
    logger.error("Erreur entraînement jeu de données", error);
    sendError(res, error, "Erreur lors de l'entraînement et du test");
  }
}
