// src/lib/phone.ts
/** Un numéro de téléphone contient au plus 10 chiffres (ex. 034 00 000 00 -> 0340000000). */
export const PHONE_MAX_DIGITS = 10;

/** Ne garde que les chiffres et tronque à 10. À utiliser dans tous les onChange des champs téléphone. */
export function sanitizePhone(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, PHONE_MAX_DIGITS);
}

/** Props communes à tous les <input> téléphone. */
export const phoneInputProps = {
  inputMode: "numeric" as const,
  maxLength: PHONE_MAX_DIGITS,
  autoComplete: "tel-national",
};
