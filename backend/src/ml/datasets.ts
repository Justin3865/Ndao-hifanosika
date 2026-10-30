/**
 * Jeux de données d'apprentissage : liste d'ENTRAÎNEMENT / liste de TEST pour chaque source.
 *
 *   - households : ménages enquêtés par les agents          → étiquette « vulnérable »
 *   - interns    : stagiaires (Suivi & Évaluation stage)     → étiquette « en difficulté » (note moyenne < 12/20)
 *   - projects   : projets (Suivi & Évaluation des projets)  → étiquette « en retard » (écart réel/prévu ≤ -10 pts)
 *
 * Pour chaque source : tirage stratifié entraînement / test (par défaut 70 % / 30 %), entraînement des
 * 4 méthodes (SGD, MLP, Bayes naïf, k-NN) + ensemble sur la liste d'entraînement UNIQUEMENT, puis
 * évaluation sur la liste de test (jamais vue pendant l'entraînement). Les lignes sans résultat connu
 * (stagiaire non encore évalué, projet sans écart calculable…) sont notées par le modèle : ce sont les
 * données « à tester ».
 *
 * Aucun code existant n'est modifié, hors l'export de 3 fonctions de ./compare.
 */
import { db } from "../utils/db";
import { computeMonitoring, loadAllProjectContexts } from "../services/monitoring.service";
import { loadInternshipsMonitoring } from "../services/internshipMonitoring.service";
import { FEATURE_NAMES, imputeMatrix, loadHouseholds } from "./vulnerability";
import { Matrix, Metrics, applyScaler, computeMetrics, fitScaler, makeRng } from "./ml";
import { methodTrainers } from "./compare";

export type DatasetKind = "households" | "interns" | "projects";
export const DATASET_KINDS: DatasetKind[] = ["households", "interns", "projects"];

export const isDatasetKind = (v: string): v is DatasetKind => (DATASET_KINDS as string[]).includes(v);

/** Seuil de la note moyenne (/20) en dessous duquel un stagiaire est « en difficulté ». */
export const INTERN_PASS_MARK = 12;
/** Écart réel − prévu (points) en dessous duquel un projet est « en retard » (= LATE / CRITICAL). */
export const PROJECT_LATE_GAP = -10;

export interface RawRow {
  id: number;
  name: string;
  context: string;
  link: string;
  label: 0 | 1 | null;
  values: Array<number | null>;
}

export interface DatasetDef {
  kind: DatasetKind;
  title: string;
  description: string;
  labelRule: string;
  positiveText: string;
  negativeText: string;
  featureNames: string[];
  load: () => Promise<RawRow[]>;
}

const round = (v: number, digits = 3) => Math.round(v * 10 ** digits) / 10 ** digits;
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const pctOf = (a: number, b: number): number | null => (b > 0 ? (a / b) * 100 : null);

/* ------------------------------ définitions ------------------------------ */

const HOUSEHOLDS: DatasetDef = {
  kind: "households",
  title: "Ménages (enquêtes terrain)",
  description: "Ménages visités par un agent en mission : l'enquête fournit le signalement « vulnérable » (résultat connu).",
  labelRule: "Vulnérable = signalement de l'agent lors de la dernière enquête.",
  positiveText: "Vulnérable",
  negativeText: "Non vulnérable",
  featureNames: FEATURE_NAMES,
  load: async () => {
    const all = await loadHouseholds();
    return all
      .filter((h) => h.surveyed)
      .map((h) => ({
        id: h.id,
        name: h.name,
        context: h.projectName,
        link: `/beneficiaries/${h.id}`,
        label: (h.vulnerable ? 1 : 0) as 0 | 1,
        values: h.raw,
      }));
  },
};

const INTERNS: DatasetDef = {
  kind: "interns",
  title: "Stagiaires (Suivi & Évaluation)",
  description:
    "Stages en cours ou terminés. Les variables viennent du suivi (tâches, rapports, preuves, présence GPS) ; le résultat connu vient des évaluations du tuteur.",
  labelRule: `En difficulté = note moyenne des évaluations < ${INTERN_PASS_MARK}/20. Les stagiaires sans évaluation sont notés par le modèle.`,
  positiveText: "En difficulté",
  negativeText: "Satisfaisant",
  featureNames: [
    "Avancement des tâches (%)",
    "Tâches en retard (%)",
    "Tâches bloquées (%)",
    "Rapports fournis (%)",
    "Preuves fournies (%)",
    "Présence terrain (%)",
    "Temps écoulé du stage (%)",
    "Nombre de tâches",
    "Check-ins GPS",
  ],
  load: async () => {
    const rows = await loadInternshipsMonitoring({});

    return rows
      .filter((r) => r.internship.status === "IN_PROGRESS" || r.internship.status === "COMPLETED")
      .map(({ internship: i, metrics: m }) => {
        const avg20 = m.evaluations.averageOn20;
        const elapsed = i.status === "COMPLETED" ? 100 : m.time.elapsedPct;

        return {
          id: i.id,
          name: `${i.student.firstName} ${i.student.lastName}`,
          context: i.title,
          link: `/internships/${i.id}`,
          label: (avg20 === null ? null : avg20 < INTERN_PASS_MARK ? 1 : 0) as 0 | 1 | null,
          values: [
            m.components.tasks,
            pctOf(m.tasks.overdue, m.tasks.total),
            pctOf(m.tasks.blocked, m.tasks.total),
            m.components.reports,
            m.evidencePct,
            m.components.presence,
            elapsed,
            m.tasks.total,
            m.presence.gpsCheckins,
          ],
        };
      });
  },
};

const PROJECTS: DatasetDef = {
  kind: "projects",
  title: "Projets (Suivi & Évaluation)",
  description:
    "Projets suivis dans le module Suivi & Évaluation. Les variables décrivent le calendrier, le budget, les jalons et les évaluations ; le résultat connu est la tendance calculée par le S&E.",
  labelRule: `En retard = écart (avancement réel − prévu) ≤ ${Math.abs(PROJECT_LATE_GAP)} points (tendance « en retard » ou « critique »).`,
  positiveText: "En retard",
  negativeText: "Dans les temps",
  featureNames: [
    "Temps écoulé (%)",
    "Exécution budgétaire (%)",
    "Bénéficiaires atteints (%)",
    "Note moyenne des évaluations (%)",
    "Jalons en retard (%)",
    "Activités en retard (%)",
    "Nombre d'activités",
    "Nombre de jalons",
    "Nombre d'indicateurs",
    "Budget prévu (log)",
    "Projet suspendu",
  ],
  load: async () => {
    const projects = await loadAllProjectContexts();

    return projects
      .filter((p) => p.status !== "DRAFT" && p.status !== "CANCELLED")
      .map((p) => {
        const m = computeMonitoring(p);

        return {
          id: p.id,
          name: p.name,
          context: p.code ?? `Projet #${p.id}`,
          link: `/projects/${p.id}`,
          label: (m.gap === null ? null : m.gap <= PROJECT_LATE_GAP ? 1 : 0) as 0 | 1 | null,
          values: [
            m.time.elapsedPct,
            m.budget.executionPct,
            m.beneficiaries.progress,
            m.components.evaluations,
            pctOf(m.counts.milestonesOverdue, m.counts.milestones),
            pctOf(m.counts.activitiesLate, m.counts.activities),
            m.counts.activities,
            m.counts.milestones,
            m.counts.indicators,
            m.budget.planned !== null ? Math.log1p(m.budget.planned) : null,
            p.status === "SUSPENDED" ? 1 : 0,
          ],
        };
      });
  },
};

export const DEFS: Record<DatasetKind, DatasetDef> = { households: HOUSEHOLDS, interns: INTERNS, projects: PROJECTS };

/* ------------------------------ rapport ------------------------------ */

export interface DatasetRow {
  id: number;
  name: string;
  context: string;
  link: string;
  /** 1 / 0 = résultat connu ; null = inconnu (ligne à tester) */
  label: 0 | 1 | null;
  labelText: string | null;
  /** Score en % par méthode + ensemble */
  scores: Record<string, number>;
  ensemble: number;
  predicted: 0 | 1;
  predictedText: string;
  /** true/false si le résultat est connu, null sinon */
  correct: boolean | null;
  values: Record<string, number | null>;
}

export interface DatasetMethod {
  key: string;
  name: string;
  test: Metrics;
  train: Metrics;
  /** AUC entraînement − AUC test : un écart élevé = sur-apprentissage */
  overfit: number;
}

export interface DatasetReport {
  available: boolean;
  reason?: string;
  kind: DatasetKind;
  title: string;
  description: string;
  labelRule: string;
  positiveText: string;
  negativeText: string;
  generatedAt: string;
  seed: number;
  testRatio: number;
  featureNames: string[];
  counts: {
    total: number;
    labeled: number;
    train: number;
    test: number;
    unlabeled: number;
    positives: number;
    trainPositives: number;
    testPositives: number;
  };
  reliability: "INSUFFISANTE" | "FAIBLE" | "CORRECTE";
  methods: DatasetMethod[];
  baselineTest: Metrics;
  best: { key: string; name: string; auc: number; f1: number; accuracy: number } | null;
  /** Matrice de confusion de l'ensemble sur la liste de test */
  confusion: { tp: number; fp: number; tn: number; fn: number };
  train: DatasetRow[];
  test: DatasetRow[];
  unlabeled: DatasetRow[];
  runId?: number;
}

const ROW_CAP = 1000;

export function stratifiedSplit(y: number[], testRatio: number, seed: number): { train: number[]; test: number[] } {
  const rng = makeRng(seed);
  const train: number[] = [];
  const test: number[] = [];

  [0, 1].forEach((cls) => {
    const idx = y.map((v, i) => (v === cls ? i : -1)).filter((i) => i >= 0);

    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }

    // au moins 1 ligne de test et 2 lignes d'entraînement par classe
    const nTest = Math.max(1, Math.min(idx.length - 2, Math.round(idx.length * testRatio)));
    test.push(...idx.slice(0, nTest));
    train.push(...idx.slice(nTest));
  });

  return { train: train.sort((a, b) => a - b), test: test.sort((a, b) => a - b) };
}

const roundMetrics = (m: Metrics): Metrics => ({
  accuracy: round(m.accuracy),
  precision: round(m.precision),
  recall: round(m.recall),
  f1: round(m.f1),
  auc: round(m.auc),
});

export async function runDataset(
  kind: DatasetKind,
  options: { seed?: number; testRatio?: number } = {},
): Promise<DatasetReport> {
  const def = DEFS[kind];
  const seed = Number.isFinite(options.seed) ? Math.trunc(options.seed as number) : 42;
  const testRatio = Math.min(0.5, Math.max(0.1, options.testRatio ?? 0.3));

  const rows = await def.load();
  const labeled = rows.filter((r) => r.label !== null);
  const unlabeledRows = rows.filter((r) => r.label === null);
  const y = labeled.map((r) => r.label as number);
  const positives = y.filter((v) => v === 1).length;
  const n = labeled.length;

  const emptyMetrics: Metrics = { accuracy: 0, precision: 0, recall: 0, f1: 0, auc: 0.5 };

  const base: DatasetReport = {
    available: false,
    kind,
    title: def.title,
    description: def.description,
    labelRule: def.labelRule,
    positiveText: def.positiveText,
    negativeText: def.negativeText,
    generatedAt: new Date().toISOString(),
    seed,
    testRatio,
    featureNames: def.featureNames,
    counts: {
      total: rows.length,
      labeled: n,
      train: 0,
      test: 0,
      unlabeled: unlabeledRows.length,
      positives,
      trainPositives: 0,
      testPositives: 0,
    },
    reliability: "INSUFFISANTE",
    methods: [],
    baselineTest: emptyMetrics,
    best: null,
    confusion: { tp: 0, fp: 0, tn: 0, fn: 0 },
    train: [],
    test: [],
    unlabeled: [],
  };

  if (n < 10 || positives < 3 || n - positives < 3) {
    return {
      ...base,
      reason: `Données insuffisantes : il faut au moins 10 lignes avec résultat connu, dont 3 « ${def.positiveText.toLowerCase()} » et 3 « ${def.negativeText.toLowerCase()} » (actuellement ${n} dont ${positives} « ${def.positiveText.toLowerCase()} »).`,
    };
  }

  const split = stratifiedSplit(y, testRatio, seed);
  const trainRows = split.train.map((i) => labeled[i]);
  const testRows = split.test.map((i) => labeled[i]);
  const trainY = split.train.map((i) => y[i]);
  const testY = split.test.map((i) => y[i]);

  // Imputation et normalisation apprises sur l'ENTRAÎNEMENT uniquement (pas de fuite vers le test)
  const { X: trainX, columnMeans } = imputeMatrix(trainRows.map((r) => r.values));
  const scaler = fitScaler(trainX);
  const Ztrain: Matrix = trainX.map((row) => applyScaler(row, scaler));

  const trainers = methodTrainers(trainRows.length);
  const predictors = trainers.map((t) => ({ key: t.key, name: t.name, predict: t.train(Ztrain, trainY) }));

  const scoreRow = (values: Array<number | null>) => {
    const { X } = imputeMatrix([values], columnMeans);
    const z = applyScaler(X[0], scaler);
    const per: Record<string, number> = {};
    predictors.forEach((p) => (per[p.key] = p.predict(z)));
    return { per, ensemble: mean(Object.values(per)) };
  };

  const toRow = (r: RawRow): DatasetRow => {
    const s = scoreRow(r.values);
    const predicted = (s.ensemble >= 0.5 ? 1 : 0) as 0 | 1;

    return {
      id: r.id,
      name: r.name,
      context: r.context,
      link: r.link,
      label: r.label,
      labelText: r.label === null ? null : r.label === 1 ? def.positiveText : def.negativeText,
      scores: Object.fromEntries(Object.entries(s.per).map(([k, v]) => [k, Math.round(v * 100)])),
      ensemble: Math.round(s.ensemble * 100),
      predicted,
      predictedText: predicted === 1 ? def.positiveText : def.negativeText,
      correct: r.label === null ? null : r.label === predicted,
      values: Object.fromEntries(def.featureNames.map((f, j) => [f, r.values[j] === null || r.values[j] === undefined ? null : round(r.values[j] as number, 2)])),
    };
  };

  const trainOut = trainRows.map(toRow);
  const testOut = testRows.map(toRow);
  const unlabeledOut = unlabeledRows.map(toRow);

  /* Métriques : test (jamais vu) et entraînement, par méthode et pour l'ensemble */
  const probsOf = (list: RawRow[], key: string): number[] =>
    list.map((r) => {
      const s = scoreRow(r.values);
      return key === "ensemble" ? s.ensemble : s.per[key];
    });

  const keys = [...predictors.map((p) => ({ key: p.key, name: p.name })), { key: "ensemble", name: "Ensemble (moyenne des 4 méthodes)" }];

  const methods: DatasetMethod[] = keys.map(({ key, name }) => {
    const test = roundMetrics(computeMetrics(probsOf(testRows, key), testY));
    const train = roundMetrics(computeMetrics(probsOf(trainRows, key), trainY));
    return { key, name, test, train, overfit: round(train.auc - test.auc) };
  });

  const ranked = [...methods].sort((a, b) => b.test.auc - a.test.auc || b.test.f1 - a.test.f1);
  const top = ranked[0];

  const confusion = { tp: 0, fp: 0, tn: 0, fn: 0 };
  testOut.forEach((r) => {
    if (r.label === 1 && r.predicted === 1) confusion.tp++;
    else if (r.label === 0 && r.predicted === 1) confusion.fp++;
    else if (r.label === 0) confusion.tn++;
    else confusion.fn++;
  });

  const majority = trainY.filter((v) => v === 1).length > trainY.length / 2 ? 1 : 0;

  return {
    ...base,
    available: true,
    counts: {
      ...base.counts,
      train: trainOut.length,
      test: testOut.length,
      trainPositives: trainY.filter((v) => v === 1).length,
      testPositives: testY.filter((v) => v === 1).length,
    },
    reliability: n >= 300 && positives >= 40 ? "CORRECTE" : n >= 100 ? "FAIBLE" : "INSUFFISANTE",
    methods,
    baselineTest: roundMetrics(computeMetrics(testY.map(() => majority), testY)),
    best: { key: top.key, name: top.name, auc: top.test.auc, f1: top.test.f1, accuracy: top.test.accuracy },
    confusion,
    train: trainOut.slice(0, ROW_CAP),
    test: testOut.slice(0, ROW_CAP),
    unlabeled: unlabeledOut.slice(0, ROW_CAP),
  };
}

/* ------------------------------ base de données ------------------------------ */

const modelName = (kind: DatasetKind) => `dataset-${kind}`;

/** Lance l'entraînement + le test et l'enregistre (table AiModel : historique des entraînements). */
export async function runAndStoreDataset(
  kind: DatasetKind,
  options: { seed?: number; testRatio?: number } = {},
): Promise<DatasetReport> {
  const report = await runDataset(kind, options);

  if (!report.available || !report.best) return report;

  const best = report.methods.find((m) => m.key === report.best?.key);

  const row = await db.aiModel.create({
    data: {
      name: modelName(kind),
      kind: "dataset-holdout",
      sampleSize: report.counts.labeled,
      metrics: { ...(best?.test ?? {}), best: report.best.name },
      weights: report,
    },
  });

  return { ...report, runId: row.id };
}

export async function latestDataset(kind: DatasetKind): Promise<DatasetReport | null> {
  const row = await db.aiModel.findFirst({ where: { name: modelName(kind) }, orderBy: { trainedAt: "desc" } });
  return row ? { ...(row.weights as DatasetReport), runId: row.id } : null;
}

export async function datasetRun(id: number): Promise<DatasetReport | null> {
  const row = await db.aiModel.findFirst({ where: { id, name: { startsWith: "dataset-" } } });
  return row ? { ...(row.weights as DatasetReport), runId: row.id } : null;
}

/** Historique résumé (sans les listes) d'une source, du plus récent au plus ancien. */
export async function datasetHistory(kind: DatasetKind, limit = 30) {
  const rows = (await db.aiModel.findMany({
    where: { name: modelName(kind) },
    orderBy: { trainedAt: "desc" },
    take: limit,
    select: { id: true, sampleSize: true, trainedAt: true, weights: true },
  })) as Array<{ id: number; sampleSize: number; trainedAt: Date; weights: Partial<DatasetReport> | null }>;

  return rows.map((r) => ({
    id: r.id,
    at: new Date(r.trainedAt).toISOString(),
    sampleSize: r.sampleSize,
    seed: r.weights?.seed ?? null,
    counts: r.weights?.counts ?? null,
    reliability: r.weights?.reliability ?? null,
    best: r.weights?.best ?? null,
  }));
}

/** Vue d'ensemble : pour chaque source, effectifs actuels et dernier test enregistré. */
export async function datasetsOverview() {
  return Promise.all(
    DATASET_KINDS.map(async (kind) => {
      const def = DEFS[kind];
      let labeled = 0;
      let unlabeled = 0;
      let positives = 0;

      try {
        const rows = await def.load();
        labeled = rows.filter((r) => r.label !== null).length;
        unlabeled = rows.length - labeled;
        positives = rows.filter((r) => r.label === 1).length;
      } catch {
        // une source indisponible ne doit pas bloquer les autres
      }

      const last = (await datasetHistory(kind, 1))[0] ?? null;

      return {
        kind,
        title: def.title,
        description: def.description,
        labelRule: def.labelRule,
        positiveText: def.positiveText,
        negativeText: def.negativeText,
        current: { labeled, unlabeled, positives },
        last,
      };
    }),
  );
}
