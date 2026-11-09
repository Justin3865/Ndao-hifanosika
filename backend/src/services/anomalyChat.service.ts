// src/services/anomalyChat.service.ts  (AJOUT) — le chatbot répond aux questions sur les anomalies, les jours
// non ouvrables et la vérification avant la note, à partir des vraies données. FR + malgache courant.
// Renvoie null si la question ne concerne pas ce sujet : le chatbot existant continue alors normalement.

import type { ChatAnswer } from "../ml/chatbot";
import { ANOMALY_CATALOG } from "./anomalyCatalog";
import { computeExtra } from "./extraAnomalies.service";
import { listSummaries } from "./noteAnomaly.service";
import { nonWorkingDaysOfYear } from "../utils/extraAnomalyRules";

const TOPIC = /anomali|hadisoana|ferie|non ouvrable|jour ouvrable|tsy fiasana|fialan-tsasatra|fialantsasatra|verif|hamarino|fanamarinana|note.*(presence|baisse|anomal)|(presence|anomal).*note|isa.*(anomal|fanatrehana)|fanatrehana.*(andro|alahady|sabotsy)/;
const ALLOWED = new Set(["ADMIN", "DIRECTION", "RH", "DSI", "COORDINATOR"]);
const SEV: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const SEV_FR: Record<string, string> = { HIGH: "Critique", MEDIUM: "Moyenne", LOW: "Faible" };

export async function answerAnomalyQuestion(text: string, mg: boolean, role: string | undefined, userId?: number): Promise<ChatAnswer | null> {
  if (!TOPIC.test(text)) return null;
  const L = (fr: string, malagasy: string) => (mg ? malagasy : fr);
  const suggestions = [
    L("Quelles présences ont été enregistrées un jour non ouvrable ?", "Iza no fanatrehana voarakitra tamin'ny andro tsy fiasana?"),
    L("Quels stagiaires ont des anomalies à vérifier avant la note ?", "Iza no mpianatra manana anomalie hamarinina alohan'ny naoty?"),
    L("Anomalies des bénéficiaires", "Anomalie ho an'ny mpandray anjara"),
    L("Quels sont les jours fériés cette année ?", "Inona avy ny andro fialan-tsasatra amin'ity taona ity?"),
  ];

  if (!role || !ALLOWED.has(role.toUpperCase())) {
    return { reply: L("Les anomalies détaillées sont réservées à l'administration, à la Direction, à la RH, à la DSI et aux coordinateurs.", "Ny antsipiriany momba ny anomalie dia natokana ho an'ny fitantanana, ny Direction, ny RH, ny DSI ary ny coordinateur."), suggestions };
  }

  /* ---- jours fériés / non ouvrables ---- */
  if (/jours? ferie|ferie|non ouvrable|fialan-tsasatra|fialantsasatra/.test(text) && !/presence|fanatrehana|stagiaire|mpianatra/.test(text)) {
    const year = new Date().getFullYear();
    const days = nonWorkingDaysOfYear(year).filter((d) => !/^(samedi|dimanche)$/.test(d.reason));
    return {
      reply: L(`Jours non ouvrables ${year} hors week-ends : ${days.length}. Toute présence enregistrée ces jours-là est signalée comme anomalie.`, `Andro tsy fiasana ${year} (afa-tsabotsy sy alahady): ${days.length}. Ny fanatrehana rehetra voarakitra tamin'ireo andro ireo dia atao anomalie.`),
      table: { columns: ["Date", "Motif"], rows: days.map((d) => [d.day, d.reason]) },
      suggestions,
    };
  }

  const extra = await computeExtra();

  /* ---- vérification avant la note ---- */
  if (/note|isa|naoty|verif|hamarino|fanamarinana|baisse|stagiaire|mpianatra/.test(text) && userId !== undefined) {
    const summaries = (await listSummaries({ id: userId, role: role.toUpperCase() })).filter((s) => !s.ready || s.counts.confirmed > 0);
    if (!summaries.length) {
      return { reply: L("Aucun stagiaire n'a de cas de présence à vérifier : les notes peuvent être publiées.", "Tsy misy mpianatra manana fanatrehana hamarinina: azo havoaka ny naoty."), suggestions };
    }
    return {
      reply: L(
        `${summaries.length} stage(s) ont des anomalies de présence. Chaque cas doit être confirmé ou justifié par le tuteur ou la RH avant la publication de la note (page « Anomalies & note »). Rien n'est retiré automatiquement.`,
        `Misy fanatrehana tsy mahazatra amin'ny stage ${summaries.length}. Tsy maintsy hamafisin'ny tuteur na ny RH na hohazavaina isaky ny tranga alohan'ny famoahana ny naoty. Tsy misy esorina ho azy.`,
      ),
      table: {
        columns: ["Stagiaire", "À vérifier", "Justifiés", "Confirmés", "Pénalité proposée"],
        rows: summaries.slice(0, 15).map((s) => [s.studentName, s.counts.pending + s.counts.inReview, s.counts.justified, s.counts.confirmed, `${s.penaltyPoints} pt /20`]),
      },
      suggestions,
    };
  }

  /* ---- présences un jour non ouvrable ---- */
  if (/presence|fanatrehana|alahady|sabotsy/.test(text)) {
    const rows = extra.anomalies.filter((a) => a.type === "PRESENCE_NON_WORKING_DAY" || a.type === "ATTENDANCE_NON_WORKING_DAY");
    if (!rows.length) return { reply: L("Aucune présence n'est enregistrée un jour non ouvrable.", "Tsy misy fanatrehana voarakitra tamin'ny andro tsy fiasana."), suggestions };
    return {
      reply: L(`${rows.length} présence(s) ou séance(s) enregistrée(s) un jour non ouvrable. Elles sont à vérifier avant d'entrer dans la note.`, `Misy fanatrehana na fotoam-pampianarana ${rows.length} voarakitra tamin'ny andro tsy fiasana. Tsy maintsy hamarinina alohan'ny hidirany amin'ny naoty.`),
      table: { columns: ["Type", "Cas", "Gravité"], rows: rows.slice(0, 15).map((a) => [a.type === "PRESENCE_NON_WORKING_DAY" ? "Stagiaire" : "Bénéficiaires", a.title, SEV_FR[a.severity]]) },
      suggestions,
    };
  }

  /* ---- anomalies par domaine ---- */
  const scope = /stagiaire|mpianatra|stage/.test(text) ? "Stage" : /benefici|mpandray|tokantrano/.test(text) ? "Bénéficiaire" : /projet|tetikasa|activite/.test(text) ? "Projet" : null;
  if (/types?|karazana|catalogue|liste/.test(text) && !scope) {
    return {
      reply: L(`Le catalogue compte ${ANOMALY_CATALOG.length} types d'anomalies (projets, jalons, activités, stagiaires, bénéficiaires, présences).`, `Misy karazana anomalie ${ANOMALY_CATALOG.length} ao amin'ny catalogue.`),
      table: { columns: ["Domaine", "Type", "Gravité"], rows: ANOMALY_CATALOG.slice(0, 40).map((t) => [t.scope, t.label, SEV_FR[t.severity]]) },
      suggestions,
    };
  }

  const scopeOf = (type: string) => ANOMALY_CATALOG.find((t) => t.code === type)?.scope ?? "";
  const list = extra.anomalies
    .filter((a) => (scope === null ? true : scope === "Projet" ? ["Projet", "Activité"].includes(scopeOf(a.type)) : scopeOf(a.type) === scope))
    .sort((a, b) => SEV[a.severity] - SEV[b.severity]);
  if (!list.length) return { reply: L("Aucune anomalie complémentaire détectée pour ce périmètre.", "Tsy misy anomalie hita ho an'io faritra io."), suggestions };
  return {
    reply: L(`${list.length} anomalie(s) détectée(s)${scope ? ` (${scope.toLowerCase()})` : ""}. Les plus graves :`, `Anomalie ${list.length} no hita${scope ? ` (${scope})` : ""}. Ireo manan-danja indrindra:`),
    table: { columns: ["Gravité", "Anomalie", "Détail"], rows: list.slice(0, 12).map((a) => [SEV_FR[a.severity], a.title, a.detail.slice(0, 140)]) },
    suggestions,
  };
}
