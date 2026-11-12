/**
 * Règles de cohérence communes (e-mail, téléphone, CIN / sexe, ménage).
 * Miroir de srcb/src/utils/fieldRules.ts — gardez les deux alignés.
 */
import { districtsOfPlace } from "@/lib/cin";

/* ------------------------------ e-mail ------------------------------ */

const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,10}$/i;

/**
 * Domaines acceptés pour les e-mails des personnes (bénéficiaires). Mêmes valeurs que côté serveur.
 * « gmail.com » = ce domaine exactement ; « .org » = tout domaine finissant par .org.
 */
export const PERSON_EMAIL_DOMAINS: string[] = [
  "gmail.com", "yahoo.fr", "yahoo.com", "outlook.com", "outlook.fr",
  "hotmail.com", "hotmail.fr", "live.com", "icloud.com", "proton.me", "protonmail.com",
  ".org", ".mg",
];

const domainAllowed = (domain: string, allowed: string[]): boolean =>
  allowed.some((rule) => (rule.startsWith(".") ? domain.endsWith(rule) : domain === rule));

/** Message d'erreur, ou null si correct (vide = non contrôlé). `domains` : domaines imposés (liste vide = tous). */
export function emailProblem(value: unknown, domains: string[] = []): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email) return null;

  if (email.length > 254 || email.includes("..") || !EMAIL_RE.test(email)) {
    return "Adresse e-mail invalide (ex. nom@gmail.com).";
  }

  if (domains.length > 0 && !domainAllowed(email.slice(email.lastIndexOf("@") + 1), domains)) {
    return `Domaine de l'e-mail non accepté : utilisez ${domains.map((d) => (d.startsWith(".") ? `*${d}` : `@${d}`)).join(", ")}.`;
  }

  return null;
}

/** Fautes de frappe courantes dans le domaine : renvoie une suggestion (non bloquante) ou null. */
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gamil.com": "gmail.com", "gmai.com": "gmail.com", "gmail.con": "gmail.com", "gmail.co": "gmail.com", "gmaill.com": "gmail.com",
  "yaho.fr": "yahoo.fr", "yahooo.fr": "yahoo.fr", "yahoo.fr.fr": "yahoo.fr", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmail.con": "hotmail.com", "outlok.com": "outlook.com", "outlook.con": "outlook.com",
};

export function emailTypoHint(value: unknown): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email.includes("@")) return null;

  const fixed = DOMAIN_TYPOS[email.slice(email.lastIndexOf("@") + 1)];
  return fixed ? `Vouliez-vous écrire @${fixed} ?` : null;
}

/* ----------------------------- téléphone ----------------------------- */

/** 10 chiffres : mobile 032 / 033 / 034 / 035 / 037 / 038 / 039, ou fixe 02x */
export const PHONE_RE = /^(?:03[2345789]|02\d)\d{7}$/;

export function phoneProblem(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length !== 10) return "Le numéro de téléphone doit contenir exactement 10 chiffres (ex. 034 00 000 00).";
  if (!PHONE_RE.test(digits)) return "Le numéro de téléphone doit commencer par 032, 033, 034, 035, 037, 038, 039 (mobile) ou 02x (fixe).";

  return null;
}

/* --------------------------- CIN et sexe ---------------------------- */

export function cinSexProblem(cin: unknown, gender: unknown): string | null {
  const digits = String(cin ?? "").replace(/\D/g, "");
  if (digits.length < 6) return null;

  const sex = digits[5];
  if (sex !== "1" && sex !== "2") return "Le 6e chiffre du CIN indique le sexe : 1 (homme) ou 2 (femme).";

  if (gender === "MALE" && sex !== "1") return "Le CIN indique une femme (6e chiffre = 2) alors que le genre choisi est « Homme ».";
  if (gender === "FEMALE" && sex !== "2") return "Le CIN indique un homme (6e chiffre = 1) alors que le genre choisi est « Femme ».";

  return null;
}

/** Code district (3 chiffres) à proposer pour un lieu de délivrance : seulement si le lieu désigne UN SEUL district. */
export function cinCodeForPlace(place: unknown): string | null {
  const hits = districtsOfPlace(place);
  return hits.length === 1 ? hits[0].code : null;
}

/* ------------------------------ ménage ------------------------------ */

export function householdProblem(size: unknown, childrenUnder5: unknown): string | null {
  const s = String(size ?? "").trim();
  const c = String(childrenUnder5 ?? "").trim();

  if (s !== "" && c !== "" && Number(c) > Number(s)) {
    return "Le nombre d'enfants de moins de 5 ans ne peut pas dépasser la taille du ménage.";
  }

  return null;
}

/* ----------------------------- handicap ----------------------------- */

/** Types de handicap proposés. Mêmes codes que DISABILITY_TYPES côté serveur (srcb/src/utils/fieldRules.ts). */
export const DISABILITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "MOTOR", label: "Handicap moteur / physique" },
  { value: "VISUAL", label: "Handicap visuel (cécité, malvoyance)" },
  { value: "HEARING", label: "Handicap auditif (surdité)" },
  { value: "SPEECH", label: "Trouble de la parole" },
  { value: "INTELLECTUAL", label: "Déficience intellectuelle" },
  { value: "PSYCHOSOCIAL", label: "Trouble psychique / psychosocial" },
  { value: "ALBINISM", label: "Albinisme" },
  { value: "MULTIPLE", label: "Polyhandicap (plusieurs handicaps)" },
  { value: "OTHER", label: "Autre handicap" },
];

export const disabilityLabels = (codes: unknown): string =>
  String(codes ?? "")
    .split(",")
    .map((c) => DISABILITY_OPTIONS.find((o) => o.value === c.trim())?.label ?? "")
    .filter(Boolean)
    .join(", ");
