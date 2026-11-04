import { loadData, runAnalysis } from "./insights.service";
import { postPython } from "./pyLive.service";

export interface NarrativeResult {
  title: string;
  paragraphs: string[];
  text: string;
  /** rules = règles ; llm = reformulé par un LLM ; typescript = repli local (service IA arrêté) */
  source: "rules" | "llm" | "typescript";
  disclaimer: string;
}

const DISCLAIMER = "Synthèse générée automatiquement : aide à la décision, à valider par un responsable.";

interface LooseAnalysis {
  summary?: { headline?: string; counters?: Record<string, number>; recommendations?: string[] };
  anomalies?: Array<{ severity?: string; title?: string }>;
  performance?: Array<{ name?: string; score: number | null }>;
  dropoutRisk?: Array<{ name?: string; riskLevel?: string }>;
}

/** Repli local (même logique que ai-service/app/narrative.py) : la synthèse reste disponible si le service IA est arrêté. */
export function buildLocalNarrative(analysis: LooseAnalysis, period?: string): NarrativeResult {
  const counters = analysis.summary?.counters ?? {};
  const where = period ? ` sur la période ${period}` : "";
  const projects = counters.projects ?? 0;
  const paragraphs: string[] = [
    `Bilan${where} : ${projects} ${projects === 1 ? "projet" : "projets"} suivi(s), dont ${counters.activeProjects ?? 0} actif(s). ${analysis.summary?.headline ?? ""}`.trim(),
  ];

  const ranked = (analysis.performance ?? []).filter((p) => p.score !== null).sort((a, b) => (b.score as number) - (a.score as number));
  if (ranked.length) {
    const avg = ranked.reduce((s, p) => s + (p.score as number), 0) / ranked.length;
    let text = `La performance moyenne des projets évalués est de ${avg.toFixed(0)}/100. Le projet le plus performant est « ${ranked[0].name} » (${ranked[0].score}/100)`;
    if (ranked.length > 1) text += `, le plus fragile est « ${ranked[ranked.length - 1].name} » (${ranked[ranked.length - 1].score}/100)`;
    paragraphs.push(`${text}.`);
  }

  const anomalies = analysis.anomalies ?? [];
  const critical = anomalies.filter((a) => a.severity === "HIGH");
  if (anomalies.length) {
    let text = `${anomalies.length} anomalie(s) détectée(s), dont ${critical.length} critique(s).`;
    if (critical.length) text += ` Principales : ${critical.slice(0, 3).map((a) => a.title).join("; ")}.`;
    paragraphs.push(text);
  } else paragraphs.push("Aucune anomalie détectée dans les données saisies.");

  const dropout = analysis.dropoutRisk ?? [];
  if (dropout.length) {
    const high = dropout.filter((r) => r.riskLevel === "HIGH");
    let text = `Sur ${dropout.length} bénéficiaire(s) analysé(s), ${high.length} présentent un risque d'abandon élevé.`;
    if (high.length) text += ` À contacter en priorité : ${high.slice(0, 3).map((r) => r.name ?? "?").join(", ")}.`;
    paragraphs.push(text);
  }

  const recos = analysis.summary?.recommendations ?? [];
  if (recos.length) paragraphs.push(`Actions recommandées : ${recos.join(" ")}`);

  return {
    title: `Synthèse automatique${period ? ` — ${period}` : ""}`,
    paragraphs,
    text: paragraphs.join("\n\n"),
    source: "typescript",
    disclaimer: DISCLAIMER,
  };
}

/** Synthèse narrative : service IA (règles / LLM optionnel) puis repli local — jamais bloquant. */
export async function getNarrative(period?: string): Promise<NarrativeResult> {
  const analysis = await runAnalysis(await loadData());
  const remote = await postPython<NarrativeResult>("/v1/narrative", { analysis, period: period ?? null });
  if (remote && typeof remote.text === "string") return remote;
  return buildLocalNarrative(analysis as unknown as LooseAnalysis, period);
}
