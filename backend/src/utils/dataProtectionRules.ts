// src/utils/dataProtectionRules.ts
// Fiarovana angona ankizy sy vehivavy marefo — règles PURES (sans base de données, testables).
//
// Personnes protégées :
//   MINOR            = moins de 18 ans (âge calculé depuis la date de naissance, sinon champ `age`)
//   VULNERABLE_WOMAN = femme (gender = FEMALE) signalée vulnérable ou en situation de handicap
//
// Niveaux d'accès aux données INDIVIDUELLES d'une personne protégée :
//   FULL          : tout (ADMIN, COORDINATOR de son périmètre) — chaque lecture est journalisée
//   LIMITED       : nom et âge, mais ni contact, ni pièce d'identité, ni adresse, ni GPS précis (DIRECTION)
//   PSEUDONYMISED : initiales seulement, aucune donnée de contact / identité / localisation (tous les autres rôles)
// Les agrégats (comptages, taux, scores par zone) ne sont pas concernés ; seules les petites cellules
// (< PROTECT_MIN_CELL, défaut 5) sont masquées pour éviter la ré-identification.

export type ProtectedKind = "MINOR" | "VULNERABLE_WOMAN";
export type AccessLevel = "FULL" | "LIMITED" | "PSEUDONYMISED";
export type ProtectionMode = "enforce" | "audit" | "off";

export const ADULT_AGE = 18;
export const MASK_CHAR = "•";

export interface PersonLike {
  age?: unknown;
  birthDate?: unknown;
  gender?: unknown;
  vulnerable?: unknown;
  hasDisability?: unknown;
}

type Env = Record<string, string | undefined>;

export function protectionMode(env: Env = process.env): ProtectionMode {
  const raw = (env.DATA_PROTECTION_MODE ?? "enforce").trim().toLowerCase();
  return raw === "off" || raw === "audit" ? raw : "enforce";
}

export function minCell(env: Env = process.env): number {
  const n = Number(env.PROTECT_MIN_CELL);
  return Number.isInteger(n) && n >= 1 ? n : 5;
}

const roleList = (raw: string | undefined, fallback: string[]): string[] =>
  (raw && raw.trim() ? raw.split(",") : fallback).map((r) => r.trim().toUpperCase()).filter(Boolean);

/** Niveau d'accès d'un rôle. Les rôles inconnus sont pseudonymisés (principe du moindre privilège). */
export function accessLevel(role: string | undefined | null, env: Env = process.env): AccessLevel {
  const r = (role ?? "").trim().toUpperCase();
  if (roleList(env.DATA_PROTECTION_FULL_ROLES, ["ADMIN", "COORDINATOR"]).includes(r)) return "FULL";
  if (roleList(env.DATA_PROTECTION_LIMITED_ROLES, ["DIRECTION"]).includes(r)) return "LIMITED";
  return "PSEUDONYMISED";
}

/* ------------------------------- classification ------------------------------- */

const toDate = (v: unknown): Date | null => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export function ageOf(p: PersonLike, now: Date = new Date()): number | null {
  const birth = toDate(p.birthDate);
  if (birth) {
    let age = now.getUTCFullYear() - birth.getUTCFullYear();
    const m = now.getUTCMonth() - birth.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
    if (age >= 0 && age < 130) return age;
  }
  const raw = typeof p.age === "number" ? p.age : typeof p.age === "string" && p.age.trim() ? Number(p.age) : NaN;
  return Number.isFinite(raw) && raw >= 0 && raw < 130 ? raw : null;
}

export function protectedKinds(p: PersonLike, now: Date = new Date()): ProtectedKind[] {
  const kinds: ProtectedKind[] = [];
  const age = ageOf(p, now);
  if (age !== null && age < ADULT_AGE) kinds.push("MINOR");
  const female = typeof p.gender === "string" && p.gender.trim().toUpperCase() === "FEMALE";
  if (female && (p.vulnerable === true || p.hasDisability === true)) kinds.push("VULNERABLE_WOMAN");
  return kinds;
}

export const isProtectedPerson = (p: PersonLike, now: Date = new Date()): boolean => protectedKinds(p, now).length > 0;

/* ---------------------------------- masquage ---------------------------------- */

export const initials = (value: unknown): string => {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return s;
  return s
    .split(/\s+/)
    .map((w) => `${w[0]!.toUpperCase()}.`)
    .join(" ");
};

export function maskPhone(v: unknown): unknown {
  if (typeof v !== "string" || !v.trim()) return v;
  const digits = v.replace(/\D/g, "");
  return MASK_CHAR.repeat(8) + digits.slice(-2);
}

export function maskEmail(v: unknown): unknown {
  if (typeof v !== "string" || !v.includes("@")) return v;
  const [local, domain] = v.split("@");
  return `${local![0] ?? ""}${MASK_CHAR.repeat(3)}@${domain}`;
}

export function maskTail(v: unknown, keep = 2): unknown {
  if (typeof v !== "string" || !v.trim()) return v;
  return MASK_CHAR.repeat(Math.max(4, v.length - keep)) + v.slice(-keep);
}

/** Arrondit une coordonnée (2 décimales ≈ 1,1 km) : suffisant pour une carte de zone, pas pour retrouver un domicile. */
export function coarse(v: unknown, decimals = 2): unknown {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10 ** decimals) / 10 ** decimals : v;
}

function yearOnly(v: unknown): unknown {
  const d = toDate(v);
  if (!d) return v === null || v === undefined ? v : null;
  const iso = `${d.getUTCFullYear()}-01-01T00:00:00.000Z`;
  return v instanceof Date ? new Date(iso) : iso;
}

const CONTACT_FIELDS = ["phone", "email"] as const;
const CIN_FIELDS = ["cinNumber", "cinIssuedPlace"] as const;
const CIN_DATE_FIELDS = ["cinIssuedAt", "cinDuplicataAt"] as const;
const PRECISE_LOCATION = ["latitude", "longitude", "homeLatitude", "homeLongitude", "locationAccuracy"] as const;
const REMOVED_STRINGS = ["addressDetail", "adminFokontany", "zoneUnits", "trackingToken", "birthPlace", "notes", "dropoutReason"] as const;

const BENEFICIARY_KEYS = ["vulnerable", "householdSize", "childrenUnder5", "homeLatitude", "hasDisability", "disabilityTypes"];

/** Un objet est « bénéficiaire » s'il porte au moins un champ propre aux bénéficiaires (pas aux utilisateurs du personnel). */
export function looksLikeBeneficiary(o: Record<string, unknown>): boolean {
  return BENEFICIARY_KEYS.some((k) => k in o) && ("firstName" in o || "lastName" in o || "name" in o || "age" in o || "gender" in o);
}

/** Ligne d'analyse (risque d'abandon…) : identifiant bénéficiaire + nom, sans champs de contact. */
export function looksLikeBeneficiaryRow(o: Record<string, unknown>): boolean {
  return "beneficiaryId" in o && typeof o.name === "string";
}

/** Ménage géolocalisé de la carte (/vulnerability/households). */
export function looksLikeHousehold(o: Record<string, unknown>): boolean {
  return "nearestWorker" in o && "latitude" in o && "longitude" in o;
}

export interface ProtectResult<T> {
  body: T;
  /** nombre de personnes protégées rencontrées */
  protectedCount: number;
  /** nombre d'objets effectivement modifiés par le masquage */
  maskedCount: number;
  kinds: ProtectedKind[];
}

interface Counter {
  protectedCount: number;
  maskedCount: number;
  kinds: Set<ProtectedKind>;
}

function maskBeneficiaryObject(o: Record<string, unknown>, level: AccessLevel): Record<string, unknown> {
  const out: Record<string, unknown> = { ...o };
  for (const f of CONTACT_FIELDS) if (f in out) out[f] = f === "phone" ? maskPhone(out[f]) : maskEmail(out[f]);
  for (const f of CIN_FIELDS) if (f in out) out[f] = maskTail(out[f]);
  for (const f of CIN_DATE_FIELDS) if (f in out) out[f] = yearOnly(out[f]);
  if ("birthDate" in out) out.birthDate = yearOnly(out.birthDate);
  for (const f of REMOVED_STRINGS) if (f in out && out[f] !== null && out[f] !== undefined) out[f] = null;
  for (const f of PRECISE_LOCATION) {
    if (f in out) out[f] = level === "PSEUDONYMISED" ? null : coarse(out[f]);
  }
  if ("homeAltitude" in out && level === "PSEUDONYMISED") out.homeAltitude = null;
  if (level === "PSEUDONYMISED") {
    if (typeof out.firstName === "string") out.firstName = initials(out.firstName);
    if (typeof out.lastName === "string") out.lastName = initials(out.lastName);
    if (typeof out.name === "string") out.name = initials(out.name);
    if ("locality" in out) out.locality = null;
  }
  out._protected = true;
  out._protectionLevel = level;
  return out;
}

function walk(value: unknown, level: AccessLevel, now: Date, c: Counter, depth: number): unknown {
  if (depth > 10 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => walk(v, level, now, c, depth + 1));
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value; // Date, Decimal, Buffer… laissés tels quels

  const src = value as Record<string, unknown>;
  // Les enfants sont traités d'abord (objets imbriqués : { beneficiary: {...} }, listes…)
  let o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) o[k] = walk(v, level, now, c, depth + 1);

  if (looksLikeBeneficiary(src)) {
    const kinds = protectedKinds(src as PersonLike, now);
    if (kinds.length) {
      c.protectedCount += 1;
      kinds.forEach((k) => c.kinds.add(k));
      if (level !== "FULL") {
        o = { ...maskBeneficiaryObject(o, level) };
        c.maskedCount += 1;
      }
    }
  } else if (looksLikeBeneficiaryRow(src)) {
    const kinds = protectedKinds(src as PersonLike, now);
    if (kinds.length) {
      c.protectedCount += 1;
      kinds.forEach((k) => c.kinds.add(k));
      if (level === "PSEUDONYMISED") {
        o.name = initials(o.name);
        o._protected = true;
        o._protectionLevel = level;
        c.maskedCount += 1;
      }
    }
  } else if (looksLikeHousehold(src) && level !== "FULL") {
    // Carte des ménages vulnérables : sexe et âge inconnus → on protège par défaut la position et le nom.
    o.latitude = coarse(o.latitude);
    o.longitude = coarse(o.longitude);
    if ("altitude" in o && level === "PSEUDONYMISED") o.altitude = null;
    if (level === "PSEUDONYMISED" && typeof o.name === "string") o.name = initials(o.name);
    o._protected = true;
    o._protectionLevel = level;
    c.protectedCount += 1;
    c.maskedCount += 1;
  }
  return o;
}

/** Applique la protection à une réponse JSON complète. Ne modifie JAMAIS l'objet d'origine (copie). */
export function protectPayload<T>(body: T, level: AccessLevel, now: Date = new Date()): ProtectResult<T> {
  const c: Counter = { protectedCount: 0, maskedCount: 0, kinds: new Set() };
  const out = walk(body, level, now, c, 0) as T;
  return { body: out, protectedCount: c.protectedCount, maskedCount: c.maskedCount, kinds: [...c.kinds] };
}

/** Une valeur masquée ne doit JAMAIS être réécrite en base (formulaire rechargé puis renvoyé tel quel). */
export function containsMask(body: unknown, depth = 0): boolean {
  if (depth > 8 || body === null || body === undefined) return false;
  if (typeof body === "string") return body.includes(MASK_CHAR.repeat(3));
  if (Array.isArray(body)) return body.some((v) => containsMask(v, depth + 1));
  if (typeof body === "object") return Object.values(body as Record<string, unknown>).some((v) => containsMask(v, depth + 1));
  return false;
}

/* --------------------------- petites cellules (agrégats) --------------------------- */

/** Un comptage entre 1 et (min-1) peut permettre de ré-identifier une personne : il est supprimé (null). */
export function suppressSmall(count: number, min: number = minCell()): number | null {
  return count > 0 && count < min ? null : count;
}

/* ------------------------------ export CSV des jeux de données ------------------------------ */

/** Découpe une ligne CSV (cellules entre guillemets, "" = guillemet échappé). */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

const csvQuote = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * Jeux de données exportés (id,name,context,label,…) : hors accès complet, la colonne `name` passe en initiales.
 * Le sexe et l'âge ne sont pas dans ce fichier : on ne peut pas isoler les seuls mineurs, donc tout le monde est pseudonymisé.
 * Les noms entre guillemets contenant un retour à la ligne ne sont pas gérés (l'export d'origine n'en produit pas).
 */
export function pseudonymiseDatasetCsv(csv: string, level: AccessLevel): string {
  if (level === "FULL") return csv;
  const bom = csv.startsWith("\uFEFF") ? "\uFEFF" : "";
  const lines = csv.slice(bom.length).split("\n");
  const header = splitCsvLine(lines[0] ?? "");
  const col = header.indexOf("name");
  if (col < 0) return csv;
  const out = lines.map((l, i) => {
    if (i === 0 || !l) return l;
    const cells = splitCsvLine(l);
    if (cells[col] !== undefined) cells[col] = initials(cells[col]);
    return cells.map(csvQuote).join(",");
  });
  return bom + out.join("\n");
}

export const isDatasetCsvPath = (url: string): boolean => /^\/api\/ai\/datasets\/[^/]+\/export\.csv$/i.test(url.split("?")[0]!);
