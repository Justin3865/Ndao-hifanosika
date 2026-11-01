import { prisma } from "../config/database";
import { cinPrefixError } from "./cin";
import { identitySelect } from "./identity";

/**
 * Règles métier de l'identité qui demandent la base de données :
 *   - dates cohérentes (délivrance du CIN après la naissance, duplicata après la délivrance)
 *   - le CIN commence par le code du district du lieu de délivrance / de naissance
 *   - le CIN n'est pas déjà enregistré pour une autre personne
 *
 * `data` = champs d'identité envoyés (les absents sont lus dans la fiche existante).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export interface IdentityContext {
  /** fiche utilisateur modifiée (absent = nouvelle personne) */
  userId?: number;
  /** fiche bénéficiaire modifiée (absent = nouvelle personne) */
  beneficiaryId?: number;
  /** nom de la personne quand la fiche n'existe pas encore */
  names?: { firstName?: unknown; lastName?: unknown };
}

const fold = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const sameName = (a: Json, b: Json) =>
  fold(`${a?.firstName ?? ""} ${a?.lastName ?? ""}`) !== "" &&
  fold(`${a?.firstName ?? ""} ${a?.lastName ?? ""}`) === fold(`${b?.firstName ?? ""} ${b?.lastName ?? ""}`);

const asDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const holderName = (row: Json) => `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "une autre personne";

/** CIN déjà utilisé par quelqu'un d'autre ? (retourne le détenteur ou null) */
export async function findCinHolder(
  cin: string,
  ctx: IdentityContext,
  self?: { firstName?: unknown; lastName?: unknown },
): Promise<{ name: string; table: "user" | "beneficiary" } | null> {
  const user = await prisma.user.findFirst({
    where: { cinNumber: cin, ...(ctx.userId ? { id: { not: ctx.userId } } : {}) },
    select: { firstName: true, lastName: true },
  });

  // Même personne enregistrée à la fois comme utilisateur et comme bénéficiaire : autorisé
  if (user && !(ctx.beneficiaryId && sameName(user, self))) return { name: holderName(user), table: "user" };

  const beneficiary = await prisma.beneficiary.findFirst({
    where: { cinNumber: cin, ...(ctx.beneficiaryId ? { id: { not: ctx.beneficiaryId } } : {}) },
    select: { firstName: true, lastName: true },
  });

  if (beneficiary && !(ctx.userId && sameName(beneficiary, self))) return { name: holderName(beneficiary), table: "beneficiary" };

  return null;
}

export async function checkIdentityRules(data: Record<string, unknown>, ctx: IdentityContext = {}): Promise<string | null> {
  let existing: Json = null;

  if (ctx.userId) {
    existing = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { ...identitySelect, firstName: true, lastName: true } });
  } else if (ctx.beneficiaryId) {
    existing = await prisma.beneficiary.findUnique({
      where: { id: ctx.beneficiaryId },
      select: { birthDate: true, birthPlace: true, cinNumber: true, cinIssuedAt: true, cinIssuedPlace: true, cinDuplicataAt: true, firstName: true, lastName: true },
    });
  }

  const pick = (key: string) => (key in data ? data[key] : existing?.[key]);

  const birth = asDate(pick("birthDate"));
  const issuedAt = asDate(pick("cinIssuedAt"));
  const duplicataAt = asDate(pick("cinDuplicataAt"));
  const cin = (pick("cinNumber") as string | null) ?? null;

  if (birth && issuedAt && issuedAt.getTime() <= birth.getTime()) {
    return "La date de délivrance du CIN doit être postérieure à la date de naissance.";
  }

  if (issuedAt && duplicataAt && duplicataAt.getTime() < issuedAt.getTime()) {
    return "La date du duplicata ne peut pas précéder la délivrance du CIN.";
  }

  const touched = ["cinNumber", "birthPlace", "cinIssuedPlace"].some((key) => key in data);

  if (cin && touched) {
    const prefix = cinPrefixError(cin, [pick("cinIssuedPlace"), pick("birthPlace")]);
    if (prefix) return prefix;
  }

  if (typeof data.cinNumber === "string" && data.cinNumber) {
    const self = existing ?? ctx.names;
    const holder = await findCinHolder(data.cinNumber, ctx, self);

    if (holder) return `Ce N° CIN est déjà enregistré pour « ${holder.name} » : un CIN est unique.`;
  }

  return null;
}
