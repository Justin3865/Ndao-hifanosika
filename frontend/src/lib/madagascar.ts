/**
 * Règles malgaches communes aux formulaires : CIN (12 chiffres, 3 premiers = code du district) et âge.
 * Miroir de srcb/src/utils/cinDistricts.ts — gardez les deux tables identiques.
 *
 * ⚠ Seuls les codes CONFIRMÉS sont listés. Un code absent n'est pas refusé (seul le 1er chiffre,
 * la province, est contrôlé) ; un code présent doit correspondre au lieu de délivrance saisi.
 */

export const CIN_PROVINCES: Record<string, string> = {
  "1": "Antananarivo",
  "2": "Fianarantsoa",
  "3": "Toamasina",
  "4": "Mahajanga",
  "5": "Toliara",
  "6": "Antsiranana",
};

/** code (3 chiffres) -> district. À COMPLÉTER avec la liste officielle. */
export const CIN_DISTRICTS: Record<string, string> = {
  "101": "Antananarivo Renivohitra",
  "203": "Ambositra",
  "313": "Ambatondrazaka",
};

export const normalizePlace = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function codeForPlace(place: unknown): string | null {
  const wanted = normalizePlace(place);
  if (!wanted) return null;

  const hit = Object.entries(CIN_DISTRICTS).find(([, name]) => {
    const n = normalizePlace(name);
    return n === wanted || wanted.startsWith(`${n} `) || n.startsWith(`${wanted} `);
  });

  return hit ? hit[0] : null;
}

export interface CinCheck {
  ok: boolean;
  message?: string;
  province?: string;
  district?: string;
}

/** `cin` = chiffres saisis (0 à 12). On ne juge le préfixe qu'à partir du 1er chiffre / des 3 premiers. */
export function checkCin(cin: string, issuedPlace?: string): CinCheck {
  if (!cin) return { ok: true };

  const province = CIN_PROVINCES[cin[0]];
  if (!province) return { ok: false, message: "Le CIN commence par le code du district : 1er chiffre de 1 à 6 (province)." };

  if (cin.length < 3) return { ok: true, province };

  const prefix = cin.slice(0, 3);
  const district = CIN_DISTRICTS[prefix];
  const expected = codeForPlace(issuedPlace);

  if (expected && expected !== prefix) {
    return {
      ok: false,
      province,
      district,
      message: `Pour « ${issuedPlace} », le CIN doit commencer par ${expected} (ici ${prefix}).`,
    };
  }

  return { ok: true, province, district };
}

/** Âge en années entières (null si date vide, illisible ou future) */
export function ageFrom(birth: string | null | undefined, at: Date = new Date()): number | null {
  if (!birth) return null;
  const b = new Date(`${String(birth).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(b.getTime()) || b.getTime() > at.getTime()) return null;

  let age = at.getFullYear() - b.getFullYear();
  if (at.getMonth() < b.getMonth() || (at.getMonth() === b.getMonth() && at.getDate() < b.getDate())) age -= 1;

  return age;
}

export const ageLabel = (birth: string | null | undefined): string => {
  const age = ageFrom(birth);
  return age === null ? "" : `${age} ${age > 1 ? "ans" : "an"}`;
};

/** Jour suivant (AAAA-MM-JJ) — sert de minimum à une date de fin */
export function nextDay(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Statut « naturel » d'un stage d'après ses dates */
export function statusFromDates(start: string, end: string, today = new Date()): "PENDING" | "IN_PROGRESS" | "COMPLETED" | "" {
  if (!start) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const t = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  if (start > t) return "PENDING";
  if (end && end < t) return "COMPLETED";
  return "IN_PROGRESS";
}
