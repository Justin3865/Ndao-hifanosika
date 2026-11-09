// src/utils/auditRules.ts
// Contexte d’audit (cahier des charges §5.1 / §10 : entité, identifiant d’entité et détails).
// Règles pures, sans base de données ni Express, donc testables.
//
// Principe de confidentialité : on journalise les NOMS des champs modifiés, jamais leurs valeurs
// (données d’enfants et de femmes vulnérables, mots de passe, jetons…).

export interface AuditContextInput {
  method: string;
  originalUrl: string;
  statusCode: number;
  body?: unknown;
  /** Posés par un contrôleur qui connaît l’identifiant créé (ex. POST) : res.locals.auditEntity / auditEntityId */
  entity?: string | null;
  entityId?: number | null;
}

export interface AuditContext {
  entity: string | null;
  entityId: number | null;
  details: Record<string, unknown>;
}

const MAX_FIELDS = 30;
const MAX_INT = 2147483647; // Prisma Int (PostgreSQL integer)

/** Champs dont même le NOM n’a aucun intérêt dans un journal : on ne les liste pas. */
const SENSITIVE_FIELD = /pass(word)?|secret|token|authorization|otp|cvv/i;

export function auditOperation(method: string): "CREATE" | "UPDATE" | "DELETE" | "ACTION" {
  switch (String(method).toUpperCase()) {
    case "POST":
      return "CREATE";
    case "PUT":
    case "PATCH":
      return "UPDATE";
    case "DELETE":
      return "DELETE";
    default:
      return "ACTION";
  }
}

/** Ressource = segment après /api (« /api/beneficiaries/12?x=1 » → « beneficiaries »). */
export function auditResource(originalUrl: string): string | null {
  const path = String(originalUrl ?? "").split("?")[0];
  const segments = path.split("/").filter(Boolean);
  const start = segments[0] === "api" ? 1 : 0;
  return segments[start] ?? null;
}

/** Premier segment strictement numérique du chemin = identifiant de l’entité visée. */
export function auditEntityIdFromPath(originalUrl: string): number | null {
  const path = String(originalUrl ?? "").split("?")[0];
  for (const segment of path.split("/")) {
    if (/^\d+$/.test(segment)) {
      const n = Number(segment);
      if (Number.isSafeInteger(n) && n > 0 && n <= MAX_INT) return n;
    }
  }
  return null;
}

/** Noms des champs envoyés (jamais les valeurs), hors champs sensibles, tronqués. */
export function auditChangedFields(body: unknown): string[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  return Object.keys(body as Record<string, unknown>)
    .filter((key) => !SENSITIVE_FIELD.test(key))
    .slice(0, MAX_FIELDS);
}

export function buildAuditContext(input: AuditContextInput): AuditContext {
  const path = String(input.originalUrl ?? "");
  const resource = auditResource(path);
  const entityId =
    typeof input.entityId === "number" && Number.isSafeInteger(input.entityId) && input.entityId > 0 && input.entityId <= MAX_INT
      ? input.entityId
      : auditEntityIdFromPath(path);
  const fields = auditChangedFields(input.body);
  const ok = input.statusCode >= 200 && input.statusCode < 400;

  return {
    entity: input.entity ?? null,
    entityId,
    details: {
      // champs historiques (conservés tels quels)
      statusCode: input.statusCode,
      method: input.method,
      path,
      // enrichissement
      operation: auditOperation(input.method),
      resource,
      entityId,
      outcome: ok ? "success" : "failure",
      ...(fields.length > 0 ? { fields } : {}),
    },
  };
}
