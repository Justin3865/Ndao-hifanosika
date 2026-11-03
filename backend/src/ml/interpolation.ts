/**
 * Interpolation & optimisation de courbes — Lagrange (forme barycentrique) et Hermite cubique par morceaux.
 *
 * Utilisé par « Analyses IA → Courbes (Lagrange / Hermite) » avec :
 *   - les notes de l'évaluation finale des PROJETS (/20) ou leur avancement S&E (%),
 *   - les notes de l'évaluation finale des STAGIAIRES (/20) (une personne = un point).
 *
 * Aucune dépendance externe.
 */

export interface Pt {
  x: number;
  y: number;
  label?: string;
}

export type CurveMethod = "lagrange" | "hermite";

export interface Optimum {
  max: { x: number; y: number };
  min: { x: number; y: number };
}

export interface LooResult {
  /** erreur quadratique moyenne en validation « leave-one-out » (points intérieurs) */
  rmse: number | null;
  mae: number | null;
  /** nombre de points testés */
  tested: number;
}

export interface CurveResult {
  method: CurveMethod;
  samples: Array<{ x: number; y: number }>;
  optimum: Optimum;
  loo: LooResult;
  /** le polynôme dépasse les bornes (phénomène de Runge) : la courbe affichée est écrêtée */
  clamped: boolean;
  /** valeur prévue au prochain point (x_dernier + pas moyen), écrêtée aux bornes */
  forecast: { x: number; y: number } | null;
}

export interface Analysis {
  n: number;
  domain: [number, number];
  bounds: [number, number];
  nodes: Pt[];
  curves: CurveResult[];
  /** méthode retenue (plus petite erreur LOO ; Hermite par défaut si égalité ou n < 4) */
  best: CurveMethod;
  warnings: string[];
}

const EPS = 1e-12;

/** Trie par x et fusionne les x identiques (moyenne des y). */
export function normalizeNodes(points: Pt[]): Pt[] {
  const clean = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).sort((a, b) => a.x - b.x);
  const out: Array<Pt & { count: number }> = [];

  for (const p of clean) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < EPS) {
      last.y = (last.y * last.count + p.y) / (last.count + 1);
      last.count += 1;
      last.label = last.label && p.label ? `${last.label} + ${p.label}` : last.label ?? p.label;
    } else {
      out.push({ ...p, count: 1 });
    }
  }

  return out.map(({ count: _count, ...p }) => p);
}

/* ------------------------------------------------------------------ Lagrange */

/** Polynôme de Lagrange (formule barycentrique, stable) passant par tous les nœuds. */
export function lagrange(nodes: Pt[]): (x: number) => number {
  const n = nodes.length;
  if (n === 0) return () => 0;
  if (n === 1) return () => nodes[0].y;

  const w = nodes.map((pj, j) => {
    let prod = 1;
    for (let k = 0; k < n; k += 1) if (k !== j) prod *= pj.x - nodes[k].x;
    return 1 / prod;
  });

  return (x: number) => {
    let num = 0;
    let den = 0;
    for (let j = 0; j < n; j += 1) {
      const d = x - nodes[j].x;
      if (Math.abs(d) < EPS) return nodes[j].y;
      const t = w[j] / d;
      num += t * nodes[j].y;
      den += t;
    }
    return num / den;
  };
}

/* ------------------------------------------------------------------ Hermite */

/**
 * Pentes de Fritsch–Carlson (PCHIP) : dérivées « raisonnables » qui évitent les dépassements
 * (la courbe reste monotone entre deux points monotones).
 */
export function pchipSlopes(nodes: Pt[]): number[] {
  const n = nodes.length;
  if (n < 2) return new Array(n).fill(0);

  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    h.push(nodes[i + 1].x - nodes[i].x);
    delta.push((nodes[i + 1].y - nodes[i].y) / h[i]);
  }

  if (n === 2) return [delta[0], delta[0]];

  const m = new Array<number>(n).fill(0);

  for (let i = 1; i < n - 1; i += 1) {
    if (delta[i - 1] * delta[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
    }
  }

  const edge = (h0: number, h1: number, d0: number, d1: number) => {
    let s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(s) !== Math.sign(d0)) s = 0;
    else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(s) > 3 * Math.abs(d0)) s = 3 * d0;
    return s;
  };

  m[0] = edge(h[0], h[1], delta[0], delta[1]);
  m[n - 1] = edge(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);

  return m;
}

/**
 * Hermite cubique par morceaux : passe par chaque (x_i, y_i) AVEC la dérivée m_i.
 * Sans dérivées fournies, on prend les pentes PCHIP.
 */
export function hermite(nodes: Pt[], slopes?: number[]): (x: number) => number {
  const n = nodes.length;
  if (n === 0) return () => 0;
  if (n === 1) return () => nodes[0].y;

  const m = slopes && slopes.length === n ? slopes : pchipSlopes(nodes);

  return (x: number) => {
    // dehors du domaine : prolongement par la tangente du bord
    if (x <= nodes[0].x) return nodes[0].y + m[0] * (x - nodes[0].x);
    if (x >= nodes[n - 1].x) return nodes[n - 1].y + m[n - 1] * (x - nodes[n - 1].x);

    let i = 0;
    while (i < n - 2 && x > nodes[i + 1].x) i += 1;

    const h = nodes[i + 1].x - nodes[i].x;
    const t = (x - nodes[i].x) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    return h00 * nodes[i].y + h10 * h * m[i] + h01 * nodes[i + 1].y + h11 * h * m[i + 1];
  };
}

/* ------------------------------------------------------------------ Outils */

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(Math.max(v, lo), hi);

export function sampleCurve(fn: (x: number) => number, x0: number, x1: number, count = 160): Array<{ x: number; y: number }> {
  if (x1 - x0 < EPS) return [{ x: x0, y: fn(x0) }];
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / count;
    return { x, y: fn(x) };
  });
}

export function findOptimum(samples: Array<{ x: number; y: number }>): Optimum {
  let max = samples[0];
  let min = samples[0];
  for (const s of samples) {
    if (s.y > max.y) max = s;
    if (s.y < min.y) min = s;
  }
  return { max: { x: max.x, y: max.y }, min: { x: min.x, y: min.y } };
}

/** Validation « leave-one-out » : on retire chaque point intérieur et on mesure l'erreur de re-prédiction. */
export function leaveOneOut(nodes: Pt[], build: (nodes: Pt[]) => (x: number) => number): LooResult {
  if (nodes.length < 4) return { rmse: null, mae: null, tested: 0 };

  let sq = 0;
  let abs = 0;
  let tested = 0;

  for (let i = 1; i < nodes.length - 1; i += 1) {
    const rest = nodes.filter((_, k) => k !== i);
    const predicted = build(rest)(nodes[i].x);
    const err = predicted - nodes[i].y;
    sq += err * err;
    abs += Math.abs(err);
    tested += 1;
  }

  return { rmse: Math.sqrt(sq / tested), mae: abs / tested, tested };
}

const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

/**
 * Analyse complète d'une série : courbe de Lagrange ET d'Hermite, optimum (max/min), erreur LOO,
 * prévision du prochain point, choix de la meilleure méthode.
 *
 * @param bounds bornes physiques de la mesure (ex. [0, 20] pour une note, [0, 100] pour un avancement)
 * @param slopes dérivées connues pour Hermite (facultatif)
 */
export function analyse(points: Pt[], bounds: [number, number], methods: CurveMethod[] = ["lagrange", "hermite"], slopes?: number[]): Analysis {
  const nodes = normalizeNodes(points);
  const n = nodes.length;
  const warnings: string[] = [];

  if (n < 2) {
    return { n, domain: [nodes[0]?.x ?? 0, nodes[0]?.x ?? 0], bounds, nodes, curves: [], best: "hermite", warnings: ["Au moins 2 points sont nécessaires pour tracer une courbe."] };
  }

  const x0 = nodes[0].x;
  const x1 = nodes[n - 1].x;
  const step = (x1 - x0) / (n - 1);

  if (n > 8) warnings.push(`Lagrange avec ${n} points = polynôme de degré ${n - 1} : il oscille près des bords (phénomène de Runge). Hermite reste stable.`);

  const builders: Record<CurveMethod, (list: Pt[]) => (x: number) => number> = {
    lagrange: (list) => lagrange(list),
    hermite: (list) => hermite(list),
  };

  const curves: CurveResult[] = methods.map((method) => {
    const fn = method === "hermite" && slopes ? hermite(nodes, slopes) : builders[method](nodes);
    const raw = sampleCurve(fn, x0, x1);
    const clamped = raw.some((s) => s.y < bounds[0] - EPS || s.y > bounds[1] + EPS);
    const samples = raw.map((s) => ({ x: round(s.x), y: round(clamp(s.y, bounds)) }));

    // prévision au prochain point : Hermite = tendance du dernier segment, Lagrange = polynôme (instable hors domaine)
    const fx = x1 + step;
    const lastSecant = (nodes[n - 1].y - nodes[n - 2].y) / (nodes[n - 1].x - nodes[n - 2].x);
    // Hermite : tendance du dernier segment (pas de tangente qui s'emballe) ; Lagrange : le polynôme lui-même
    const forecastY = clamp(method === "hermite" ? nodes[n - 1].y + lastSecant * step : fn(fx), bounds);

    return {
      method,
      samples,
      optimum: findOptimum(samples),
      loo: leaveOneOut(nodes, builders[method]),
      clamped,
      forecast: { x: round(fx), y: round(forecastY) },
    };
  });

  for (const c of curves) {
    if (c.method === "lagrange" && c.clamped) warnings.push("La courbe de Lagrange dépasse les bornes de la mesure : elle est écrêtée à l'affichage.");
  }

  let best: CurveMethod = "hermite";
  const lag = curves.find((c) => c.method === "lagrange");
  const her = curves.find((c) => c.method === "hermite");
  if (lag?.loo.rmse != null && her?.loo.rmse != null && lag.loo.rmse < her.loo.rmse) best = "lagrange";
  if (!her && lag) best = "lagrange";

  return { n, domain: [x0, x1], bounds, nodes: nodes.map((p) => ({ ...p, x: round(p.x), y: round(p.y) })), curves, best, warnings };
}
