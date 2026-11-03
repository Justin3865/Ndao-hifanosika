/**
 * Règles de cohérence communes (e-mail, téléphone, CIN / sexe, ménage).
 * Module pur : copie identique côté frontend dans lib/validation.ts — gardez les deux alignés.
 */

/* ------------------------------ e-mail ------------------------------ */

/** local@domaine.tld : caractères autorisés, pas de point en début / fin / doublé, extension de 2 à 10 lettres */
const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,10}$/i;

/**
 * Domaines acceptés pour les e-mails des personnes (bénéficiaires…).
 * Une entrée « gmail.com » = ce domaine exactement ; une entrée « .org » = tout domaine finissant par .org.
 * Modifiable dans .env :  PERSON_EMAIL_DOMAINS=gmail.com,yahoo.fr,.org   (« * » = tous les domaines acceptés)
 */
export const DEFAULT_PERSON_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.fr", "yahoo.com", "outlook.com", "outlook.fr",
  "hotmail.com", "hotmail.fr", "live.com", "icloud.com", "proton.me", "protonmail.com",
  ".org", ".mg",
];

export function personEmailDomains(): string[] | null {
  const env = process.env.PERSON_EMAIL_DOMAINS;
  if (env === undefined) return DEFAULT_PERSON_EMAIL_DOMAINS;

  const raw = env.trim().toLowerCase();
  if (raw === "" || raw === "*") return null;

  return raw.split(",").map((d) => d.trim().replace(/^@/, "")).filter(Boolean);
}

export const domainAllowed = (domain: string, allowed: string[]): boolean =>
  allowed.some((rule) => (rule.startsWith(".") ? domain.endsWith(rule) : domain === rule));

/** Message d'erreur, ou null si l'e-mail est correct (vide = non contrôlé : le caractère obligatoire est géré ailleurs). */
export function emailProblem(value: unknown, opts: { restrictDomain?: boolean } = {}): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email) return null;

  if (email.length > 254 || email.includes("..") || !EMAIL_RE.test(email)) {
    return "Adresse e-mail invalide (ex. nom@gmail.com).";
  }

  if (opts.restrictDomain) {
    const allowed = personEmailDomains();
    const domain = email.slice(email.lastIndexOf("@") + 1);

    if (allowed && !domainAllowed(domain, allowed)) {
      return `Domaine de l'e-mail non accepté : utilisez ${allowed.map((d) => (d.startsWith(".") ? `*${d}` : `@${d}`)).join(", ")}.`;
    }
  }

  return null;
}

/* ----------------------------- téléphone ----------------------------- */

/** 10 chiffres : mobile 032 / 033 / 034 / 035 / 037 / 038 / 039 + 7 chiffres, ou fixe 02x + 7 chiffres */
export const PHONE_RE = /^(?:03[2345789]|02\d)\d{7}$/;

export const PHONE_FORMAT_MESSAGE =
  "Le numéro de téléphone doit contenir exactement 10 chiffres et commencer par 032, 033, 034, 035, 037, 038, 039 (mobile) ou 02x (fixe).";

/* --------------------------- CIN et sexe ---------------------------- */

/** 6e chiffre du CIN = sexe (1 homme, 2 femme) ; il doit aussi correspondre au genre saisi. */
export function cinSexProblem(cin: unknown, gender: unknown): string | null {
  const digits = String(cin ?? "").replace(/\D/g, "");
  if (digits.length < 6) return null;

  const sex = digits[5];
  if (sex !== "1" && sex !== "2") return "Le 6e chiffre du CIN indique le sexe : 1 (homme) ou 2 (femme).";

  if (gender === "MALE" && sex !== "1") return "Le CIN indique une femme (6e chiffre = 2) alors que le genre choisi est « Homme ».";
  if (gender === "FEMALE" && sex !== "2") return "Le CIN indique un homme (6e chiffre = 1) alors que le genre choisi est « Femme ».";

  return null;
}

/* ------------------------------ ménage ------------------------------ */

export function householdProblem(size: unknown, childrenUnder5: unknown): string | null {
  if (typeof size === "number" && typeof childrenUnder5 === "number" && childrenUnder5 > size) {
    return "Le nombre d'enfants de moins de 5 ans ne peut pas dépasser la taille du ménage.";
  }

  return null;
}

/* ----------------------------- handicap ----------------------------- */

/** Types de handicap proposés (code enregistré -> libellé). Copie côté frontend : lib/validation.ts */
export const DISABILITY_TYPES: Record<string, string> = {
  MOTOR: "Handicap moteur / physique",
  VISUAL: "Handicap visuel (cécité, malvoyance)",
  HEARING: "Handicap auditif (surdité)",
  SPEECH: "Trouble de la parole",
  INTELLECTUAL: "Déficience intellectuelle",
  PSYCHOSOCIAL: "Trouble psychique / psychosocial",
  ALBINISM: "Albinisme",
  MULTIPLE: "Polyhandicap (plusieurs handicaps)",
  OTHER: "Autre handicap",
};

/** Liste de codes (tableau ou « A,B ») -> codes valides sans doublon ; null si un code est inconnu */
export function parseDisabilityTypes(raw: unknown): string[] | null {
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(",");
  const codes = Array.from(new Set(list.map((c) => String(c).trim().toUpperCase()).filter(Boolean)));

  return codes.every((c) => c in DISABILITY_TYPES) ? codes : null;
}
