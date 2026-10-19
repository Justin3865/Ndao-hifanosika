/**
 * Coordonnées officielles de l'association (affichées sur les certificats).
 * Renseignez le téléphone et l'e-mail dans frontend/.env.local :
 *   NEXT_PUBLIC_ORG_PHONE="+261 34 00 000 00"
 *   NEXT_PUBLIC_ORG_EMAIL="contact@votre-domaine.org"
 * (les lignes vides ne sont pas affichées ; rien n'est inventé)
 */
export const ORG = {
  name: "Ndao Hifanosika",
  tagline: "Association — Suivi & Évaluation",
  address: process.env.NEXT_PUBLIC_ORG_ADDRESS || "Lot 28TB/3609, Talatamaty Ambany, Fianarantsoa, Madagascar",
  city: process.env.NEXT_PUBLIC_ORG_CITY || "Fianarantsoa",
  phone: process.env.NEXT_PUBLIC_ORG_PHONE || "",
  email: process.env.NEXT_PUBLIC_ORG_EMAIL || "",
  website: process.env.NEXT_PUBLIC_ORG_WEBSITE || "",
};

export const orgContactLine = () => [ORG.phone, ORG.email, ORG.website].filter(Boolean).join("  •  ");
