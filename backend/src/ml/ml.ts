/**
 * Apprentissage automatique « maison » (aucune dépendance) :
 *  - régression logistique entraînée par DESCENTE DE GRADIENT STOCHASTIQUE (SGD)
 *  - réseau de neurones profond (perceptron multicouche, rétropropagation,
 *    SGD par mini-lots avec momentum et régularisation L2)
 *  - validation croisée et métriques (exactitude, précision, rappel, F1, AUC)
 */

export type Matrix = number[][];

export function makeRng(seed: number): () => number {
  let s = seed | 0;

  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(indices: number[], rng: () => number): number[] {
  const copy = [...indices];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));

/* ------------------------------ normalisation ------------------------------ */

export interface Scaler {
  mean: number[];
  std: number[];
}

export function fitScaler(X: Matrix): Scaler {
  const d = X[0]?.length ?? 0;
  const mean = new Array(d).fill(0);
  const std = new Array(d).fill(1);

  for (let j = 0; j < d; j++) {
    mean[j] = X.reduce((sum, row) => sum + row[j], 0) / X.length;
    const variance = X.reduce((sum, row) => sum + (row[j] - mean[j]) ** 2, 0) / X.length;
    std[j] = Math.sqrt(variance) || 1;
  }

  return { mean, std };
}

export const applyScaler = (x: number[], s: Scaler) =>
  x.map((value, j) => (value - s.mean[j]) / s.std[j]);

/* ------------------- régression logistique (SGD) ------------------- */

export interface LogisticModel {
  w: number[];
  b: number;
}

export interface SgdOptions {
  epochs?: number;
  lr?: number;
  l2?: number;
  seed?: number;
}

export function trainLogistic(X: Matrix, y: number[], options: SgdOptions = {}): LogisticModel {
  const { epochs = 400, lr = 0.1, l2 = 0.001, seed = 42 } = options;
  const rng = makeRng(seed);
  const d = X[0].length;
  const w = new Array(d).fill(0);
  let b = 0;

  // Pondération des classes (jeux déséquilibrés)
  const pos = y.filter((v) => v === 1).length || 1;
  const neg = y.length - pos || 1;
  const posWeight = Math.min(10, Math.max(1, neg / pos));

  const order = X.map((_, i) => i);

  for (let epoch = 0; epoch < epochs; epoch++) {
    const rate = lr / (1 + 0.01 * epoch); // décroissance du pas

    for (const i of shuffle(order, rng)) {
      const z = b + X[i].reduce((sum, v, j) => sum + v * w[j], 0);
      const error = (sigmoid(z) - y[i]) * (y[i] === 1 ? posWeight : 1);

      for (let j = 0; j < d; j++) {
        w[j] -= rate * (error * X[i][j] + l2 * w[j]);
      }

      b -= rate * error;
    }
  }

  return { w, b };
}

export const predictLogistic = (m: LogisticModel, x: number[]) =>
  sigmoid(m.b + x.reduce((sum, v, j) => sum + v * m.w[j], 0));

/* ---------------- réseau de neurones profond (MLP) ---------------- */

export interface MlpModel {
  sizes: number[];
  W: number[][][]; // W[couche][neurone][entrée]
  B: number[][];
}

export interface MlpOptions {
  hidden?: number[];
  epochs?: number;
  lr?: number;
  momentum?: number;
  batch?: number;
  l2?: number;
  seed?: number;
}

function forward(model: MlpModel, x: number[]): number[][] {
  const activations: number[][] = [x];
  const layers = model.W.length;

  for (let l = 0; l < layers; l++) {
    const prev = activations[l];

    const out = model.W[l].map((weights, j) => {
      const z = model.B[l][j] + weights.reduce((sum, w, i) => sum + w * prev[i], 0);
      return l === layers - 1 ? sigmoid(z) : Math.max(0, z); // ReLU puis sigmoïde
    });

    activations.push(out);
  }

  return activations;
}

export function trainMlp(X: Matrix, y: number[], options: MlpOptions = {}): MlpModel {
  const {
    hidden = [16, 8],
    epochs = 500,
    lr = 0.03,
    momentum = 0.9,
    batch = 8,
    l2 = 0.0005,
    seed = 7,
  } = options;

  const rng = makeRng(seed);
  const sizes = [X[0].length, ...hidden, 1];

  // Initialisation de He
  const W = sizes.slice(1).map((out, l) =>
    Array.from({ length: out }, () =>
      Array.from({ length: sizes[l] }, () => (rng() * 2 - 1) * Math.sqrt(6 / sizes[l])),
    ),
  );
  const B = sizes.slice(1).map((out) => new Array(out).fill(0));

  const vW = W.map((layer) => layer.map((row) => row.map(() => 0)));
  const vB = B.map((layer) => layer.map(() => 0));

  const pos = y.filter((v) => v === 1).length || 1;
  const neg = y.length - pos || 1;
  const posWeight = Math.min(10, Math.max(1, neg / pos));

  const model: MlpModel = { sizes, W, B };
  const order = X.map((_, i) => i);
  const layers = W.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const rate = lr / (1 + 0.005 * epoch);
    const shuffled = shuffle(order, rng);

    for (let start = 0; start < shuffled.length; start += batch) {
      const chunk = shuffled.slice(start, start + batch);

      const gW = W.map((layer) => layer.map((row) => row.map(() => 0)));
      const gB = B.map((layer) => layer.map(() => 0));

      for (const i of chunk) {
        const acts = forward(model, X[i]);
        let delta = [(acts[layers][0] - y[i]) * (y[i] === 1 ? posWeight : 1)];

        for (let l = layers - 1; l >= 0; l--) {
          const prev = acts[l];
          const nextDelta = new Array(sizes[l]).fill(0);

          for (let j = 0; j < sizes[l + 1]; j++) {
            gB[l][j] += delta[j];

            for (let k = 0; k < sizes[l]; k++) {
              gW[l][j][k] += delta[j] * prev[k];
              nextDelta[k] += W[l][j][k] * delta[j];
            }
          }

          if (l > 0) {
            delta = nextDelta.map((value, k) => (acts[l][k] > 0 ? value : 0));
          }
        }
      }

      const n = chunk.length;

      for (let l = 0; l < layers; l++) {
        for (let j = 0; j < sizes[l + 1]; j++) {
          vB[l][j] = momentum * vB[l][j] - rate * (gB[l][j] / n);
          B[l][j] += vB[l][j];

          for (let k = 0; k < sizes[l]; k++) {
            vW[l][j][k] = momentum * vW[l][j][k] - rate * (gW[l][j][k] / n + l2 * W[l][j][k]);
            W[l][j][k] += vW[l][j][k];
          }
        }
      }
    }
  }

  return model;
}

export const predictMlp = (m: MlpModel, x: number[]) => {
  const acts = forward(m, x);
  return acts[acts.length - 1][0];
};

/* ----------------------------- métriques ----------------------------- */

export interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
}

export function computeMetrics(probs: number[], labels: number[]): Metrics {
  let tp = 0, fp = 0, tn = 0, fn = 0;

  probs.forEach((p, i) => {
    const pred = p >= 0.5 ? 1 : 0;
    if (pred === 1 && labels[i] === 1) tp++;
    else if (pred === 1) fp++;
    else if (labels[i] === 1) fn++;
    else tn++;
  });

  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;

  // AUC par somme des rangs (Mann–Whitney)
  const ranked = probs.map((p, i) => ({ p, y: labels[i] })).sort((a, b) => a.p - b.p);
  let rankSum = 0;
  ranked.forEach((item, index) => {
    if (item.y === 1) rankSum += index + 1;
  });
  const nPos = labels.filter((v) => v === 1).length;
  const nNeg = labels.length - nPos;
  const auc = nPos && nNeg ? (rankSum - (nPos * (nPos + 1)) / 2) / (nPos * nNeg) : 0.5;

  return {
    accuracy: (tp + tn) / Math.max(1, probs.length),
    precision,
    recall,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    auc,
  };
}

/** Plis stratifiés pour la validation croisée. */
export function stratifiedFolds(y: number[], k: number, seed = 1): number[][] {
  const rng = makeRng(seed);
  const folds: number[][] = Array.from({ length: k }, () => []);

  [0, 1].forEach((cls) => {
    const indices = shuffle(
      y.map((v, i) => (v === cls ? i : -1)).filter((i) => i >= 0),
      rng,
    );
    indices.forEach((index, position) => folds[position % k].push(index));
  });

  return folds;
}

export type Trainer = (X: Matrix, y: number[]) => (x: number[]) => number;

export function crossValidate(X: Matrix, y: number[], k: number, trainer: Trainer): Metrics {
  const folds = stratifiedFolds(y, k);
  const probs: number[] = [];
  const labels: number[] = [];

  folds.forEach((testIdx, f) => {
    const testSet = new Set(testIdx);
    const trainIdx = X.map((_, i) => i).filter((i) => !testSet.has(i));

    const trainX = trainIdx.map((i) => X[i]);
    const trainY = trainIdx.map((i) => y[i]);

    if (new Set(trainY).size < 2) return;

    const scaler = fitScaler(trainX);
    const predict = trainer(
      trainX.map((row) => applyScaler(row, scaler)),
      trainY,
    );

    testIdx.forEach((i) => {
      probs.push(predict(applyScaler(X[i], scaler)));
      labels.push(y[i]);
    });

    void f;
  });

  return computeMetrics(probs, labels);
}
