/**
 * Comparaison de TOUS les types d'apprentissage sur les ménages de la base de données :
 *   - régression logistique (SGD)         - réseau de neurones profond (MLP)
 *   - Bayes naïf gaussien                 - k plus proches voisins (k-NN)
 *   - ensemble (moyenne des quatre)
 *
 * Pour chaque méthode : validation croisée stratifiée (prédictions hors échantillon), courbe ROC,
 * métriques, histogramme des scores, courbe d'apprentissage et importance des variables.
 * Puis : variables COMMUNES à toutes les méthodes, ménages sur lesquels toutes les méthodes sont
 * d'accord, et meilleur modèle (AUC la plus élevée aux tests).
 *
 * Aucun code existant n'est modifié : ce module s'appuie sur ./ml et ./vulnerability.
 */
import { db } from "../utils/db";
import { FEATURE_NAMES, imputeMatrix, loadHouseholds } from "./vulnerability";
import {
  Matrix,
  Metrics,
  applyScaler,
  computeMetrics,
  fitScaler,
  makeRng,
  predictLogistic,
  predictMlp,
  stratifiedFolds,
  trainLogistic,
  trainMlp,
} from "./ml";

export type Predictor = (x: number[]) => number;
export type Trainer = (X: Matrix, y: number[]) => Predictor;

export interface Point { x: number; y: number }

export interface MethodResult {
  key: string;
  name: string;
  kind: string;
  /** Métriques sur les prédictions hors échantillon (validation croisée) = « test » */
  metrics: Metrics;
  cv: { aucMean: number; aucStd: number; foldAucs: number[] };
  /** AUC du modèle final sur ses propres données d'entraînement (écart avec le test = sur-apprentissage) */
  trainAuc: number;
  roc: Point[];
  histogram: { edges: number[]; positives: number[]; negatives: number[] };
  learning: Array<{ fraction: number; nTrain: number; trainAuc: number | null; valAuc: number | null }>;
  importance: Array<{ feature: string; value: number }>;
}

export interface ComparisonReport {
  available: boolean;
  reason?: string;
  generatedAt: string;
  sampleSize: number;
  positives: number;
  folds: number;
  reliability: "INSUFFISANTE" | "FAIBLE" | "CORRECTE";
  methods: MethodResult[];
  baseline: Metrics;
  best: { key: string; name: string; auc: number; f1: number; accuracy: number } | null;
  ranking: Array<{ key: string; name: string; auc: number; f1: number; accuracy: number; rank: number }>;
  common: {
    /** Variables classées dans le top 5 par TOUTES les méthodes */
    inAllMethods: string[];
    top: Array<{ feature: string; mean: number; agreement: number; perMethod: Record<string, number> }>;
  };
  consensusHouseholds: Array<{
    id: number; name: string; projectName: string; flagged: boolean; ensemble: number; scores: Record<string, number>;
  }>;
  disagreements: Array<{
    id: number; name: string; projectName: string; flagged: boolean; spread: number; scores: Record<string, number>;
  }>;
  /** Ménages signalés « vulnérables » au moment du test (liste figée avec l'enregistrement) */
  vulnerableHouseholds?: VulnerableRow[];
}

export interface VulnerableRow {
  id: number;
  name: string;
  projectName: string;
  locality: string | null;
  ensemble: number;
  scores: Record<string, number>;
}

/* ------------------------------ méthodes ------------------------------ */

export function gaussianNb(X: Matrix, y: number[]): Predictor {
  const d = X[0].length;

  const stats = [0, 1].map((c) => {
    const rows = X.filter((_, i) => y[i] === c);
    const n = rows.length || 1;
    const mean = Array.from({ length: d }, (_, j) => rows.reduce((s, r) => s + r[j], 0) / n);
    const variance = Array.from({ length: d }, (_, j) => rows.reduce((s, r) => s + (r[j] - mean[j]) ** 2, 0) / n + 1e-2);

    return { prior: (rows.length + 1) / (y.length + 2), mean, variance };
  });

  return (x) => {
    const ll = stats.map(
      (s) =>
        Math.log(s.prior) +
        x.reduce((acc, v, j) => acc - 0.5 * Math.log(2 * Math.PI * s.variance[j]) - (v - s.mean[j]) ** 2 / (2 * s.variance[j]), 0),
    );

    const m = Math.max(ll[0], ll[1]);
    const e0 = Math.exp(ll[0] - m);
    const e1 = Math.exp(ll[1] - m);

    return e1 / (e0 + e1);
  };
}

export function knn(X: Matrix, y: number[]): Predictor {
  const root = Math.round(Math.sqrt(X.length));
  const k = Math.max(3, Math.min(9, root % 2 ? root : root + 1));

  return (x) => {
    const nearest = X.map((row, i) => ({
      d: Math.sqrt(row.reduce((s, v, j) => s + (v - x[j]) ** 2, 0)),
      y: y[i],
    }))
      .sort((a, b) => a.d - b.d)
      .slice(0, Math.min(k, X.length));

    let positive = 0;
    let total = 0;

    nearest.forEach((n) => {
      const w = 1 / (n.d + 0.1);
      total += w;
      if (n.y === 1) positive += w;
    });

    return (positive + 0.25) / (total + 0.5);
  };
}

export function methodTrainers(n: number): Array<{ key: string; name: string; kind: string; train: Trainer }> {
  const epochs = n > 600 ? 120 : n > 250 ? 250 : 500;

  return [
    {
      key: "sgd",
      name: "Régression logistique (SGD)",
      kind: "logistic-sgd",
      train: (X, y) => {
        const m = trainLogistic(X, y);
        return (x) => predictLogistic(m, x);
      },
    },
    {
      key: "mlp",
      name: "Réseau de neurones (MLP)",
      kind: "mlp-deep",
      train: (X, y) => {
        const m = trainMlp(X, y, { epochs });
        return (x) => predictMlp(m, x);
      },
    },
    { key: "nb", name: "Bayes naïf gaussien", kind: "naive-bayes", train: gaussianNb },
    { key: "knn", name: "k plus proches voisins", kind: "knn", train: knn },
  ];
}

/* ------------------------------ utilitaires ------------------------------ */

const round = (v: number, digits = 3) => Math.round(v * 10 ** digits) / 10 ** digits;
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

function aucOf(probs: number[], labels: number[]): number | null {
  if (new Set(labels).size < 2) return null;
  return computeMetrics(probs, labels).auc;
}

function downsample<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

function rocCurve(probs: number[], labels: number[]): Point[] {
  const nPos = labels.filter((v) => v === 1).length;
  const nNeg = labels.length - nPos;
  const order = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);

  const points: Point[] = [{ x: 0, y: 0 }];
  let tp = 0;
  let fp = 0;

  order.forEach((index, t) => {
    if (labels[index] === 1) tp++;
    else fp++;

    const last = t === order.length - 1 || probs[order[t + 1]] !== probs[index];
    if (last) points.push({ x: round(nNeg ? fp / nNeg : 0), y: round(nPos ? tp / nPos : 0) });
  });

  return downsample(points, 60);
}

function histogram(probs: number[], labels: number[], bins = 10) {
  const positives = new Array(bins).fill(0);
  const negatives = new Array(bins).fill(0);

  probs.forEach((p, i) => {
    const bin = Math.min(bins - 1, Math.max(0, Math.floor(p * bins)));
    if (labels[i] === 1) positives[bin]++;
    else negatives[bin]++;
  });

  return { edges: Array.from({ length: bins + 1 }, (_, i) => round(i / bins, 2)), positives, negatives };
}

/** Importance par permutation : baisse d'AUC quand on mélange une variable. */
function permutationImportance(predict: Predictor, Z: Matrix, y: number[], seed: number): number[] {
  const rng = makeRng(seed);
  const size = Math.min(Z.length, 200);
  const idx = Z.map((_, i) => i).sort(() => rng() - 0.5).slice(0, size);
  const rows = idx.map((i) => Z[i]);
  const labels = idx.map((i) => y[i]);
  const base = aucOf(rows.map(predict), labels);

  if (base === null) return new Array(Z[0].length).fill(0);

  return Array.from({ length: Z[0].length }, (_, j) => {
    let drop = 0;
    const repeats = 4;

    for (let r = 0; r < repeats; r++) {
      const column = rows.map((row) => row[j]).sort(() => rng() - 0.5);
      const probs = rows.map((row, i) => predict(row.map((v, k) => (k === j ? column[i] : v))));
      drop += base - (aucOf(probs, labels) ?? base);
    }

    return Math.max(0, drop / repeats);
  });
}

function normalize(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  return values.map((v) => (total > 0 ? v / total : 0));
}

/* ------------------------------ comparaison ------------------------------ */

export async function compareLearningMethods(): Promise<ComparisonReport> {
  const households = await loadHouseholds();
  const y = households.map((h) => (h.vulnerable ? 1 : 0));
  const n = households.length;
  const positives = y.filter((v) => v === 1).length;
  const generatedAt = new Date().toISOString();

  const baseline = computeMetrics(y.map(() => (positives > n / 2 ? 1 : 0)), y);

  const empty: ComparisonReport = {
    available: false,
    generatedAt,
    sampleSize: n,
    positives,
    folds: 0,
    reliability: "INSUFFISANTE",
    methods: [],
    baseline,
    best: null,
    ranking: [],
    common: { inAllMethods: [], top: [] },
    consensusHouseholds: [],
    disagreements: [],
  };

  if (n < 10 || positives < 3 || n - positives < 3) {
    return { ...empty, reason: "Données insuffisantes : il faut au moins 10 bénéficiaires dont 3 vulnérables et 3 non vulnérables." };
  }

  const { X } = imputeMatrix(households.map((h) => h.raw));
  const folds = Math.max(2, Math.min(5, Math.floor(Math.min(positives, n - positives) / 2)));
  const trainers = methodTrainers(n);
  const foldSets = stratifiedFolds(y, folds);

  /* 1) Validation croisée : prédictions hors échantillon pour chaque méthode */
  const oof: Record<string, number[]> = {};
  const foldAuc: Record<string, number[]> = {};

  trainers.forEach((t) => {
    oof[t.key] = new Array(n).fill(0.5);
    foldAuc[t.key] = [];
  });

  foldSets.forEach((testIdx) => {
    const testSet = new Set(testIdx);
    const trainIdx = X.map((_, i) => i).filter((i) => !testSet.has(i));
    const trainY = trainIdx.map((i) => y[i]);

    if (new Set(trainY).size < 2) return;

    const scaler = fitScaler(trainIdx.map((i) => X[i]));
    const trainX = trainIdx.map((i) => applyScaler(X[i], scaler));

    trainers.forEach((t) => {
      const predict = t.train(trainX, trainY);
      testIdx.forEach((i) => {
        oof[t.key][i] = predict(applyScaler(X[i], scaler));
      });

      const auc = aucOf(testIdx.map((i) => oof[t.key][i]), testIdx.map((i) => y[i]));
      if (auc !== null) foldAuc[t.key].push(auc);
    });
  });

  oof.ensemble = oof.sgd.map((_, i) => mean(trainers.map((t) => oof[t.key][i])));

  /* 2) Modèles finaux (toutes les données) : sur-apprentissage, importance, ménages */
  const scaler = fitScaler(X);
  const Z = X.map((row) => applyScaler(row, scaler));
  const finals = trainers.map((t) => ({ ...t, predict: t.train(Z, y) }));
  const ensemblePredict: Predictor = (x) => mean(finals.map((f) => f.predict(x)));

  /* 3) Courbes d'apprentissage : taille d'entraînement croissante, validation fixe */
  const split = stratifiedFolds(y, 3, 11);
  const valIdx = split[0];
  const valSet = new Set(valIdx);
  const poolIdx = X.map((_, i) => i).filter((i) => !valSet.has(i));
  const rng = makeRng(5);
  const shuffled = (list: number[]) => [...list].sort(() => rng() - 0.5);
  const poolPos = shuffled(poolIdx.filter((i) => y[i] === 1));
  const poolNeg = shuffled(poolIdx.filter((i) => y[i] === 0));
  const fractions = [0.25, 0.5, 0.75, 1];

  const learning: Record<string, MethodResult["learning"]> = {};
  [...trainers.map((t) => t.key), "ensemble"].forEach((key) => (learning[key] = []));

  fractions.forEach((fraction) => {
    const take = (list: number[]) => list.slice(0, Math.max(Math.min(2, list.length), Math.ceil(list.length * fraction)));
    const subset = [...take(poolPos), ...take(poolNeg)];
    const subY = subset.map((i) => y[i]);

    if (new Set(subY).size < 2) return;

    const sc = fitScaler(subset.map((i) => X[i]));
    const subX = subset.map((i) => applyScaler(X[i], sc));
    const valX = valIdx.map((i) => applyScaler(X[i], sc));
    const valY = valIdx.map((i) => y[i]);

    const predictors = trainers.map((t) => t.train(subX, subY));
    const trainProbs = predictors.map((p) => subX.map(p));
    const valProbs = predictors.map((p) => valX.map(p));

    const push = (key: string, tp: number[], vp: number[]) =>
      learning[key].push({
        fraction,
        nTrain: subset.length,
        trainAuc: (() => { const a = aucOf(tp, subY); return a === null ? null : round(a); })(),
        valAuc: (() => { const a = aucOf(vp, valY); return a === null ? null : round(a); })(),
      });

    trainers.forEach((t, k) => push(t.key, trainProbs[k], valProbs[k]));
    push("ensemble", subX.map((_, i) => mean(trainProbs.map((p) => p[i]))), valX.map((_, i) => mean(valProbs.map((p) => p[i]))));
  });

  /* 4) Résultats par méthode (+ ensemble) */
  const build = (key: string, name: string, kind: string, predict: Predictor): MethodResult => {
    const probs = oof[key];
    const metrics = computeMetrics(probs, y);
    const folds = foldAuc[key] ?? [];
    const meanAuc = key === "ensemble" ? metrics.auc : mean(folds);
    const sd = Math.sqrt(mean((folds.length ? folds : [metrics.auc]).map((v) => (v - meanAuc) ** 2)));
    const raw = permutationImportance(predict, Z, y, key.length * 97 + 13);

    return {
      key,
      name,
      kind,
      metrics: {
        accuracy: round(metrics.accuracy),
        precision: round(metrics.precision),
        recall: round(metrics.recall),
        f1: round(metrics.f1),
        auc: round(metrics.auc),
      },
      cv: { aucMean: round(meanAuc), aucStd: round(sd), foldAucs: folds.map((v) => round(v)) },
      trainAuc: round(aucOf(Z.map(predict), y) ?? 0.5),
      roc: rocCurve(probs, y),
      histogram: histogram(probs, y),
      learning: learning[key] ?? [],
      importance: FEATURE_NAMES.map((feature, j) => ({ feature, value: round(raw[j], 4) })),
    };
  };

  const methods: MethodResult[] = [
    ...finals.map((f) => build(f.key, f.name, f.kind, f.predict)),
    build("ensemble", "Ensemble (moyenne des 4 méthodes)", "ensemble", ensemblePredict),
  ];

  /* 5) Meilleur modèle (AUC aux tests, puis F1) */
  const ranking = [...methods]
    .sort((a, b) => b.metrics.auc - a.metrics.auc || b.metrics.f1 - a.metrics.f1)
    .map((m, i) => ({ key: m.key, name: m.name, auc: m.metrics.auc, f1: m.metrics.f1, accuracy: m.metrics.accuracy, rank: i + 1 }));

  /* 6) Ce qui est COMMUN à toutes les méthodes (hors ensemble) */
  const singles = methods.filter((m) => m.key !== "ensemble");
  const normalized = singles.map((m) => normalize(m.importance.map((i) => i.value)));
  const topSets = normalized.map((vals) =>
    new Set(vals.map((v, j) => ({ v, j })).sort((a, b) => b.v - a.v).slice(0, 5).filter((e) => e.v > 0).map((e) => e.j)),
  );

  const topFeatures = FEATURE_NAMES.map((feature, j) => ({
    feature,
    mean: round(mean(normalized.map((vals) => vals[j]))),
    agreement: topSets.filter((s) => s.has(j)).length,
    perMethod: Object.fromEntries(singles.map((m, k) => [m.key, round(normalized[k][j])])),
  }))
    .sort((a, b) => b.agreement - a.agreement || b.mean - a.mean)
    .slice(0, 8);

  const inAllMethods = FEATURE_NAMES.filter((_, j) => topSets.every((s) => s.has(j)));

  /* 7) Ménages : accord / désaccord entre méthodes */
  const scored = households.map((h, i) => {
    const scores: Record<string, number> = {};
    finals.forEach((f) => (scores[f.key] = Math.round(f.predict(Z[i]) * 100)));
    const values = Object.values(scores);

    return {
      id: h.id,
      name: h.name,
      projectName: h.projectName,
      locality: h.locality,
      flagged: h.vulnerable,
      ensemble: Math.round(mean(values)),
      spread: Math.max(...values) - Math.min(...values),
      scores,
      allAgree: values.every((v) => v >= 50),
    };
  });

  const consensusHouseholds = scored
    .filter((s) => s.allAgree)
    .sort((a, b) => b.ensemble - a.ensemble)
    .slice(0, 12)
    .map(({ id, name, projectName, flagged, ensemble, scores }) => ({ id, name, projectName, flagged, ensemble, scores }));

  const disagreements = [...scored]
    .sort((a, b) => b.spread - a.spread)
    .filter((s) => s.spread >= 30)
    .slice(0, 8)
    .map(({ id, name, projectName, flagged, spread, scores }) => ({ id, name, projectName, flagged, spread, scores }));

  const vulnerableHouseholds: VulnerableRow[] = scored
    .filter((s) => s.flagged)
    .sort((a, b) => b.ensemble - a.ensemble)
    .slice(0, 200)
    .map(({ id, name, projectName, locality, ensemble, scores }) => ({ id, name, projectName, locality, ensemble, scores }));

  const best = ranking[0] ? { key: ranking[0].key, name: ranking[0].name, auc: ranking[0].auc, f1: ranking[0].f1, accuracy: ranking[0].accuracy } : null;

  return {
    available: true,
    generatedAt,
    sampleSize: n,
    positives,
    folds,
    reliability: n >= 300 && positives >= 40 ? "CORRECTE" : n >= 100 ? "FAIBLE" : "INSUFFISANTE",
    methods,
    baseline,
    best,
    ranking,
    common: { inAllMethods, top: topFeatures },
    consensusHouseholds,
    disagreements,
    vulnerableHouseholds,
  };
}

/* ------------------------------ base de données ------------------------------ */

/** Lance la comparaison et l'enregistre dans la table AiModel (historique des entraînements). */
export async function runAndStoreComparison(): Promise<ComparisonReport> {
  const report = await compareLearningMethods();

  if (report.available && report.best) {
    const bestMethod = report.methods.find((m) => m.key === report.best?.key);

    await db.aiModel.create({
      data: {
        name: "comparison-best",
        kind: "comparison",
        sampleSize: report.sampleSize,
        // Même forme que les autres modèles (Metrics) pour s'afficher dans l'historique existant
        metrics: { ...(bestMethod?.metrics ?? {}), best: report.best.name },
        weights: report,
      },
    });
  }

  return report;
}

/** Dernière comparaison enregistrée (ou null). */
export async function latestComparison(): Promise<ComparisonReport | null> {
  const row = await db.aiModel.findFirst({ where: { name: "comparison-best" }, orderBy: { trainedAt: "desc" } });
  return (row?.weights as ComparisonReport | undefined) ?? null;
}

/** Évolution (AUC, exactitude) de chaque modèle enregistré : courbe dans le temps. */
export async function modelHistory() {
  const rows = (await db.aiModel.findMany({
    orderBy: { trainedAt: "asc" },
    take: 200,
    select: { id: true, name: true, kind: true, sampleSize: true, metrics: true, trainedAt: true },
  })) as Array<{ id: number; name: string; kind: string; sampleSize: number; metrics: Partial<Metrics>; trainedAt: Date }>;

  const series: Record<string, Array<{ at: string; auc: number | null; accuracy: number | null; sampleSize: number }>> = {};

  rows.forEach((r) => {
    (series[r.name] ??= []).push({
      at: new Date(r.trainedAt).toISOString(),
      auc: typeof r.metrics?.auc === "number" ? r.metrics.auc : null,
      accuracy: typeof r.metrics?.accuracy === "number" ? r.metrics.accuracy : null,
      sampleSize: r.sampleSize,
    });
  });

  return Object.entries(series).map(([name, points]) => ({ name, points: points.slice(-30) }));
}

/** Historique des tests : chaque comparaison enregistrée (résumé), du plus récent au plus ancien. */
export async function comparisonHistory(limit = 30) {
  const rows = await db.aiModel.findMany({
    where: { name: "comparison-best" },
    orderBy: { trainedAt: "desc" },
    take: limit,
    select: { id: true, sampleSize: true, trainedAt: true, weights: true },
  });

  // Anciens tests (avant l'enregistrement de la liste) : on propose la liste actuelle des ménages vulnérables
  let current: VulnerableRow[] | null = null;
  const currentList = async (): Promise<VulnerableRow[]> => {
    if (current) return current;
    const households = await loadHouseholds();
    current = households
      .filter((h) => h.vulnerable)
      .map((h) => ({ id: h.id, name: h.name, projectName: h.projectName, locality: h.locality, ensemble: 0, scores: {} }));
    return current;
  };

  const out = [];

  for (const r of rows as Array<{ id: number; sampleSize: number; trainedAt: Date; weights: unknown }>) {
    const w = (r.weights ?? {}) as Partial<ComparisonReport>;
    const saved = Array.isArray(w.vulnerableHouseholds);

    out.push({
      id: r.id,
      at: new Date(r.trainedAt).toISOString(),
      sampleSize: r.sampleSize,
      positives: w.positives ?? null,
      folds: w.folds ?? null,
      reliability: w.reliability ?? null,
      best: w.best ?? null,
      ranking: (w.ranking ?? []).map((x) => ({ key: x.key, name: x.name, auc: x.auc, f1: x.f1, accuracy: x.accuracy, rank: x.rank })),
      vulnerableSource: saved ? "saved" : "current",
      vulnerableHouseholds: saved ? (w.vulnerableHouseholds as VulnerableRow[]) : await currentList(),
    });
  }

  return out;
}

/** Supprime un enregistrement de la table AiModel (entraînement ou test de comparaison). */
export async function deleteStoredModel(id: number): Promise<{ deleted: number }> {
  const res = await db.aiModel.deleteMany({ where: { id } });
  return { deleted: res.count };
}