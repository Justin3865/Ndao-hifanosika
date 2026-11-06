import { prisma } from "../config/database";

/**
 * Matricule automatique des projets (NH-AAAA-PRJ-0001) et des bénéficiaires (NH-AAAA-BEN-0001).
 * FICHIER NOUVEAU : n'altère pas utils/matricule.ts (matricule des stagiaires, NH-AAAA-STG-xxxx).
 */

type Delegate = {
  findMany: (args: any) => Promise<any[]>;
  update: (args: any) => Promise<any>;
};

type Config = {
  /** Modèle Prisma (clé du client) */
  model: "project" | "beneficiary";
  /** Colonne qui porte le matricule */
  field: "code" | "matricule";
  /** PRJ | BEN */
  prefix: "PRJ" | "BEN";
};

const currentYear = () => new Date().getFullYear();

function makeMatricule({ model, field, prefix }: Config) {
  const re = new RegExp(`^NH-\\d{4}-${prefix}-(\\d+)$`);
  const delegateOf = (client: any): Delegate => client[model] as Delegate;

  const format = (n: number): string => `NH-${currentYear()}-${prefix}-${String(n).padStart(4, "0")}`;

  /** Prochain matricule libre : plus grand numéro existant + 1 (on continue à partir du dernier). */
  async function next(): Promise<string> {
    const rows = await delegateOf(prisma).findMany({ select: { [field]: true } });
    let max = 0;

    for (const row of rows) {
      const m = re.exec(String(row[field] ?? ""));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }

    return format(max + 1);
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
        const rows = await delegate.findMany({ select: { id: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });

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

    for (let attempt = 0; attempt < 5; attempt++) {
      const value = given ?? (await next());

      try {
        return await createFn(value);
      } catch (error) {
        if ((error as { code?: string }).code === "P2002" && !given) continue;
        throw error;
      }
    }

    throw new Error("Impossible de générer le matricule.");
  }

  return { next, renumber, createWith, format };
}

export const projectCode = makeMatricule({ model: "project", field: "code", prefix: "PRJ" });
export const beneficiaryMatricule = makeMatricule({ model: "beneficiary", field: "matricule", prefix: "BEN" });

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
