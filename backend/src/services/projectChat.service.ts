// src/services/projectChat.service.ts (AJOUT) — le chatbot répond aux questions sur LE PROJET à partir des vraies données :
// combien de projets / activités / bénéficiaires / évaluations / stages, lesquels sont en retard, l'état d'un projet nommé.
// FR + EN + malagasy (mêmes termes que l'interface, cf. utils/chatLangRules.ts). Renvoie null si la question ne concerne pas ce sujet.
// Garde-fous : périmètre du coordinateur respecté, petits effectifs de personnes (< PROTECT_MIN_CELL) non affichés, aucun nom de bénéficiaire.

import type { ChatAnswer } from "../ml/chatbot";
import { db } from "../utils/db";
import { suppressSmall } from "../utils/dataProtectionRules";
import { ChatLang, Concept, concepts, norm, pick, statusLabel, term } from "../utils/chatLangRules";

const MONTHS: Record<ChatLang, string[]> = {
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  mg: ["Janoary", "Febroary", "Martsa", "Aprily", "Mey", "Jona", "Jolay", "Aogositra", "Septambra", "Oktobra", "Novambra", "Desambra"],
};
const fmtDate = (d: Date | null | undefined, lang: ChatLang): string =>
  d ? `${d.getUTCDate()} ${MONTHS[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}` : "—";
const fmtNum = (n: number): string => Math.round(n).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");
const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

/** Projets accessibles : null = tous ; tableau = périmètre d'un coordinateur affecté (même règle que le reste du backend). */
export async function scopedProjectIds(role: string | undefined, userId: number | undefined): Promise<number[] | null> {
  if ((role ?? "").toUpperCase() !== "COORDINATOR" || userId === undefined) return null;
  const rows: Array<{ projectId: number }> = await db.projectCoordinator.findMany({ where: { userId }, select: { projectId: true } });
  if (rows.length) return rows.map((r) => r.projectId);
  return process.env.COORDINATOR_SCOPE === "strict" ? [] : null; // sans affectation : mode transition (accès historique)
}

// Du plus précis au plus général : « bénéficiaires par projet » parle de bénéficiaires, pas de projets.
const SUBJECTS: Concept[] = ["beneficiary", "evaluation", "internship", "milestone", "activity", "project", "budget", "zone", "partner"];

interface Ctx {
  lang: ChatLang;
  suggestions: string[];
  projectWhere: Record<string, unknown>; // filtre sur Project
  byProject: Record<string, unknown>; // filtre sur les tables liées (projectId)
}

const countOf = (groups: Array<{ status: string; _count: { _all: number } }>, status: string): number =>
  groups.find((g) => g.status === status)?._count._all ?? 0;

/** Question « d'état d'un projet nommé » : renvoie le projet dont le nom ou le code figure dans la question. */
async function findNamedProject(text: string, ctx: Ctx) {
  const projects: Array<{ id: number; name: string; code: string }> = await db.project.findMany({ where: ctx.projectWhere, select: { id: true, name: true, code: true } });
  const t = norm(text);
  return projects
    .filter((p) => (norm(p.name).length >= 3 && t.includes(norm(p.name))) || (!!p.code && t.includes(norm(p.code))))
    .sort((a, b) => b.name.length - a.name.length)[0];
}

async function projectDetail(projectId: number, ctx: Ctx): Promise<ChatAnswer> {
  const { lang } = ctx;
  const p = await db.project.findUnique({ where: { id: projectId } });
  const [acts, benefCount, evals, miles, interns] = await Promise.all([
    db.activity.groupBy({ by: ["status"], where: { projectId }, _count: { _all: true } }),
    db.beneficiary.count({ where: { projectId } }),
    db.evaluation.findMany({ where: { projectId }, select: { status: true, score: true } }),
    db.milestone.findMany({ where: { projectId }, select: { dueDate: true, completedAt: true } }),
    db.internship.count({ where: { projectId } }),
  ]);
  const now = new Date();
  const actTotal = (acts as Array<{ _count: { _all: number } }>).reduce((n, g) => n + g._count._all, 0);
  const lateMiles = (miles as Array<{ dueDate: Date | null; completedAt: Date | null }>).filter((m) => m.dueDate && !m.completedAt && m.dueDate < now).length;
  const scored = (evals as Array<{ status: string; score: number | null }>).filter((e) => e.status === "VALIDATED" && e.score !== null);
  const avgScore = scored.length ? scored.reduce((n, e) => n + (e.score as number), 0) / scored.length : null;
  const people = suppressSmall(benefCount);
  const target = p.beneficiaryTarget ? ` / ${p.beneficiaryTarget}` : "";
  const beneficiaries = people === null ? pick({ fr: "moins de 5", en: "fewer than 5", mg: "latsaky ny 5" }, lang) : `${people}${target}`;
  const budget = p.budget ? `${fmtNum(num(p.budget))} Ar (${pick({ fr: "dépensé", en: "spent", mg: "lany" }, lang)} : ${fmtNum(num(p.budgetSpent))} Ar)` : "—";
  const late = p.endDate && p.status === "ACTIVE" && p.endDate < now;

  return {
    reply: pick({
      fr: `${p.name} (${p.code}) : ${statusLabel(p.status, "fr").toLowerCase()}, du ${fmtDate(p.startDate, "fr")} au ${fmtDate(p.endDate, "fr")}${late ? " — la date de fin est dépassée alors que le projet est toujours actif" : ""}. ${actTotal} activité(s), ${lateMiles} jalon(s) en retard.`,
      en: `${p.name} (${p.code}): ${statusLabel(p.status, "en").toLowerCase()}, from ${fmtDate(p.startDate, "en")} to ${fmtDate(p.endDate, "en")}${late ? " — the end date has passed but the project is still active" : ""}. ${actTotal} activit${actTotal === 1 ? "y" : "ies"}, ${lateMiles} late milestone(s).`,
      mg: `${p.name} (${p.code}): ${statusLabel(p.status, "mg").toLowerCase()}, manomboka ny ${fmtDate(p.startDate, "mg")} ka hatramin'ny ${fmtDate(p.endDate, "mg")}${late ? " — lany ny daty farany nefa mbola mavitrika ny tetikasa" : ""}. Hetsika ${actTotal}, dingana tara ${lateMiles}.`,
    }, lang),
    table: {
      columns: [pick({ fr: "Indicateur", en: "Indicator", mg: "Famantarana" }, lang), pick({ fr: "Valeur", en: "Value", mg: "Sanda" }, lang)],
      rows: [
        [pick({ fr: "Statut", en: "Status", mg: "Toetra" }, lang), statusLabel(p.status, lang)],
        [term("activity", lang) + " (" + [["PLANNED"], ["IN_PROGRESS"], ["COMPLETED"]].map(([s]) => `${statusLabel(s, lang)} ${countOf(acts, s)}`).join(", ") + ")", actTotal],
        [term("beneficiary", lang), beneficiaries],
        [term("evaluation", lang), `${evals.length}${avgScore !== null ? ` · ${pick({ fr: "moyenne validée", en: "validated average", mg: "salanisa nankatoavina" }, lang)} ${avgScore.toFixed(1)}` : ""}`],
        [term("milestone", lang), `${miles.length} (${pick({ fr: "en retard", en: "late", mg: "tara" }, lang)} : ${lateMiles})`],
        [term("internship", lang), interns],
        [term("budget", lang), budget],
      ],
    },
    suggestions: ctx.suggestions,
  };
}

export async function answerProjectQuestion(text: string, lang: ChatLang, role: string | undefined, userId?: number): Promise<ChatAnswer | null> {
  const found = concepts(text);
  if (found.has("household") || found.has("vulnerable") || found.has("agent") || found.has("model") || found.has("dropout") || found.has("anomaly")) return null;

  const ids = await scopedProjectIds(role, userId);
  const ctx: Ctx = {
    lang,
    suggestions: [
      pick({ fr: "Combien de projets sont actifs ?", en: "How many projects are active?", mg: "Firy ny tetikasa mavitrika?" }, lang),
      pick({ fr: "Quelles activités sont en retard ?", en: "Which activities are late?", mg: "Inona avy ny hetsika tara?" }, lang),
      pick({ fr: "Combien de bénéficiaires par projet ?", en: "How many beneficiaries per project?", mg: "Firy ny mpahazo tombontsoa isaky ny tetikasa?" }, lang),
      pick({ fr: "Quelles évaluations sont à valider ?", en: "Which evaluations are waiting for validation?", mg: "Inona avy ny fanombanana miandry fankatoavana?" }, lang),
    ],
    projectWhere: ids === null ? {} : { id: { in: ids } },
    byProject: ids === null ? {} : { projectId: { in: ids } },
  };

  const named = await findNamedProject(text, ctx);
  if (named) return projectDetail(named.id, ctx);

  const subject = SUBJECTS.find((s) => found.has(s));
  if (!subject || subject === "zone" || subject === "partner" || subject === "budget") return null;
  const asksCount = found.has("count") || found.has("late") || /\bquel(?:le)?s?\b|\bwhich\b|\binona avy\b|\biza avy\b|\bliste?\b|\blist\b|\bstatut|\bstatus\b|\betat\b|\btoetra\b|\bnombre|\bisan|valider|validat|pending|attente|miandry|fankatoavana|\bpar projet|\bper project|\bisaky ny tetikasa/.test(norm(text));
  if (!asksCount) return null;
  const now = new Date();
  const lateWord = found.has("late");

  if (ids !== null && ids.length === 0) {
    return { reply: pick({ fr: "Aucun projet ne vous est affecté pour le moment.", en: "No project is assigned to you yet.", mg: "Tsy mbola misy tetikasa voatendry aminao.", }, lang), suggestions: ctx.suggestions };
  }

  if (subject === "project") {
    const groups = await db.project.groupBy({ by: ["status"], where: ctx.projectWhere, _count: { _all: true } });
    const total = (groups as Array<{ _count: { _all: number } }>).reduce((n, g) => n + g._count._all, 0);
    const overdue = await db.project.count({ where: { ...ctx.projectWhere, status: "ACTIVE", endDate: { lt: now } } });
    if (lateWord) {
      const rows: Array<{ name: string; code: string; endDate: Date | null }> = await db.project.findMany({ where: { ...ctx.projectWhere, status: "ACTIVE", endDate: { lt: now } }, orderBy: { endDate: "asc" }, take: 10, select: { name: true, code: true, endDate: true } });
      return {
        reply: overdue
          ? pick({ fr: `${overdue} projet(s) actif(s) ont dépassé leur date de fin.`, en: `${overdue} active project(s) are past their end date.`, mg: `Tetikasa mavitrika ${overdue} no lany daty farany.` }, lang)
          : pick({ fr: "Aucun projet actif n'a dépassé sa date de fin.", en: "No active project is past its end date.", mg: "Tsy misy tetikasa mavitrika lany daty farany." }, lang),
        table: overdue ? { columns: [term("project", lang), "Code", pick({ fr: "Fin prévue", en: "Planned end", mg: "Daty farany" }, lang)], rows: rows.map((r) => [r.name, r.code, fmtDate(r.endDate, lang)]) } : undefined,
        suggestions: ctx.suggestions,
      };
    }
    return {
      reply: pick({
        fr: `${total} projet(s) : ${countOf(groups, "ACTIVE")} actif(s), ${countOf(groups, "COMPLETED")} terminé(s), ${countOf(groups, "DRAFT")} en brouillon, ${countOf(groups, "SUSPENDED")} suspendu(s), ${countOf(groups, "CANCELLED")} annulé(s). ${overdue} actif(s) au-delà de la date de fin.`,
        en: `${total} project(s): ${countOf(groups, "ACTIVE")} active, ${countOf(groups, "COMPLETED")} completed, ${countOf(groups, "DRAFT")} draft, ${countOf(groups, "SUSPENDED")} suspended, ${countOf(groups, "CANCELLED")} cancelled. ${overdue} active past the end date.`,
        mg: `Tetikasa ${total}: ${countOf(groups, "ACTIVE")} mavitrika, ${countOf(groups, "COMPLETED")} vita, ${countOf(groups, "DRAFT")} volavolana, ${countOf(groups, "SUSPENDED")} nijanona vetivety, ${countOf(groups, "CANCELLED")} nofoanana. ${overdue} mavitrika nefa lany daty.`,
      }, lang),
      table: { columns: [pick({ fr: "Statut", en: "Status", mg: "Toetra" }, lang), pick({ fr: "Nombre", en: "Count", mg: "Isa" }, lang)], rows: (groups as Array<{ status: string; _count: { _all: number } }>).map((g) => [statusLabel(g.status, lang), g._count._all]) },
      suggestions: ctx.suggestions,
    };
  }

  if (subject === "activity" || subject === "milestone") {
    if (subject === "milestone" || lateWord) {
      const where = subject === "milestone"
        ? { ...ctx.byProject, completedAt: null, dueDate: { lt: now } }
        : { ...ctx.byProject, status: { in: ["PLANNED", "IN_PROGRESS"] }, endDate: { lt: now } };
      const model = subject === "milestone" ? db.milestone : db.activity;
      const n: number = await model.count({ where });
      const rows: Array<{ title: string; dueDate?: Date | null; endDate?: Date | null; project?: { name: string } }> = await model.findMany({ where, take: 10, orderBy: subject === "milestone" ? { dueDate: "asc" } : { endDate: "asc" }, select: { title: true, ...(subject === "milestone" ? { dueDate: true } : { endDate: true }), project: { select: { name: true } } } });
      return {
        reply: n
          ? pick({ fr: `${n} ${subject === "milestone" ? "jalon(s)" : "activité(s)"} en retard.`, en: `${n} late ${subject === "milestone" ? (n === 1 ? "milestone" : "milestones") : n === 1 ? "activity" : "activities"}.`, mg: `${subject === "milestone" ? "Dingana" : "Hetsika"} tara: ${n}.` }, lang)
          : pick({ fr: "Rien n'est en retard.", en: "Nothing is late.", mg: "Tsy misy tara." }, lang),
        table: n ? { columns: [subject === "milestone" ? term("milestone", lang) : term("activity", lang), term("project", lang), pick({ fr: "Échéance", en: "Due", mg: "Daty farany" }, lang)], rows: rows.map((r) => [r.title, r.project?.name ?? "—", fmtDate(r.dueDate ?? r.endDate, lang)]) } : undefined,
        suggestions: ctx.suggestions,
      };
    }
    const groups = await db.activity.groupBy({ by: ["status"], where: ctx.byProject, _count: { _all: true } });
    const total = (groups as Array<{ _count: { _all: number } }>).reduce((n, g) => n + g._count._all, 0);
    return {
      reply: pick({
        fr: `${total} activité(s) : ${countOf(groups, "PLANNED")} planifiée(s), ${countOf(groups, "IN_PROGRESS")} en cours, ${countOf(groups, "COMPLETED")} terminée(s), ${countOf(groups, "CANCELLED")} annulée(s).`,
        en: `${total} activit${total === 1 ? "y" : "ies"}: ${countOf(groups, "PLANNED")} planned, ${countOf(groups, "IN_PROGRESS")} in progress, ${countOf(groups, "COMPLETED")} completed, ${countOf(groups, "CANCELLED")} cancelled.`,
        mg: `Hetsika ${total}: ${countOf(groups, "PLANNED")} voaplanina, ${countOf(groups, "IN_PROGRESS")} mandeha, ${countOf(groups, "COMPLETED")} vita, ${countOf(groups, "CANCELLED")} nofoanana.`,
      }, lang),
      table: { columns: [pick({ fr: "Statut", en: "Status", mg: "Toetra" }, lang), pick({ fr: "Nombre", en: "Count", mg: "Isa" }, lang)], rows: (groups as Array<{ status: string; _count: { _all: number } }>).map((g) => [statusLabel(g.status, lang), g._count._all]) },
      suggestions: ctx.suggestions,
    };
  }

  if (subject === "beneficiary") {
    const per: Array<{ projectId: number; _count: { _all: number } }> = await db.beneficiary.groupBy({ by: ["projectId"], where: ctx.byProject, _count: { _all: true } });
    const total = per.reduce((n, g) => n + g._count._all, 0);
    const names: Array<{ id: number; name: string }> = await db.project.findMany({ where: { id: { in: per.map((g) => g.projectId) } }, select: { id: true, name: true } });
    const nameOf = (id: number) => names.find((n) => n.id === id)?.name ?? `#${id}`;
    const small = pick({ fr: "moins de 5", en: "fewer than 5", mg: "latsaky ny 5" }, lang);
    // Anti-recoupement : si une ligne est masquée (< 5), le total n'est donné que sur les lignes visibles (« au moins »),
    // sinon total − lignes affichées révélerait l'effectif masqué.
    const visible = per.filter((g) => suppressSmall(g._count._all) !== null).reduce((n, g) => n + g._count._all, 0);
    const hidden = per.some((g) => suppressSmall(g._count._all) === null);
    const shown = hidden ? visible : suppressSmall(total);
    const qty = shown === null ? small : hidden ? pick({ fr: `au moins ${shown}`, en: `at least ${shown}`, mg: `farafahakeliny ${shown}` }, lang) : String(shown);
    return {
      reply: pick({
        fr: `${qty} bénéficiaire(s) enregistré(s) sur ${per.length} projet(s). Les effectifs inférieurs à 5 ne sont pas détaillés (protection des personnes).`,
        en: `${qty} beneficiary(ies) registered across ${per.length} project(s). Counts under 5 are not detailed (protection of individuals).`,
        mg: `Mpahazo tombontsoa ${qty} voasoratra amin'ny tetikasa ${per.length}. Ny isa latsaky ny 5 dia tsy ampisehoana antsipiriany (fiarovana ny olona).`,
      }, lang),
      table: { columns: [term("project", lang), term("beneficiary", lang)], rows: per.sort((a, b) => b._count._all - a._count._all).slice(0, 10).map((g) => [nameOf(g.projectId), suppressSmall(g._count._all) ?? small]) },
      suggestions: ctx.suggestions,
    };
  }

  if (subject === "evaluation") {
    const groups = await db.evaluation.groupBy({ by: ["status"], where: ctx.byProject, _count: { _all: true } });
    const total = (groups as Array<{ _count: { _all: number } }>).reduce((n, g) => n + g._count._all, 0);
    return {
      reply: pick({
        fr: `${total} évaluation(s) : ${countOf(groups, "DRAFT")} brouillon(s), ${countOf(groups, "SUBMITTED")} soumise(s) (à valider), ${countOf(groups, "VALIDATED")} validée(s).`,
        en: `${total} evaluation(s): ${countOf(groups, "DRAFT")} draft, ${countOf(groups, "SUBMITTED")} submitted (to validate), ${countOf(groups, "VALIDATED")} validated.`,
        mg: `Fanombanana ${total}: ${countOf(groups, "DRAFT")} volavolana, ${countOf(groups, "SUBMITTED")} nalefa (miandry fankatoavana), ${countOf(groups, "VALIDATED")} nankatoavina.`,
      }, lang),
      table: { columns: [pick({ fr: "Statut", en: "Status", mg: "Toetra" }, lang), pick({ fr: "Nombre", en: "Count", mg: "Isa" }, lang)], rows: (groups as Array<{ status: string; _count: { _all: number } }>).map((g) => [statusLabel(g.status, lang), g._count._all]) },
      suggestions: ctx.suggestions,
    };
  }

  if (subject === "internship") {
    const groups = await db.internship.groupBy({ by: ["status"], where: ctx.byProject, _count: { _all: true } });
    const total = (groups as Array<{ _count: { _all: number } }>).reduce((n, g) => n + g._count._all, 0);
    return {
      reply: pick({
        fr: `${total} stage(s) : ${countOf(groups, "PENDING")} en attente, ${countOf(groups, "IN_PROGRESS")} en cours, ${countOf(groups, "COMPLETED")} terminé(s), ${countOf(groups, "CANCELLED")} annulé(s).`,
        en: `${total} internship(s): ${countOf(groups, "PENDING")} pending, ${countOf(groups, "IN_PROGRESS")} in progress, ${countOf(groups, "COMPLETED")} completed, ${countOf(groups, "CANCELLED")} cancelled.`,
        mg: `Stage ${total}: ${countOf(groups, "PENDING")} miandry, ${countOf(groups, "IN_PROGRESS")} mandeha, ${countOf(groups, "COMPLETED")} vita, ${countOf(groups, "CANCELLED")} nofoanana.`,
      }, lang),
      table: { columns: [pick({ fr: "Statut", en: "Status", mg: "Toetra" }, lang), pick({ fr: "Nombre", en: "Count", mg: "Isa" }, lang)], rows: (groups as Array<{ status: string; _count: { _all: number } }>).map((g) => [statusLabel(g.status, lang), g._count._all]) },
      suggestions: ctx.suggestions,
    };
  }

  return null;
}
