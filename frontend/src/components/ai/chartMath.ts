// Calculs géométriques des graphiques SVG (sans dépendance externe).

export type Point = [number, number];

export const TAU = Math.PI * 2;

const fix = (value: number) => Number(value.toFixed(2));

export function polar(cx: number, cy: number, radius: number, angle: number): Point {
  return [fix(cx + radius * Math.cos(angle)), fix(cy + radius * Math.sin(angle))];
}

/** Secteur d'anneau entre deux angles (0 = à droite, sens horaire). Un cercle plein est découpé en deux demi-arcs. */
export function donutArc(cx: number, cy: number, outer: number, inner: number, start: number, end: number): string {
  const span = Math.min(end - start, TAU - 0.0001);
  const stop = start + span;
  const large = span > Math.PI ? 1 : 0;

  const [x1, y1] = polar(cx, cy, outer, start);
  const [x2, y2] = polar(cx, cy, outer, stop);
  const [x3, y3] = polar(cx, cy, inner, stop);
  const [x4, y4] = polar(cx, cy, inner, start);

  return [
    `M ${x1} ${y1}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

/** Courbe lisse (Catmull-Rom converti en Bézier) passant par tous les points. */
export function smoothPath(points: Point[], tension = 0.5): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  let path = `M ${fix(points[0][0])} ${fix(points[0][1])}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1[0] + ((p2[0] - p0[0]) * tension) / 3;
    const c1y = p1[1] + ((p2[1] - p0[1]) * tension) / 3;
    const c2x = p2[0] - ((p3[0] - p1[0]) * tension) / 3;
    const c2y = p2[1] - ((p3[1] - p1[1]) * tension) / 3;

    path += ` C ${fix(c1x)} ${fix(c1y)}, ${fix(c2x)} ${fix(c2y)}, ${fix(p2[0])} ${fix(p2[1])}`;
  }

  return path;
}

/** Plus petit « beau » maximum (1, 2, 5 × 10^n) au moins égal à la valeur. */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const fraction = value / base;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return nice * base;
}

/** Graduations régulières de 0 à max. */
export function ticks(max: number, count = 4): number[] {
  // Petits effectifs : une graduation par entier (0, 1, 2…) plutôt que des décimales
  const steps = Number.isInteger(max) && max < count ? max : count;
  return Array.from({ length: steps + 1 }, (_, i) => Number(((max / steps) * i).toFixed(2)));
}

export const percent = (value: number, total: number): number => (total > 0 ? Math.round((value / total) * 100) : 0);
