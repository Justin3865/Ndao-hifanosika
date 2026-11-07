import { haversineKm } from "../ml/geo";

/**
 * Nettoyage d'un tracé GPS et calcul de distance.
 * FICHIER NOUVEAU : un ordinateur ou un téléphone mal localisé (Wi-Fi / antenne, précision de 100 m ou plus)
 * « saute » de plusieurs centaines de mètres ; sans filtre, ces sauts s'ajoutent à la distance.
 */

export interface TrackPoint {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  createdAt: Date;
}

/** Au-delà de cette précision (rayon d'erreur), le point est jugé trop imprécis pour compter. */
export const MAX_ACCURACY_M = 100;
/** Vitesse maximale plausible entre deux points (km/h) : au-delà = saut GPS. */
export const MAX_SPEED_KMH = 120;
/** Mouvement minimal pris en compte (m) : en dessous, c'est le bruit du GPS. */
export const MIN_STEP_M = 15;

const meters = (a: TrackPoint, b: TrackPoint) => haversineKm(a.latitude, a.longitude, b.latitude, b.longitude) * 1000;

/** Retire les points imprécis, les sauts impossibles et les pics isolés (aller-retour de quelques centaines de mètres). */
export function cleanTrack<T extends TrackPoint>(points: T[]): T[] {
  if (points.length < 3) return points.slice();

  // 1. précision : on garde les points fiables (s'il n'en reste pas assez, on garde tout)
  let kept = points.filter((p) => p.accuracy == null || p.accuracy <= MAX_ACCURACY_M);
  if (kept.length < 2) kept = points.slice();

  // 2. vitesse : un déplacement impossible entre deux points = saut GPS
  const steady: T[] = [];
  for (const p of kept) {
    const prev = steady[steady.length - 1];

    if (prev) {
      const hours = (p.createdAt.getTime() - prev.createdAt.getTime()) / 3_600_000;
      const km = meters(prev, p) / 1000;
      if (hours > 0 && km > 0.05 && km / hours > MAX_SPEED_KMH) continue;
    }

    steady.push(p);
  }

  // 3. pic isolé : A -> B -> C où B est loin de A et de C alors que A et C sont proches
  const out: T[] = [];
  for (let i = 0; i < steady.length; i++) {
    const b = steady[i];
    const a = out[out.length - 1];
    const c = steady[i + 1];

    if (a && c) {
      const noise = Math.max(MIN_STEP_M, b.accuracy ?? 0);
      const ab = meters(a, b);
      const bc = meters(b, c);
      const ac = meters(a, c);
      if (ab > 3 * noise && bc > 3 * noise && ac < 0.5 * Math.min(ab, bc)) continue;
    }

    out.push(b);
  }

  return out;
}

/** Distance parcourue (km) : un mouvement n'est compté que s'il dépasse le bruit du GPS (point d'ancrage). */
export function trackDistanceKm(points: TrackPoint[]): number {
  if (points.length < 2) return 0;

  let total = 0;
  let anchor = points[0];

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const step = meters(anchor, p);
    const noise = Math.max(MIN_STEP_M, (p.accuracy ?? 0) * 0.5);

    if (step >= noise) {
      total += step;
      anchor = p;
    }
  }

  return Math.round(total) / 1000;
}
