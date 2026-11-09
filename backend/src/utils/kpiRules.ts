// src/utils/kpiRules.ts  (AJOUT) — calculs purs des indicateurs §13 (adoption, usage des alertes IA, évaluations).
// Aucune dépendance : testable seul. Les cibles ne sont PAS inventées : `target` reste null tant que la Direction ne les a pas fixées.

export interface KpiValue {
  key: string;
  label: string;
  value: number | null; // pourcentage 0-100, null si non mesurable (dénominateur nul)
  numerator: number;
  denominator: number;
  target: number | null;
  met: boolean | null; // null si pas de cible ou pas de valeur
  note?: string;
}

export const pct = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

export function makeKpi(key: string, label: string, numerator: number, denominator: number, target: number | null = null, note?: string): KpiValue {
  const value = pct(numerator, denominator);
  return { key, label, value, numerator, denominator, target, met: value === null || target === null ? null : value >= target, note };
}

/** Compte actif = connecté au moins une fois dans les `days` derniers jours. */
export function isAdopted(lastLoginAt: Date | null | undefined, now: Date, days = 90): boolean {
  if (!lastLoginAt) return false;
  const age = now.getTime() - lastLoginAt.getTime();
  return age >= 0 && age <= days * 86_400_000;
}

/** Alerte « traitée » = RESOLVED ou IGNORED (décision humaine prise) ; IN_PROGRESS = prise en charge. */
export function alertUsage(statuses: string[]) {
  const total = statuses.length;
  const handled = statuses.filter((s) => s === "RESOLVED" || s === "IGNORED").length;
  const taken = statuses.filter((s) => s === "IN_PROGRESS").length;
  return { total, handled, taken, touched: handled + taken };
}

/** KPI qu'on ne peut pas calculer depuis la base : on le dit au lieu d'afficher un chiffre inventé. */
export const UNMEASURED = [
  { key: "availability", label: "Disponibilité (99 %)", how: "Sonde externe (UptimeRobot/Better Uptime) sur /health, rapport mensuel." },
  { key: "report_time", label: "Temps de production d'un rapport", how: "Chronométrer avant/après sur 5 rapports réels ; ou journaliser la durée d'export." },
  { key: "satisfaction", label: "Satisfaction des utilisateurs", how: "Questionnaire de 5 questions après 1 mois d'usage (formulaire), score moyen /5." },
] as const;
