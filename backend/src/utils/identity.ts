/**
 * Identité d'un utilisateur (naissance + CIN) : analyse et validation communes
 * au profil, à la gestion des utilisateurs et aux certificats.
 */

export type IdentityResult = { data: Record<string, unknown>; error?: string };

export const toText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text ? text : null;
};

/** null = vide, "invalid" = date illisible */
export function toDate(value: unknown): Date | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

export const isPastDate = (date: Date): boolean =>
  date.getTime() <= Date.now() && date.getFullYear() >= 1900;

/** "101 234 567 890" -> "101234567890" ; null si vide */
export const cleanCin = (value: unknown): string | null => {
  const digits = String(value ?? "").replace(/[\s.\-]/g, "");
  return digits ? digits : null;
};

export const isValidCin = (value: string): boolean => /^\d{12}$/.test(value);

const toBool = (value: unknown): boolean =>
  value === true || value === "true" || value === 1 || value === "1";

/**
 * Lit les champs d'identité présents dans `body` (les absents sont ignorés).
 * Champs : birthDate, birthPlace, cinNumber, cinIssuedAt, cinIssuedPlace, cinDuplicata, cinDuplicataAt
 */
export function parseIdentity(
  body: Record<string, unknown> | undefined,
  options: { birth?: boolean } = {},
): IdentityResult {
  const src = body ?? {};
  const data: Record<string, unknown> = {};
  const withBirth = options.birth !== false;

  if (withBirth && src.birthDate !== undefined) {
    const date = toDate(src.birthDate);
    if (date === "invalid" || (date && !isPastDate(date))) return { data, error: "Date de naissance invalide." };
    data.birthDate = date;
  }

  if (withBirth && src.birthPlace !== undefined) data.birthPlace = toText(src.birthPlace);

  if (src.cinNumber !== undefined) {
    const cin = cleanCin(src.cinNumber);
    if (cin && !isValidCin(cin)) return { data, error: "Le numéro de CIN doit contenir exactement 12 chiffres." };
    data.cinNumber = cin;
  }

  if (src.cinIssuedAt !== undefined) {
    const date = toDate(src.cinIssuedAt);
    if (date === "invalid" || (date && !isPastDate(date))) return { data, error: "Date de délivrance du CIN invalide." };
    data.cinIssuedAt = date;
  }

  if (src.cinIssuedPlace !== undefined) data.cinIssuedPlace = toText(src.cinIssuedPlace);

  if (src.cinDuplicata !== undefined) {
    data.cinDuplicata = toBool(src.cinDuplicata);
    if (!data.cinDuplicata) data.cinDuplicataAt = null;
  }

  if (src.cinDuplicataAt !== undefined && data.cinDuplicata !== false) {
    const date = toDate(src.cinDuplicataAt);
    if (date === "invalid" || (date && !isPastDate(date))) return { data, error: "Date du duplicata invalide." };
    data.cinDuplicataAt = date;
  }

  return { data };
}

/** Champs d'identité à sélectionner dans une requête Prisma sur User */
export const identitySelect = {
  phone: true,
  birthDate: true,
  birthPlace: true,
  cinNumber: true,
  cinIssuedAt: true,
  cinIssuedPlace: true,
  cinDuplicata: true,
  cinDuplicataAt: true,
} as const;

/** Libellés des champs nécessaires à un certificat, pour signaler ceux qui manquent */
export function missingIdentity(user: {
  phone?: string | null;
  birthDate?: Date | string | null;
  birthPlace?: string | null;
  cinNumber?: string | null;
  cinIssuedAt?: Date | string | null;
  cinIssuedPlace?: string | null;
  cinDuplicata?: boolean | null;
  cinDuplicataAt?: Date | string | null;
}): string[] {
  const missing: string[] = [];
  if (!user.phone) missing.push("Téléphone");
  if (!user.birthDate) missing.push("Date de naissance");
  if (!user.birthPlace) missing.push("Lieu de naissance");
  if (!user.cinNumber) missing.push("N° CIN");
  if (!user.cinIssuedAt) missing.push("Date de délivrance du CIN");
  if (!user.cinIssuedPlace) missing.push("Lieu de délivrance du CIN");
  if (user.cinDuplicata && !user.cinDuplicataAt) missing.push("Date du duplicata");
  return missing;
}
