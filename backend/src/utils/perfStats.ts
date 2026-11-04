/** Statistiques de temps de réponse par route (p50 / p95 / max), en mémoire, sans dépendance. */

const MAX_SAMPLES = 500;
const samples = new Map<string, number[]>();
const counts = new Map<string, { total: number; slow: number; errors: number }>();

/** /api/users/12/edit → /api/users/:id/edit (évite une clé par identifiant) */
export function normalizeRoute(method: string, path: string): string {
  const clean = path.split("?")[0].replace(/\/[0-9]+(?=\/|$)/g, "/:id").replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi, "/:uuid");
  return `${method.toUpperCase()} ${clean}`;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function recordSample(key: string, ms: number, status: number, slowMs: number): void {
  const arr = samples.get(key) ?? [];
  arr.push(ms);
  if (arr.length > MAX_SAMPLES) arr.shift();
  samples.set(key, arr);
  const c = counts.get(key) ?? { total: 0, slow: 0, errors: 0 };
  c.total += 1;
  if (ms > slowMs) c.slow += 1;
  if (status >= 500) c.errors += 1;
  counts.set(key, c);
}

export interface RouteStat { route: string; count: number; p50: number; p95: number; max: number; slow: number; errors: number }

export function snapshot(): RouteStat[] {
  return [...samples.entries()]
    .map(([route, arr]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const c = counts.get(route)!;
      return {
        route, count: c.total,
        p50: Math.round(percentile(sorted, 50)), p95: Math.round(percentile(sorted, 95)),
        max: Math.round(sorted[sorted.length - 1] ?? 0), slow: c.slow, errors: c.errors,
      };
    })
    .sort((a, b) => b.p95 - a.p95);
}

export function resetPerfStats(): void { samples.clear(); counts.clear(); }
