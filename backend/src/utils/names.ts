/**
 * Comparaison de noms de personnes, insensible à la casse, aux accents et à l'ordre des mots.
 * « Robert RAKOTOMAMONJY » et « RAKOTOMAMONJY Robert » sont considérés comme identiques.
 */
const tokens = (value: string): string[] =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort();

export function isSameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = tokens(a ?? "");
  const right = tokens(b ?? "");

  return left.length > 0 && left.length === right.length && left.every((t, i) => t === right[i]);
}
