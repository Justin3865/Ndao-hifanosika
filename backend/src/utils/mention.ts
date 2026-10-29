/**
 * Mentions de fin de stage — échelle sur 20.
 *
 *   < 10        Insuffisant
 *   10 – 11,99  Passable
 *   12 – 13,99  Assez bien
 *   14 – 15,99  Bien
 *   16 – 17,99  Très bien
 *   ≥ 18        Excellent
 *
 * « Félicitations du jury » n'est jamais attribuée automatiquement :
 * elle reste un choix manuel de l'administrateur.
 */

export const MENTIONS = [
  "Insuffisant",
  "Passable",
  "Assez bien",
  "Bien",
  "Très bien",
  "Excellent",
  "Félicitations du jury",
] as const;

export type Mention = (typeof MENTIONS)[number];

export function mentionFromScore20(score: number | null | undefined): Mention | null {
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 20) return null;
  if (score >= 18) return "Excellent";
  if (score >= 16) return "Très bien";
  if (score >= 14) return "Bien";
  if (score >= 12) return "Assez bien";
  if (score >= 10) return "Passable";
  return "Insuffisant";
}

export function isValidMention(value: unknown): value is Mention {
  return typeof value === "string" && (MENTIONS as readonly string[]).includes(value);
}
