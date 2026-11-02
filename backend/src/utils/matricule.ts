import { db } from "./db";

/**
 * Matricule du stagiaire (N° d'inscription) : NH-<année>-STG-<0001>.
 * Il est attribué une seule fois (à l'ajout du stage) et ne change plus :
 * c'est aussi le N° imprimé sur ses certificats de stage.
 */
export const MATRICULE_RE = /^NH-\d{4}-STG-\d{4,}$/;

const prefixOf = (year = new Date().getFullYear()) => `NH-${year}-STG-`;

/** Partie numérique d'un code « NH-2026-STG-0007 » ou « NH-2026-STG-0007-2 » (null si autre format). */
function seqOf(code: string, prefix: string): number | null {
  if (!code.startsWith(prefix)) return null;
  const m = /^(\d+)/.exec(code.slice(prefix.length));
  return m ? Number(m[1]) : null;
}

/**
 * Prochain matricule libre : juste au-dessus du plus grand matricule attribué (l'affichage continue la liste : 0010 -> 0011).
 * Les anciens codes de certificats ne comptent plus : un certificat dont le code est déjà pris reçoit un suffixe (-2, -3…).
 */
export async function suggestNextMatricule(): Promise<string> {
  const prefix = prefixOf();

  const users: Array<{ matricule: string | null }> = await db.user.findMany({
    where: { matricule: { startsWith: prefix } },
    select: { matricule: true },
  });

  const max = users.reduce((m, u) => Math.max(m, seqOf(u.matricule ?? "", prefix) ?? 0), 0);

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export class MatriculeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Même personne = même matricule : un autre compte au même CIN qui a déjà un matricule le partage
 * (le matricule reste unique en base : il est porté par le compte principal).
 */
export async function findSiblingMatricule(userId: number): Promise<string | null> {
  const me = await db.user.findUnique({ where: { id: userId }, select: { cinNumber: true } });
  const cin = String(me?.cinNumber ?? "").trim();

  if (!cin) return null;

  const other = await db.user.findFirst({
    where: { cinNumber: cin, matricule: { not: null }, NOT: { id: userId } },
    orderBy: { id: "asc" },
    select: { matricule: true },
  });

  return other?.matricule ?? null;
}

/**
 * Matricule du stagiaire : celui déjà attribué, sinon
 *  1. le N° de son ancien certificat de stage (il garde le même numéro),
 *  2. le matricule saisi dans le formulaire (s'il est valide et libre),
 *  3. le prochain matricule libre.
 */
export async function getOrAssignMatricule(userId: number, wanted?: string | null): Promise<{ matricule: string; created: boolean }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { matricule: true } });

  if (!user) throw new MatriculeError("Stagiaire introuvable.", 404);
  if (user.matricule) return { matricule: user.matricule, created: false };

  const sibling = await findSiblingMatricule(userId);
  if (sibling) return { matricule: sibling, created: false };

  const typed = String(wanted ?? "").trim().toUpperCase();

  if (typed && !MATRICULE_RE.test(typed)) {
    throw new MatriculeError("Matricule invalide : format attendu NH-2026-STG-0001.");
  }

  // Un matricule n'est « pris » que par un autre compte (le code d'un ancien certificat n'empêche pas : le certificat prendra un suffixe)
  const takenBy = async (value: string): Promise<boolean> => {
    const u = await db.user.findFirst({ where: { matricule: value, NOT: { id: userId } }, select: { id: true } });
    return Boolean(u);
  };

  if (typed && (await takenBy(typed))) throw new MatriculeError(`Le matricule ${typed} est déjà utilisé.`, 409);

  // Ancien certificat de stage de cette personne : on reprend son numéro
  let legacy: string | null = null;

  if (!typed) {
    const cert = await db.certificate.findFirst({
      where: { userId, type: "INTERNSHIP", code: { contains: "-STG-" } },
      orderBy: { createdAt: "asc" },
      select: { code: true },
    });
    const base = cert ? /^(NH-\d{4}-STG-\d{4,})/.exec(String(cert.code))?.[1] : null;
    if (base && !(await takenBy(base))) legacy = base;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const value = typed || legacy || (await suggestNextMatricule());

    try {
      await db.user.update({ where: { id: userId }, data: { matricule: value } });
      return { matricule: value, created: true };
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002" || typed) throw error;
      legacy = null;
    }
  }

  throw new MatriculeError("Attribution du matricule impossible, réessayez.", 503);
}

/**
 * Remet les matricules « en ordre » : une personne = un matricule, numérotés 0001, 0002, 0003… sans trou,
 * année par année, dans l'ordre d'inscription actuel (seuls les stagiaires réellement suivis en gardent un).
 *
 * - une personne (même CIN, sinon même compte) qui a plusieurs comptes/matricules n'en garde qu'un seul
 *   (le plus ancien) ; ses autres comptes le partagent (matricule libéré en base, repris à l'affichage) ;
 * - un stagiaire qui n'a plus aucun stage ET aucun certificat perd son matricule ;
 * - le N° de ses certificats de stage suit son matricule (suffixes -2, -3… conservés, ajoutés si besoin) ;
 * - le matricule suit toujours l'ordre ; si un ancien certificat d'une autre personne porte déjà le code, le certificat prend un suffixe libre (-2, -3…).
 * Tout se fait dans une transaction : en cas d'erreur, rien ne change.
 */
export async function renumberMatricules(): Promise<{ changed: number }> {
  const users: Array<{ id: number; matricule: string | null; cinNumber: string | null }> = await db.user.findMany({
    where: { matricule: { not: null } },
    select: { id: true, matricule: true, cinNumber: true },
  });

  const re = /^NH-(\d{4})-STG-(\d+)$/;

  const parsed = users
    .map((u) => {
      const m = re.exec(String(u.matricule ?? ""));
      const cin = String(u.cinNumber ?? "").replace(/\D/g, "");

      return m
        ? { id: u.id, old: String(u.matricule), year: m[1], seq: Number(m[2]), key: cin.length === 12 ? `cin:${cin}` : `id:${u.id}` }
        : null;
    })
    .filter((u): u is { id: number; old: string; year: string; seq: number; key: string } => u !== null);

  if (parsed.length === 0) return { changed: 0 };

  const ids = parsed.map((u) => u.id);

  // Seuls les stagiaires réellement suivis (au moins un stage) gardent un matricule :
  // un compte qui n'a qu'un certificat (sans stage) ne décale plus la numérotation (0001 = premier stagiaire de la liste).
  const withInternship: Array<{ studentId: number }> = await db.internship.findMany({
    where: { studentId: { in: ids } },
    select: { studentId: true },
    distinct: ["studentId"],
  });

  const followed = new Set<number>(withInternship.map((r) => r.studentId));

  // Une entrée par personne : compte principal = le plus ancien matricule parmi ses comptes suivis
  const persons = new Map<string, typeof parsed>();

  for (const u of parsed) persons.set(u.key, [...(persons.get(u.key) ?? []), u]);

  const primaries: typeof parsed = [];
  const secondaries: typeof parsed = [];
  const released: typeof parsed = [];

  for (const list of persons.values()) {
    const active = list.filter((u) => followed.has(u.id)).sort((a, b) => a.seq - b.seq || a.id - b.id);

    if (active.length === 0) {
      released.push(...list);
      continue;
    }

    primaries.push(active[0]);

    // Les autres comptes de la même personne partagent son matricule (le leur est libéré)
    secondaries.push(...list.filter((u) => u.id !== active[0].id));
  }

  // Certificats de stage qui ne bougent pas (autres personnes, sans titulaire, comptes sans stage) : leurs codes sont réservés
  const movingIds = [...primaries, ...secondaries].map((u) => u.id);
  const foreign: Array<{ code: string }> = await db.certificate.findMany({
    where: { code: { contains: "-STG-" }, OR: [{ userId: null }, { userId: { notIn: movingIds } }] },
    select: { code: true },
  });
  const reserved = [...new Set(foreign.map((c) => c.code))];
  const reservedCodes = new Set(reserved);

  const plan: Array<{ id: number; old: string; next: string }> = [];
  const byYear = new Map<string, typeof primaries>();

  for (const u of primaries) byYear.set(u.year, [...(byYear.get(u.year) ?? []), u]);

  for (const [year, list] of byYear) {
    list.sort((a, b) => a.seq - b.seq || a.id - b.id);

    let n = 0;

    for (const u of list) {
      let next: string;

      // Le matricule suit toujours l'ordre (0001, 0002…) ; un ancien certificat d'une autre personne ne le décale pas
      n += 1;
      next = `NH-${year}-STG-${String(n).padStart(4, "0")}`;

      plan.push({ id: u.id, old: u.old, next });
    }
  }

  const moved = plan.filter((p) => p.old !== p.next);
  const nextOf = new Map(plan.map((p) => [p.id, p.next]));

  // Compte secondaire -> matricule final de sa personne
  const primaryOfKey = new Map(primaries.map((u) => [u.key, u.id]));
  const secondaryTarget = (u: (typeof parsed)[number]) => nextOf.get(primaryOfKey.get(u.key) as number) as string;

  if (moved.length === 0 && secondaries.length === 0 && released.length === 0) return { changed: 0 };

  await db.$transaction(async (tx: typeof db) => {
    const touched = [...moved.map((p) => p.id), ...secondaries.map((u) => u.id), ...released.map((r) => r.id)];

    // 1. Libère tous les matricules concernés (contrainte d'unicité)
    await tx.user.updateMany({ where: { id: { in: touched } }, data: { matricule: null } });

    // 2. Certificats de stage concernés : passage par un code temporaire (unicité)
    const certOwners = [...moved.map((p) => p.id), ...secondaries.map((u) => u.id)];
    const certs: Array<{ id: number; code: string; userId: number }> = certOwners.length
      ? await tx.certificate.findMany({
          where: { userId: { in: certOwners }, code: { contains: "-STG-" } },
          select: { id: true, code: true, userId: true },
        })
      : [];

    for (const c of certs) await tx.certificate.update({ where: { id: c.id }, data: { code: `TMP-RENUM-${c.id}` } });

    // 3. Nouveaux matricules (comptes principaux) + codes de leurs certificats (suffixe conservé)
    const usedCodes = new Set<string>();

    for (const p of moved) {
      await tx.user.update({ where: { id: p.id }, data: { matricule: p.next } });

      for (const c of certs.filter((x) => x.userId === p.id)) {
        const suffix = c.code.startsWith(p.old) ? c.code.slice(p.old.length) : "";
        let code = `${p.next}${suffix}`;
        let k = 2;

        // Code déjà porté par le certificat d'une autre personne : suffixe libre
        while (reservedCodes.has(code) || usedCodes.has(code)) code = `${p.next}-${k++}`;

        usedCodes.add(code);
        await tx.certificate.update({ where: { id: c.id }, data: { code } });
      }
    }

    // 4. Certificats des comptes secondaires : rattachés au matricule de la personne (-2, -3… libres)
    for (const u of secondaries) {
      const base = secondaryTarget(u);

      for (const c of certs.filter((x) => x.userId === u.id)) {
        const existing: Array<{ code: string }> = await tx.certificate.findMany({
          where: { code: { startsWith: base } },
          select: { code: true },
        });
        const taken = new Set([...existing.map((e) => e.code), ...usedCodes]);

        let code = base;
        let k = 2;

        while (taken.has(code) || reservedCodes.has(code)) code = `${base}-${k++}`;

        usedCodes.add(code);
        await tx.certificate.update({ where: { id: c.id }, data: { code } });
      }
    }
  }, { timeout: 60000, maxWait: 10000 });

  return { changed: moved.length + secondaries.length + released.length };
}

/**
 * Modification manuelle du matricule d'un stagiaire (champ du formulaire du stage).
 * Le nouveau matricule doit être valide (NH-2026-STG-0001) et libre ; les N° de ses certificats de stage suivent.
 * Un compte secondaire (même CIN) modifie le matricule de la personne, porté par son compte principal.
 */
export async function changeMatricule(userId: number, wanted: string): Promise<boolean> {
  const typed = String(wanted ?? "").trim().toUpperCase();

  if (!typed) return false;

  if (!MATRICULE_RE.test(typed)) throw new MatriculeError("Matricule invalide : format attendu NH-2026-STG-0001.");

  const me = await db.user.findUnique({ where: { id: userId }, select: { id: true, matricule: true, cinNumber: true } });

  if (!me) throw new MatriculeError("Stagiaire introuvable.", 404);

  let holder: { id: number; matricule: string } | null = me.matricule ? { id: me.id, matricule: me.matricule } : null;

  if (!holder && String(me.cinNumber ?? "").trim()) {
    const other = await db.user.findFirst({
      where: { cinNumber: me.cinNumber, matricule: { not: null }, NOT: { id: userId } },
      orderBy: { id: "asc" },
      select: { id: true, matricule: true },
    });

    if (other?.matricule) holder = { id: other.id, matricule: other.matricule };
  }

  // Aucun matricule attribué : le matricule saisi est attribué (même contrôles)
  if (!holder) {
    await getOrAssignMatricule(userId, typed);
    return true;
  }

  if (holder.matricule === typed) return false;

  const [taken, certClash] = await Promise.all([
    db.user.findFirst({ where: { matricule: typed, NOT: { id: holder.id } }, select: { id: true } }),
    db.certificate.findFirst({
      where: {
        OR: [{ code: typed }, { code: { startsWith: `${typed}-` } }],
        NOT: { userId: holder.id },
      },
      select: { id: true },
    }),
  ]);

  if (taken || certClash) throw new MatriculeError(`Le matricule ${typed} est déjà utilisé.`, 409);

  const old = holder.matricule;
  const holderId = holder.id;

  await db.$transaction(async (tx: typeof db) => {
    const certs: Array<{ id: number; code: string }> = await tx.certificate.findMany({
      where: { userId: holderId, OR: [{ code: old }, { code: { startsWith: `${old}-` } }] },
      select: { id: true, code: true },
    });

    for (const c of certs) await tx.certificate.update({ where: { id: c.id }, data: { code: `TMP-CHG-${c.id}` } });

    await tx.user.update({ where: { id: holderId }, data: { matricule: typed } });

    for (const c of certs) await tx.certificate.update({ where: { id: c.id }, data: { code: `${typed}${c.code.slice(old.length)}` } });
  });

  return true;
}
