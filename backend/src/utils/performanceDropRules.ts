// src/utils/performanceDropRules.ts  (AJOUT) — « performance en baisse » (cahier §5.3). Logique pure, sans dépendance.
// Compare la dernière note au niveau des notes précédentes. Indépendant du barème (/20, /100…) car relatif.
// Seuils PAR DÉFAUT à valider par la Direction (LOT 11).

export interface ScorePoint { at: Date; score: number }
export interface DropOptions { minPrevious: number; window: number; dropRatio: number }
export interface DropResult { dropped: boolean; last: number | null; baseline: number | null; dropPercent: number | null; used: number }

export const DEFAULT_DROP: DropOptions = { minPrevious: 2, window: 3, dropRatio: 0.2 };

export function dropOptionsFromEnv(env: Record<string, string | undefined> = process.env): DropOptions {
  const ratio = Number(env.PERF_DROP_RATIO);
  const minPrev = Number(env.PERF_DROP_MIN_PREVIOUS);
  return {
    ...DEFAULT_DROP,
    dropRatio: Number.isFinite(ratio) && ratio > 0 && ratio < 1 ? ratio : DEFAULT_DROP.dropRatio,
    minPrevious: Number.isInteger(minPrev) && minPrev >= 1 ? minPrev : DEFAULT_DROP.minPrevious,
  };
}

export function detectDrop(points: ScorePoint[], opts: DropOptions = DEFAULT_DROP): DropResult {
  const clean = points.filter((p) => Number.isFinite(p.score)).sort((a, b) => a.at.getTime() - b.at.getTime());
  if (clean.length < opts.minPrevious + 1) return { dropped: false, last: null, baseline: null, dropPercent: null, used: clean.length };
  const last = clean[clean.length - 1].score;
  const previous = clean.slice(0, -1).slice(-opts.window);
  const baseline = previous.reduce((s, p) => s + p.score, 0) / previous.length;
  if (baseline <= 0) return { dropped: false, last, baseline, dropPercent: null, used: clean.length };
  const drop = (baseline - last) / baseline;
  const round = (n: number) => Math.round(n * 10) / 10;
  return { dropped: drop >= opts.dropRatio, last: round(last), baseline: round(baseline), dropPercent: round(drop * 100), used: clean.length };
}
