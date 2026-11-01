/**
 * Numéro de CIN malgache : 12 chiffres dont les 3 premiers sont le CODE DU DISTRICT.
 * Le 1er chiffre est celui de l'ancienne province :
 *   1 Antananarivo · 2 Fianarantsoa · 3 Toamasina · 4 Mahajanga · 5 Toliara · 6 Antsiranana
 *
 * ⚠ La table ci-dessous ne contient que les codes CONFIRMÉS. Complétez-la avec la liste officielle
 * (une ligne par district) : un code absent n'est PAS refusé (seul le 1er chiffre est contrôlé),
 * alors qu'un code présent doit correspondre au lieu de délivrance saisi.
 */

export const CIN_PROVINCES: Record<string, string> = {
  "1": "Antananarivo",
  "2": "Fianarantsoa",
  "3": "Toamasina",
  "4": "Mahajanga",
  "5": "Toliara",
  "6": "Antsiranana",
};

/** code (3 chiffres) -> nom du district. À COMPLÉTER avec la liste officielle. */
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

/** Code attendu pour un nom de lieu (« Ambositra » -> « 203 »), null si le lieu n'est pas dans la table */
export function codeForPlace(place: unknown): string | null {
  const wanted = normalizePlace(place);
  if (!wanted) return null;

  const hit = Object.entries(CIN_DISTRICTS).find(([, name]) => {
    const n = normalizePlace(name);
    return n === wanted || wanted.startsWith(`${n} `) || n.startsWith(`${wanted} `);
  });

  return hit ? hit[0] : null;
}

export interface CinPrefixCheck {
  ok: boolean;
  message?: string;
  province?: string;
  district?: string;
}

/** Contrôle le préfixe d'un CIN (12 chiffres déjà nettoyés) ; `issuedPlace` = lieu de délivrance saisi. */
export function checkCinPrefix(cin: string, issuedPlace?: string | null): CinPrefixCheck {
  const prefix = cin.slice(0, 3);
  const province = CIN_PROVINCES[prefix[0]];

  if (!province) {
    return { ok: false, message: "Le CIN doit commencer par le code du district (1er chiffre de 1 à 6 : province)." };
  }

  const district = CIN_DISTRICTS[prefix];
  const expected = codeForPlace(issuedPlace);

  if (expected && expected !== prefix) {
    return {
      ok: false,
      province,
      district,
      message: `Le CIN d'un lieu de délivrance « ${issuedPlace} » doit commencer par ${expected} (il commence par ${prefix}).`,
    };
  }

  return { ok: true, province, district };
}

/** Âge en années entières à la date `at` (aujourd'hui par défaut) ; null si la date est illisible. */
export function ageFrom(birth: Date | string | null | undefined, at: Date = new Date()): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (Number.isNaN(b.getTime()) || b.getTime() > at.getTime()) return null;

  let age = at.getFullYear() - b.getFullYear();
  const beforeBirthday =
    at.getMonth() < b.getMonth() || (at.getMonth() === b.getMonth() && at.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;

  return age;
}
