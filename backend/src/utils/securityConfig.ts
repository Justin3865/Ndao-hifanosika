// src/utils/securityConfig.ts
// Lecture et contrôle de la configuration de sécurité (cahier des charges §6 et §10).
// Fonctions pures : l'environnement est passé en paramètre, ce qui les rend testables.

type Env = Record<string, string | undefined>;

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  max: number;
}

const toPositiveInt = (raw: string | undefined, fallback: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const isTrue = (raw: string | undefined): boolean => ["1", "true", "yes", "on"].includes(String(raw ?? "").trim().toLowerCase());

/**
 * Limite globale par IP. Valeurs larges par défaut : le but est d'arrêter un abus (script, boucle),
 * pas de gêner un bureau entier derrière la même adresse. RATE_LIMIT_DISABLED=1 désactive.
 */
export function readRateLimitConfig(env: Env): RateLimitConfig {
  return {
    enabled: !isTrue(env.RATE_LIMIT_DISABLED),
    windowMs: toPositiveInt(env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: toPositiveInt(env.RATE_LIMIT_MAX, 1200),
  };
}

/** Chemins jamais limités : sondes de santé, suivi GPS continu, WebSocket. */
export function isRateLimitExempt(method: string, path: string): boolean {
  if (String(method).toUpperCase() === "OPTIONS") return true;
  return (
    path === "/health" ||
    path === "/api/health" ||
    path.startsWith("/api/public/tracking") ||
    path.startsWith("/socket.io")
  );
}

/** Valeur de `trust proxy` : TRUST_PROXY=1 (un proxy), « true », ou absent (aucun). */
export function readTrustProxy(env: Env): number | boolean | undefined {
  const raw = String(env.TRUST_PROXY ?? "").trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "true") return true;
  if (raw === "false") return false;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

export interface HttpsInput {
  forceHttps: boolean;
  secure: boolean;
  forwardedProto?: string | undefined;
  method: string;
  path: string;
}

export type HttpsDecision = "allow" | "redirect" | "reject";

/**
 * FORCE_HTTPS=1 : tout ce qui n'arrive pas en HTTPS est redirigé (GET/HEAD) ou refusé (autres méthodes,
 * pour ne jamais laisser partir un mot de passe en clair). La sonde /health reste libre.
 */
export function decideHttps(input: HttpsInput): HttpsDecision {
  if (!input.forceHttps) return "allow";
  if (input.path === "/health" || input.path === "/api/health") return "allow";
  const proto = String(input.forwardedProto ?? "").split(",")[0].trim().toLowerCase();
  if (input.secure || proto === "https") return "allow";
  const method = String(input.method).toUpperCase();
  return method === "GET" || method === "HEAD" ? "redirect" : "reject";
}

export type WarningLevel = "critical" | "warning" | "info";
export interface SecurityWarning {
  code: string;
  level: WarningLevel;
  message: string;
}

const WEAK_SECRETS = new Set(["secret", "changeme", "change-me", "password", "admin", "jwt_secret", "your-secret", "dev", "test"]);

const weak = (value: string | undefined, min: number): boolean => {
  const v = String(value ?? "").trim();
  return v.length < min || WEAK_SECRETS.has(v.toLowerCase());
};

/**
 * Contrôles de configuration à lancer au démarrage. Hors production, rien n'est signalé
 * (le développement local reste inchangé).
 */
export function securityWarnings(env: Env): SecurityWarning[] {
  if ((env.NODE_ENV ?? "development") !== "production") return [];
  const out: SecurityWarning[] = [];
  const add = (code: string, level: WarningLevel, message: string) => out.push({ code, level, message });

  if (String(env.COORDINATOR_SCOPE ?? "").toLowerCase() !== "strict") {
    add("COORDINATOR_SCOPE", "critical", "COORDINATOR_SCOPE n'est pas « strict » : un coordinateur sans projet affecté voit TOUS les projets. Définir COORDINATOR_SCOPE=strict.");
  }
  if (weak(env.JWT_SECRET, 32)) add("JWT_SECRET", "critical", "JWT_SECRET est trop court ou trivial (32 caractères aléatoires minimum).");
  if (weak(env.JWT_REFRESH_SECRET, 32)) add("JWT_REFRESH_SECRET", "critical", "JWT_REFRESH_SECRET est trop court ou trivial (32 caractères aléatoires minimum).");
  if (env.JWT_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) add("JWT_SAME", "warning", "JWT_SECRET et JWT_REFRESH_SECRET sont identiques.");
  if (weak(env.AI_SERVICE_KEY, 16)) add("AI_SERVICE_KEY", "critical", "AI_SERVICE_KEY est absente ou faible : le service IA et /api/service/* ne sont pas correctement protégés.");
  if (!isTrue(env.FORCE_HTTPS)) add("FORCE_HTTPS", "warning", "FORCE_HTTPS n'est pas activé : HTTPS obligatoire sur tous les environnements (cahier §10). Activer FORCE_HTTPS=1 derrière le proxy TLS (avec TRUST_PROXY=1).");
  if (/localhost|127\.0\.0\.1|http:\/\//i.test(String(env.CORS_ORIGIN ?? ""))) add("CORS_ORIGIN", "warning", "CORS_ORIGIN contient localhost ou une URL http:// en production.");
  if (/^http:\/\//i.test(String(env.FRONTEND_URL ?? ""))) add("FRONTEND_URL", "warning", "FRONTEND_URL est en http:// en production.");
  if (isTrue(env.RATE_LIMIT_DISABLED)) add("RATE_LIMIT", "warning", "La limitation globale de débit est désactivée (RATE_LIMIT_DISABLED).");
  if (!env.DATA_ENCRYPTION_KEY) add("DATA_ENCRYPTION_KEY", "info", "DATA_ENCRYPTION_KEY absente : pas de chiffrement applicatif des champs sensibles (CIN, téléphone). Prévoir volume et sauvegardes chiffrés (voir docs/SECURITE_LOT_C.md).");
  return out;
}

/** Vrai si au moins un avertissement est critique. */
export const hasCritical = (warnings: SecurityWarning[]): boolean => warnings.some((w) => w.level === "critical");
