import { prisma } from "../config/database";

/**
 * Matricules automatiques :
 *  - projets        NH-AAAA-PRJ-0001
 *  - bénéficiaires  NH-AAAA-BEN-0000001 (7 chiffres : la liste peut devenir très longue) ;
 *                   seuls les ménages SÉLECTIONNÉS ou saisis directement dans « Bénéficiaires » reçoivent ce numéro
 *  - enquêtes       NH-AAAA-ENQ-0001 (enquête d'un nouveau ménage en mission, avant sélection)
 *  - agents         NH-AAAA-AGT-0001
 * FICHIER NOUVEAU : n'altère pas utils/matricule.ts (matricule des stagiaires, NH-AAAA-STG-xxxx).
 */

type Delegate = {
  findMany: (args: any) => Promise<any[]>;
  update: (args: any) => Promise<any>;
};

type Config = {
  /** Modèle Prisma (clé du client) */
  model: "project" | "beneficiary" | "mission" | "user" | "survey";
  /** Colonne qui porte le matricule */
  field: "code" | "matricule" | "agentMatricule";
  /** PRJ | BEN | MIS */
  prefix: "PRJ" | "BEN" | "MIS" | "AGT" | "ENQ";
  /** Colonne de date servant à l'ordre croissant (createdAt par défaut) */
  orderField?: "createdAt" | "startedAt";
  /** Filtre Prisma : seules ces lignes sont renumérotées (les autres gardent leur valeur) */
  where?: Record<string, unknown>;
  /** Valeurs déjà prises dans une autre table (ex. codes d'enquête des ménages candidats) : comptées pour le numéro suivant */
  extra?: () => Promise<string[]>;
  /** Création en file d'attente (un seul numéro attribué à la fois dans ce processus) */
  shared?: boolean;
  /** Nombre de chiffres du numéro (4 par défaut) */
  width?: number;
};

const currentYear = () => new Date().getFullYear();

function makeMatricule({ model, field, prefix, orderField = "createdAt", where, extra, shared, width = 4 }: Config) {
  let queue: Promise<unknown> = Promise.resolve();
  const re = new RegExp(`^NH-\\d{4}-${prefix}-(\\d+)$`);
  const delegateOf = (client: any): Delegate => client[model] as Delegate;

  const format = (n: number): string => `NH-${currentYear()}-${prefix}-${String(n).padStart(width, "0")}`;

  /** Prochain matricule libre : plus grand numéro existant + 1 (on continue à partir du dernier). */
  async function next(): Promise<string> {
    const rows = await delegateOf(prisma).findMany({ select: { [field]: true } });
    let max = 0;

    for (const row of rows) {
      const m = re.exec(String(row[field] ?? ""));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }

    const others = extra ? await extra().catch(() => [] as string[]) : [];
    for (const value of others) {
      const m = re.exec(String(value ?? ""));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }

    return format(max + 1);
  }

  /** n matricules consécutifs libres (création en masse : un seul calcul pour tout le lot). */
  async function nextBatch(count: number): Promise<string[]> {
    const first = await next();
    const start = parseInt((re.exec(first) as RegExpExecArray)[1], 10);
    return Array.from({ length: count }, (_, i) => format(start + i));
  }

  /**
   * Remet les matricules en ordre (0001, 0002, …) selon la date de création.
   * Deux phases (valeurs temporaires) pour ne jamais violer la contrainte @unique.
   * Les relations passent par l'id : rien ne casse. Tout est dans une transaction.
   */
  async function renumber(): Promise<number> {
    return prisma.$transaction(
      async (tx: any) => {
        const delegate = delegateOf(tx);
        const rows = await delegate.findMany({ where, select: { id: true }, orderBy: [{ [orderField]: "asc" }, { id: "asc" }] });

        for (const r of rows) await delegate.update({ where: { id: r.id }, data: { [field]: `TMP-${r.id}` } });

        let i = 1;
        for (const r of rows) await delegate.update({ where: { id: r.id }, data: { [field]: format(i++) } });

        return rows.length;
      },
      { timeout: 120000, maxWait: 10000 },
    );
  }

  /** Création sûre : matricule fourni, sinon généré ; réessaie si deux créations simultanées prennent le même numéro. */
  async function createWith<T>(provided: unknown, createFn: (value: string) => Promise<T>): Promise<T> {
    const given = typeof provided === "string" && provided.trim() ? provided.trim() : null;

    // Plusieurs agents peuvent valider en même temps : le premier enregistré prend le numéro suivant,
    // les autres recalculent (courte pause aléatoire) et prennent les suivants, sans doublon ni perte.
    const run = async (): Promise<T> => {
      for (let attempt = 0; attempt < 25; attempt++) {
        const value = given ?? (await next());

        try {
          return await createFn(value);
        } catch (error) {
          if ((error as { code?: string }).code === "P2002" && !given) {
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 40));
            continue;
          }
          throw error;
        }
      }

      throw new Error("Impossible de générer le matricule.");
    };

    if (!shared) return run();

    // Un seul numéro attribué à la fois (dans ce processus) ; entre processus, l'unicité en base + la relance sur P2002 protègent
    const result = queue.then(run, run);
    queue = result.catch(() => undefined);
    return result;
  }

  return { next, nextBatch, renumber, createWith, format };
}

export const projectCode = makeMatricule({ model: "project", field: "code", prefix: "PRJ" });
/**
 * Matricule d'un BÉNÉFICIAIRE (NH-AAAA-BEN-0000001) : suite propre aux bénéficiaires.
 * Le numéro suivant = dernier bénéficiaire + 1. Un ménage enquêté n'en reçoit PAS (il a un matricule d'enquête ENQ) :
 * il ne reçoit son numéro BEN que lorsqu'il est sélectionné.
 */
export const beneficiaryMatricule = makeMatricule({
  model: "beneficiary",
  field: "matricule",
  prefix: "BEN",
  shared: true,
  width: 7,
});
/**
 * Matricule d'une ENQUÊTE (NH-AAAA-ENQ-0001) : une seule suite pour les enquêtes de mission
 * (ménages candidats ET enquêtes sur des bénéficiaires déjà inscrits).
 */
export const surveyCode = makeMatricule({
  model: "survey",
  field: "code",
  prefix: "ENQ",
  shared: true,
  extra: async () => {
    const rows: Array<{ code: string | null }> = await (prisma as any).enrollmentCandidate.findMany({ select: { code: true } });
    return rows.map((r) => r.code ?? "").filter(Boolean);
  },
});
export const agentMatricule = makeMatricule({ model: "user", field: "agentMatricule", prefix: "AGT" });
// Les présences saisies à la main pour les stagiaires (endReason = "MANUEL") ne reçoivent pas de matricule de mission.
export const missionCode = makeMatricule({
  model: "mission",
  field: "code",
  prefix: "MIS",
  orderField: "startedAt",
  where: { OR: [{ endReason: null }, { endReason: { not: "MANUEL" } }] },
});

/**
 * Tri croissant par matricule (0001, 0002, …) comme la liste des stages ;
 * les lignes sans matricule viennent en dernier (puis par id).
 */
export function sortByMatricule<T extends { id: number }>(rows: T[], field: keyof T): T[] {
  return rows.sort((a, b) => {
    const x = String(a[field] ?? "");
    const y = String(b[field] ?? "");

    if (x !== y) {
      if (!x) return 1;
      if (!y) return -1;
      return x.localeCompare(y, "fr", { numeric: true });
    }

    return a.id - b.id;
  });
}

/**
 * Matricule du coordinateur / agent de terrain (NH-AAAA-AGT-0001) : attribué une fois, à sa première mission.
 * N'échoue jamais : une erreur ici ne doit pas empêcher de partir en mission.
 */
export async function ensureAgentMatricule(userId: number): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { agentMatricule: true } });
    if (!user) return null;
    if (user.agentMatricule) return user.agentMatricule;

    return await agentMatricule.createWith(null, async (code) => {
      await prisma.user.update({ where: { id: userId }, data: { agentMatricule: code } });
      return code;
    });
  } catch {
    return null;
  }
}

/**
 * « Remettre les matricules en ordre » : bénéficiaires uniquement, dans une seule suite 0000001, 0000002… (date de création).
 * Les enquêtes (ENQ) ne sont pas touchées : un ménage non sélectionné ne consomme aucun numéro de bénéficiaire.
 */
export async function renumberPersons(): Promise<number> {
  return beneficiaryMatricule.renumber();
}
