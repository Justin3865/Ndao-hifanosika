import { prisma } from "../config/database";
import { analyse, CurveMethod, Analysis, Pt } from "../ml/interpolation";
import { getIntegration, IntegratedIntern, IntegratedProject } from "./integration.service";
import { loadInternshipsMonitoring } from "./internshipMonitoring.service";

/**
 * Courbes d'interpolation (Lagrange / Hermite) pour « Analyses IA ».
 *
 *   PROJETS    : cohorte  = notes finales /20 des projets (classés par date de début)
 *                un projet = avancement réel (%) enregistré par le Suivi & Évaluation dans le temps
 *   STAGIAIRES : cohorte  = notes finales /20 des 12 stagiaires (une personne = un point, classés par fin de stage)
 *                un stagiaire = ses évaluations /20 dans le temps + sa note finale
 *
 * Tout est lu depuis le même « pont » que l'Évaluation finale et le Suivi & Évaluation : mêmes chiffres partout.
 */

export type CurveKind = "projects" | "interns";
export type CurveMode = "cohort" | "single";

export interface CurveRequest {
  kind: CurveKind;
  /** id du projet / du stage (une personne) → courbe individuelle ; absent → cohorte */
  id?: number;
  level?: "L3" | "M2";
  methods?: CurveMethod[];
}

export interface CurvePayload extends Analysis {
  kind: CurveKind;
  mode: CurveMode;
  title: string;
  xLabel: string;
  yLabel: string;
  unit: "/20" | "%";
  /** libellés des nœuds (nom du projet / du stagiaire) */
  labels: Array<{ x: number; label: string }>;
  /** courbe de référence éventuelle (avancement prévu) */
  reference?: { name: string; points: Array<{ x: number; y: number }> };
  /** entités disponibles pour la courbe individuelle (liste déroulante) */
  choices: Array<{ id: number; label: string; points: number }>;
  generatedAt: string;
}

const DAY = 86_400_000;
const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : null);
const r2 = (v: number) => Math.round(v * 100) / 100;

const emptyPayload = (req: CurveRequest, mode: CurveMode, title: string, unit: "/20" | "%", choices: CurvePayload["choices"], message: string): CurvePayload => ({
  ...analyse([], unit === "/20" ? [0, 20] : [0, 100]),
  warnings: [message],
  kind: req.kind,
  mode,
  title,
  xLabel: "",
  yLabel: unit === "/20" ? "Note /20" : "Avancement %",
  unit,
  labels: [],
  choices,
  generatedAt: new Date().toISOString(),
});

/* ------------------------------------------------------------------ STAGIAIRES */

function internCohort(list: IntegratedIntern[], level?: "L3" | "M2") {
  return list
    .filter((i) => i.score !== null && (!level || i.level === level))
    .sort((a, b) => (time(a.endDate ?? a.startDate) ?? 0) - (time(b.endDate ?? b.startDate) ?? 0) || a.id - b.id);
}

async function buildInterns(req: CurveRequest): Promise<CurvePayload> {
  const snapshot = await getIntegration();
  const persons = snapshot.internships;

  const choices = persons
    .map((i) => ({ id: i.id, label: `${i.name} (${i.level})`, points: 0 }))
    .sort((a, b) => a.label.localeCompare(b.label));

  /* ----- un stagiaire : ses évaluations dans le temps + note finale ----- */
  if (req.id) {
    const person = persons.find((i) => i.id === req.id || i.stageIds.includes(req.id as number));
    if (!person) return emptyPayload(req, "single", "Stagiaire introuvable", "/20", choices, "Stagiaire introuvable.");

    const stages = await loadInternshipsMonitoring({}, { id: { in: person.stageIds } });
    const raw: Array<{ t: number; y: number; label: string }> = [];

    for (const { internship } of stages) {
      for (const e of internship.evaluations) {
        const base =
          e.overallScore ??
          (() => {
            const v = [e.technicalScore, e.qualityScore, e.autonomyScore, e.punctualityScore, e.communicationScore].filter((n): n is number => typeof n === "number");
            return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
          })();
        if (base === null || !e.evaluatedAt) continue;
        raw.push({ t: new Date(e.evaluatedAt).getTime(), y: Math.min(Math.max(base, 0), 20), label: e.title || "Évaluation du tuteur" });
      }
    }

    // évaluation finale du stagiaire = dernier point (fin du stage terminé, sinon aujourd'hui)
    if (person.score !== null && person.status === "COMPLETED") {
      raw.push({ t: time(person.endDate) ?? Date.now(), y: person.score, label: "Évaluation finale" });
    }

    raw.sort((a, b) => a.t - b.t);
    const t0 = raw[0]?.t ?? 0;
    const points: Pt[] = raw.map((p) => ({ x: r2((p.t - t0) / DAY), y: r2(p.y), label: p.label }));
    const analysis = analyse(points, [0, 20], req.methods);
    if (points.length < 2) analysis.warnings.push("Ce stagiaire a moins de 2 évaluations datées : ajoutez des évaluations du tuteur pour tracer la courbe.");

    return {
      ...analysis,
      kind: "interns",
      mode: "single",
      title: `${person.name} — évolution des notes /20`,
      xLabel: "Jours depuis la 1re évaluation",
      yLabel: "Note /20",
      unit: "/20",
      labels: analysis.nodes.map((n) => ({ x: n.x, label: n.label ?? "" })),
      choices: choices.map((c) => (c.id === person.id ? { ...c, points: points.length } : c)),
      generatedAt: snapshot.generatedAt,
    };
  }

  /* ----- cohorte : une note finale par stagiaire (12 personnes) ----- */
  const cohort = internCohort(persons, req.level);
  const points: Pt[] = cohort.map((i, index) => ({ x: index + 1, y: i.score as number, label: i.name }));
  const analysis = analyse(points, [0, 20], req.methods);

  return {
    ...analysis,
    kind: "interns",
    mode: "cohort",
    title: `Notes finales des stagiaires${req.level ? ` (${req.level})` : ""} — ${cohort.length} noté(s) sur ${persons.filter((i) => !req.level || i.level === req.level).length}`,
    xLabel: "Stagiaires classés par fin de stage",
    yLabel: "Note finale /20",
    unit: "/20",
    labels: analysis.nodes.map((n) => ({ x: n.x, label: n.label ?? "" })),
    choices,
    generatedAt: snapshot.generatedAt,
  };
}

/* ------------------------------------------------------------------ PROJETS */

const projectCohort = (list: IntegratedProject[]) =>
  list
    .filter((p) => p.finalScore !== null && p.status !== "DRAFT" && p.status !== "CANCELLED")
    .sort((a, b) => (time(a.startDate) ?? 0) - (time(b.startDate) ?? 0) || a.projectId - b.projectId);

async function buildProjects(req: CurveRequest): Promise<CurvePayload> {
  const snapshot = await getIntegration();
  const projects = snapshot.projects.filter((p) => p.status !== "DRAFT" && p.status !== "CANCELLED");

  const choices = projects.map((p) => ({ id: p.projectId, label: `${p.code} — ${p.name}`, points: 0 }));

  /* ----- un projet : avancement réel S&E dans le temps ----- */
  if (req.id) {
    const project = snapshot.projects.find((p) => p.projectId === req.id);
    if (!project) return emptyPayload(req, "single", "Projet introuvable", "%", choices, "Projet introuvable.");

    const rows = await prisma.projectMonitoringSnapshot.findMany({ where: { projectId: project.projectId }, orderBy: { recordedAt: "asc" }, take: 365 });
    const t0 = rows[0] ? new Date(rows[0].recordedAt).getTime() : 0;

    const toPoints = (pick: (r: (typeof rows)[number]) => number | null): Pt[] =>
      rows.flatMap((r) => {
        const y = pick(r);
        return y === null || y === undefined ? [] : [{ x: r2((new Date(r.recordedAt).getTime() - t0) / DAY), y }];
      });

    const analysis = analyse(toPoints((r) => r.actualProgress), [0, 100], req.methods);
    if (analysis.n < 2) analysis.warnings.push("Moins de 2 relevés d'avancement : saisissez des avancements (activités, indicateurs) pour tracer la courbe.");

    return {
      ...analysis,
      kind: "projects",
      mode: "single",
      title: `${project.name} — avancement réel (S&E)`,
      xLabel: "Jours depuis le 1er relevé",
      yLabel: "Avancement %",
      unit: "%",
      labels: [],
      reference: { name: "Avancement prévu", points: toPoints((r) => r.plannedProgress) },
      choices: choices.map((c) => (c.id === project.projectId ? { ...c, points: analysis.n } : c)),
      generatedAt: snapshot.generatedAt,
    };
  }

  /* ----- cohorte : note finale /20 de chaque projet ----- */
  const cohort = projectCohort(snapshot.projects);
  const points: Pt[] = cohort.map((p, index) => ({ x: index + 1, y: p.finalScore as number, label: p.name }));
  const analysis = analyse(points, [0, 20], req.methods);

  return {
    ...analysis,
    kind: "projects",
    mode: "cohort",
    title: `Notes finales des projets — ${cohort.length} noté(s) sur ${projects.length}`,
    xLabel: "Projets classés par date de début",
    yLabel: "Note finale /20",
    unit: "/20",
    labels: analysis.nodes.map((n) => ({ x: n.x, label: n.label ?? "" })),
    choices,
    generatedAt: snapshot.generatedAt,
  };
}

export const buildCurve = (req: CurveRequest): Promise<CurvePayload> => (req.kind === "interns" ? buildInterns(req) : buildProjects(req));
