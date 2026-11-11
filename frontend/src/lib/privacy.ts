/**
 * Confidentialité des montants (comme un champ « mot de passe ») :
 * tous les montants en Ar sont MASQUÉS par défaut, à chaque chargement de la page.
 * Le bouton « œil » de l'en-tête les affiche / les masque (état gardé en mémoire seulement).
 */
let hidden = true;
const listeners = new Set<() => void>();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const areAmountsHidden = () => hidden;

export function setAmountsHidden(value: boolean) {
  if (hidden === value) return;
  hidden = value;
  listeners.forEach((l) => l());
}

export const toggleAmounts = () => setAmountsHidden(!hidden);

export const subscribeAmounts = subscribe;

/** Remplace la partie numérique d'un montant déjà formaté : « 242 500 000 Ar » → « •••••• Ar ». */
export function maskMoney(formatted: string): string {
  if (!hidden) return formatted;
  return formatted.replace(/\d[\d\s\u00a0\u202f.,]*\d|\d/, "••••••");
}
