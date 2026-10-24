import { Request, Response } from "express";
import { logger } from "../config/logger";
import { sendError } from "../middlewares/error.middleware";
import { insightInternals } from "./insights.controller";
import { latestComparison, modelHistory, runAndStoreComparison } from "../ml/compare";
import { scoreHouseholds } from "../ml/vulnerability";

/**
 * Ajouts « IA » (additifs) : catalogue complet des anomalies avec explication, comparaison des
 * méthodes d'apprentissage, historique des modèles et jeux de données pour les graphiques.
 * Tout est calculé depuis la base de données (Prisma) à chaque appel.
 */

type Severity = "HIGH" | "MEDIUM" | "LOW";

interface CatalogEntry {
  type: string;
  label: string;
  origin: "ANALYSE" | "QUALITE_DONNEES";
  levels: Array<{ severity: Severity; condition: string }>;
  rule: string;
  why: string;
  action: string;
}

/** TOUS les cas d'anomalies possibles et ce qui les rend anormaux. */
export const ANOMALY_CATALOG: CatalogEntry[] = [
  {
    type: "OVERDUE_MILESTONE",
    label: "Jalon en retard",
    origin: "ANALYSE",
    levels: [
      { severity: "LOW", condition: "échéance dépassée de 1 à 7 jours" },
      { severity: "MEDIUM", condition: "échéance dépassée de 8 à 30 jours" },
      { severity: "HIGH", condition: "échéance dépassée de plus de 30 jours" },
    ],
    rule: "Un jalon sans date de réalisation (completedAt) dont l'échéance (dueDate) est passée.",
    why: "Le calendrier du projet n'est pas respecté : tant que le jalon n'est pas clôturé, les activités et paiements qui en dépendent risquent d'être bloqués.",
    action: "Clôturer le jalon s'il est terminé, sinon replanifier ou lever le blocage.",
  },
  {
    type: "PROJECT_OVERDUE",
    label: "Projet dépassé",
    origin: "ANALYSE",
    levels: [{ severity: "HIGH", condition: "projet ACTIF dont la date de fin est passée" }],
    rule: "Statut ACTIVE alors que endDate < aujourd'hui.",
    why: "Le projet continue à consommer des ressources au-delà de sa période prévue, sans avenant ni clôture enregistrés.",
    action: "Prolonger officiellement le projet (nouvelle date de fin) ou le clôturer.",
  },
  {
    type: "BUDGET_EXCEEDED",
    label: "Budget dépassé",
    origin: "ANALYSE",
    levels: [{ severity: "HIGH", condition: "somme des budgets d'activités > budget du projet" }],
    rule: "Σ budget des activités (hors annulées) > budget du projet (budget > 0).",
    why: "Les engagements dépassent l'enveloppe validée par le bailleur : risque de dépenses non éligibles.",
    action: "Réallouer le budget, réduire des activités ou demander un avenant budgétaire.",
  },
  {
    type: "TARGET_GAP",
    label: "Objectif bénéficiaires en retard",
    origin: "ANALYSE",
    levels: [{ severity: "MEDIUM", condition: "plus de 50 % du temps écoulé et moins de 30 % de la cible atteinte" }],
    rule: "Projet ACTIF, cible > 0, temps écoulé > 50 % et bénéficiaires enregistrés / cible < 30 %.",
    why: "Le rythme d'inscription est trop lent pour atteindre la cible à la date de fin du projet.",
    action: "Intensifier l'identification des bénéficiaires ou réviser la cible.",
  },
  {
    type: "SCORE_OUTLIER",
    label: "Score d'évaluation atypique",
    origin: "ANALYSE",
    levels: [{ severity: "LOW", condition: "|z| > 1,8 écart-type par rapport à la moyenne (au moins 5 évaluations notées)" }],
    rule: "z = (score − moyenne) / écart-type ; anomalie si |z| > 1,8.",
    why: "Le score s'écarte fortement des autres évaluations : soit une vraie performance exceptionnelle, soit une erreur de saisie.",
    action: "Vérifier la saisie et la grille de notation de l'évaluation.",
  },
  {
    type: "INTERNSHIP_OVERDUE",
    label: "Stage à clôturer",
    origin: "ANALYSE",
    levels: [{ severity: "MEDIUM", condition: "stage « en cours » dont la date de fin est passée" }],
    rule: "Statut IN_PROGRESS alors que endDate < aujourd'hui.",
    why: "Le statut ne reflète plus la réalité : attestation et évaluation du stagiaire restent bloquées.",
    action: "Clôturer le stage et délivrer l'attestation.",
  },
  {
    type: "INTERNSHIP_NOT_STARTED",
    label: "Stage non démarré",
    origin: "ANALYSE",
    levels: [{ severity: "LOW", condition: "stage « en attente » dont la date de début est passée" }],
    rule: "Statut PENDING alors que startDate < aujourd'hui.",
    why: "Le stage devait avoir commencé : statut non mis à jour ou démarrage retardé.",
    action: "Passer le stage en cours ou reporter sa date de début.",
  },
  {
    type: "PENDING_USER",
    label: "Inscription en attente",
    origin: "ANALYSE",
    levels: [{ severity: "LOW", condition: "demande d'accès non traitée depuis 7 jours ou plus" }],
    rule: "Utilisateur au statut PENDING créé il y a ≥ 7 jours.",
    why: "Une personne attend une validation : délai de traitement anormalement long.",
    action: "Approuver ou refuser la demande.",
  },
  /* ---- contrôles de qualité des données (ajoutés) ---- */
  {
    type: "BENEFICIARY_DUPLICATE",
    label: "Bénéficiaire en double",
    origin: "QUALITE_DONNEES",
    levels: [{ severity: "MEDIUM", condition: "même nom + prénom (+ même âge) dans le même projet" }],
    rule: "Au moins deux bénéficiaires du même projet ont le même prénom, nom et âge.",
    why: "Le même ménage risque d'être compté deux fois : les statistiques d'impact sont gonflées.",
    action: "Fusionner ou supprimer le doublon.",
  },
  {
    type: "BENEFICIARY_AGE_INVALID",
    label: "Âge invalide",
    origin: "QUALITE_DONNEES",
    levels: [{ severity: "MEDIUM", condition: "âge négatif ou supérieur à 110 ans" }],
    rule: "age < 0 ou age > 110.",
    why: "Valeur impossible : probablement une faute de frappe qui fausse les indicateurs par tranche d'âge et le modèle d'IA.",
    action: "Corriger l'âge dans la fiche du bénéficiaire.",
  },
  {
    type: "PROJECT_NO_BUDGET",
    label: "Projet actif sans budget",
    origin: "QUALITE_DONNEES",
    levels: [{ severity: "LOW", condition: "projet ACTIF avec un budget nul ou vide" }],
    rule: "Statut ACTIVE et budget ≤ 0.",
    why: "Sans budget de référence, le contrôle de dépassement budgétaire est impossible.",
    action: "Renseigner le budget du projet.",
  },
  {
    type: "PROJECT_NO_ACTIVITY",
    label: "Projet actif sans activité",
    origin: "QUALITE_DONNEES",
    levels: [{ severity: "LOW", condition: "projet ACTIF sans aucune activité enregistrée" }],
    rule: "Statut ACTIVE et aucune activité (hors annulée).",
    why: "Un projet actif sans activité ne peut pas être suivi (avancement, budget) : il est probablement incomplet.",
    action: "Planifier les activités ou repasser le projet en brouillon.",
  },
];

const handler =
  (fn: (req: Request) => Promise<unknown>, message: string) => async (req: Request, res: Response) => {
    try {
      res.json({ success: true, data: await fn(req) });
    } catch (error) {
      logger.error(message, error);
      sendError(res, error, message);
    }
  };

type Item = { severity: Severity; title: string; detail: string; link: string };

function extraAnomalies(data: Awaited<ReturnType<typeof insightInternals.loadData>>) {
  const out: Array<Item & { type: string }> = [];
  const nameOf = (id: number) => data.projects.find((p) => p.id === id)?.name ?? `Projet #${id}`;

  const groups = new Map<string, typeof data.beneficiaries>();
  data.beneficiaries.forEach((b) => {
    const key = `${b.projectId}|${b.firstName}`.toLowerCase() + `|${String(b.lastName).toLowerCase()}|${b.age ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  });

  groups.forEach((list) => {
    if (list.length > 1)
      out.push({
        type: "BENEFICIARY_DUPLICATE",
        severity: "MEDIUM",
        title: `Doublon : ${list[0].firstName} ${list[0].lastName}`,
        detail: `${list.length} fiches identiques dans ${nameOf(list[0].projectId)} (n° ${list.map((l) => l.id).join(", ")}).`,
        link: `/beneficiaries/${list[0].id}`,
      });
  });

  data.beneficiaries.forEach((b) => {
    if (b.age !== null && b.age !== undefined && (b.age < 0 || b.age > 110))
      out.push({
        type: "BENEFICIARY_AGE_INVALID",
        severity: "MEDIUM",
        title: `Âge invalide : ${b.firstName} ${b.lastName}`,
        detail: `Âge saisi : ${b.age} ans (valeur attendue entre 0 et 110) — ${nameOf(b.projectId)}.`,
        link: `/beneficiaries/${b.id}`,
      });
  });

  data.projects.forEach((p) => {
    if (p.status !== "ACTIVE") return;

    if (Number(p.budget ?? 0) <= 0)
      out.push({
        type: "PROJECT_NO_BUDGET",
        severity: "LOW",
        title: `Budget manquant : ${p.name}`,
        detail: "Projet actif sans budget renseigné.",
        link: `/projects/${p.id}`,
      });

    if (!data.activities.some((a) => a.projectId === p.id && a.status !== "CANCELLED"))
      out.push({
        type: "PROJECT_NO_ACTIVITY",
        severity: "LOW",
        title: `Aucune activité : ${p.name}`,
        detail: "Projet actif sans activité enregistrée.",
        link: `/projects/${p.id}`,
      });
  });

  return out;
}

async function anomalyCatalog() {
  const data = await insightInternals.loadData();
  const detected = [...insightInternals.computeAnomalies(data), ...extraAnomalies(data)] as Array<Item & { type: string }>;
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  const cases = ANOMALY_CATALOG.map((entry) => {
    const items = detected.filter((a) => a.type === entry.type).sort((a, b) => order[a.severity] - order[b.severity]);

    return {
      ...entry,
      count: items.length,
      bySeverity: {
        HIGH: items.filter((i) => i.severity === "HIGH").length,
        MEDIUM: items.filter((i) => i.severity === "MEDIUM").length,
        LOW: items.filter((i) => i.severity === "LOW").length,
      },
      items,
    };
  });

  // Anomalies détectées dont le type n'est pas (encore) dans le catalogue : jamais perdues
  const known = new Set(ANOMALY_CATALOG.map((c) => c.type));
  const unknown = detected.filter((a) => !known.has(a.type));

  // Répartition par projet (à partir du nom cité dans le détail)
  const perProject = data.projects
    .map((p) => ({
      project: p.name,
      count: detected.filter((a) => a.detail.includes(p.name) || a.title.includes(p.name)).length,
    }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    generatedAt: new Date().toISOString(),
    total: detected.length,
    typesWithCases: cases.filter((c) => c.count > 0).length,
    typesTotal: cases.length,
    cases,
    other: unknown,
    perProject,
  };
}

/** Jeux de données prêts pour les graphiques (histogrammes, courbes) – tous issus de la base. */
async function chartData() {
  const data = await insightInternals.loadData();
  const performance = insightInternals.computePerformance(data);
  const dropout = insightInternals.computeDropoutRisk(data);

  const bins = (values: number[], size: number, max = 100) => {
    const n = Math.ceil(max / size);
    const counts = new Array(n).fill(0);
    values.forEach((v) => counts[Math.min(n - 1, Math.max(0, Math.floor(v / size)))]++);
    return counts.map((count, i) => ({ from: i * size, to: Math.min(max, (i + 1) * size), count }));
  };

  let vulnerability: Array<{ id: number; score: number; scoreSgd: number | null; scoreMlp: number | null; vulnerable: boolean; method: string }> = [];

  try {
    vulnerability = (await scoreHouseholds()).map((h) => ({
      id: h.id,
      score: h.score,
      scoreSgd: h.scoreSgd,
      scoreMlp: h.scoreMlp,
      vulnerable: h.vulnerable,
      method: h.method,
    }));
  } catch (error) {
    logger.warn?.("Scores de vulnérabilité indisponibles pour les graphiques", error);
  }

  const levelCount = (levels: string[]) =>
    ["GOOD", "WATCH", "CRITICAL", "UNKNOWN"].map((level) => ({ level, count: levels.filter((l) => l === level).length }));

  return {
    performance: {
      histogram: bins(performance.filter((p) => p.score !== null).map((p) => p.score as number), 10),
      levels: levelCount(performance.map((p) => p.level)),
    },
    dropout: {
      histogram: bins(dropout.map((d: { riskScore: number }) => d.riskScore), 10),
      levels: ["HIGH", "MEDIUM", "LOW"].map((level) => ({ level, count: dropout.filter((d: { riskLevel: string }) => d.riskLevel === level).length })),
      byProject: data.projects
        .map((p) => {
          const rows = dropout.filter((d: { projectName: string }) => d.projectName === p.name);
          return {
            project: p.name,
            count: rows.length,
            average: rows.length ? Math.round(rows.reduce((s: number, r: { riskScore: number }) => s + r.riskScore, 0) / rows.length) : 0,
          };
        })
        .filter((p) => p.count > 0),
    },
    vulnerability: {
      histogram: bins(vulnerability.map((v) => v.score), 10),
      histogramFlagged: bins(vulnerability.filter((v) => v.vulnerable).map((v) => v.score), 10),
      histogramOthers: bins(vulnerability.filter((v) => !v.vulnerable).map((v) => v.score), 10),
      curve: [...vulnerability]
        .sort((a, b) => b.score - a.score)
        .map((v, i) => ({ rank: i + 1, score: v.score, sgd: v.scoreSgd, mlp: v.scoreMlp, vulnerable: v.vulnerable })),
      flagged: vulnerability.filter((v) => v.vulnerable).length,
      total: vulnerability.length,
      method: vulnerability[0]?.method ?? null,
    },
  };
}

export const getAnomalyCatalog = handler(() => anomalyCatalog(), "Erreur lors du catalogue d'anomalies");
export const getChartData = handler(() => chartData(), "Erreur lors du calcul des graphiques");
export const getModelHistory = handler(() => modelHistory(), "Erreur lors de l'historique des modèles");

/** Dernière comparaison enregistrée ; si aucune, elle est calculée et enregistrée. */
export const getComparison = handler(async () => (await latestComparison()) ?? (await runAndStoreComparison()), "Erreur lors de la comparaison des modèles");

/** Relance la comparaison (ADMIN, DSI) et l'enregistre dans la base. */
export const runComparison = handler(() => runAndStoreComparison(), "Erreur lors de l'entraînement comparatif");
