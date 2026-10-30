/**
 * Règles automatiques des bénéficiaires : âge calculé depuis la date de naissance
 * et vulnérabilité déterminée par le système (jamais saisie à la main).
 */

/** Âge en années révolues à la date `now` */
export function ageFromBirthDate(birth: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());

  if (beforeBirthday) age -= 1;

  return Math.max(0, age);
}

export interface VulnerabilityInput {
  age?: number | null;
  hasDisability?: boolean | null;
  householdSize?: number | null;
  monthlyIncome?: number | null;
}

/** Revenu mensuel minimum par personne du ménage (Ar) ; 0 désactive cette règle. Modifiable via .env */
const MIN_INCOME_PER_PERSON = Number(process.env.VULNERABILITY_MIN_INCOME_PER_PERSON ?? 50000);

export function computeVulnerability(input: VulnerabilityInput): { vulnerable: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (typeof input.age === "number") {
    if (input.age < 18) reasons.push("mineur (moins de 18 ans)");
    if (input.age >= 60) reasons.push("personne âgée (60 ans et plus)");
  }

  if (input.hasDisability) reasons.push("handicap dans le ménage");

  if (
    MIN_INCOME_PER_PERSON > 0 &&
    typeof input.monthlyIncome === "number" &&
    typeof input.householdSize === "number" &&
    input.householdSize > 0 &&
    input.monthlyIncome / input.householdSize < MIN_INCOME_PER_PERSON
  ) {
    reasons.push("revenu par personne très faible");
  }

  return { vulnerable: reasons.length > 0, reasons };
}
