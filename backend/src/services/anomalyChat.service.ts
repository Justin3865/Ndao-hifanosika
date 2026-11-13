// src/services/anomalyChat.service.ts  (AJOUT) — le chatbot répond aux questions sur les anomalies, les jours
// non ouvrables et la vérification avant la note, à partir des vraies données. FR + EN + malagasy (mêmes termes que l'interface).
// Renvoie null si la question ne concerne pas ce sujet : le chatbot existant continue alors normalement.

import type { ChatAnswer } from "../ml/chatbot";
import { ChatLang, pick } from "../utils/chatLangRules";
import { ANOMALY_CATALOG } from "./anomalyCatalog";
import { computeExtra } from "./extraAnomalies.service";
import { listSummaries } from "./noteAnomaly.service";
import { nonWorkingDaysOfYear } from "../utils/extraAnomalyRules";

const TOPIC = /anomal|hadisoana|ferie|holiday|non ouvrable|non.?working|jour ouvrable|tsy fiasana|fialan-tsasatra|fialantsasatra|verif|hamarino|fanamarinana|note.*(presence|baisse|anomal)|grade.*(attendance|anomal|check)|(attendance|anomal).*(grade|mark)|(presence|anomal).*note|isa.*(anomal|fanatrehana)|fanatrehana.*(andro|alahady|sabotsy)/;
const ALLOWED = new Set(["ADMIN", "DIRECTION", "RH", "DSI", "COORDINATOR"]);
const SEV: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const SEV_LABEL: Record<string, Record<ChatLang, string>> = {
  HIGH: { fr: "Critique", en: "Critical", mg: "Manan-danja be" },
  MEDIUM: { fr: "Moyenne", en: "Medium", mg: "Antonony" },
  LOW: { fr: "Faible", en: "Low", mg: "Ambany" },
};

export async function answerAnomalyQuestion(text: string, lang: ChatLang, role: string | undefined, userId?: number): Promise<ChatAnswer | null> {
  if (!TOPIC.test(text)) return null;
  const L = (fr: string, malagasy: string, en: string) => pick({ fr, mg: malagasy, en }, lang);
  const sev = (code: string) => SEV_LABEL[code]?.[lang] ?? code;
  const suggestions = [
    L("Quelles présences ont été enregistrées un jour non ouvrable ?", "Iza no fanatrehana voarakitra tamin'ny andro tsy fiasana?", "Which attendances were recorded on a non-working day?"),
    L("Quels stagiaires ont des anomalies à vérifier avant la note ?", "Iza no mpianatra manana anomalie hamarinina alohan'ny naoty?", "Which interns have anomalies to check before the grade?"),
    L("Anomalies des bénéficiaires", "Anomalie ho an'ny mpahazo tombontsoa", "Beneficiary anomalies"),
    L("Quels sont les jours fériés cette année ?", "Inona avy ny andro fialan-tsasatra amin'ity taona ity?", "What are the public holidays this year?"),
  ];

  if (!role || !ALLOWED.has(role.toUpperCase())) {
    return { reply: L("Les anomalies détaillées sont réservées à l'administration, à la Direction, à la RH, à la DSI et aux coordinateurs.", "Ny antsipiriany momba ny anomalie dia natokana ho an'ny fitantanana, ny Direction, ny RH, ny DSI ary ny mpandrindra.", "Detailed anomalies are reserved for administration, Direction, HR, IT (DSI) and coordinators."), suggestions };
  }

  /* ---- jours fériés / non ouvrables ---- */
  if (/jours? ferie|ferie|holiday|non ouvrable|non.?working day|fialan-tsasatra|fialantsasatra/.test(text) && !/presence|attendance|fanatrehana|stagiaire|intern|mpianatra/.test(text)) {
    const year = new Date().getFullYear();
    const days = nonWorkingDaysOfYear(year).filter((d) => !/^(samedi|dimanche)$/.test(d.reason));
    return {
      reply: L(`Jours non ouvrables ${year} hors week-ends : ${days.length}. Toute présence enregistrée ces jours-là est signalée comme anomalie.`, `Andro tsy fiasana ${year} (afa-tsabotsy sy alahady): ${days.length}. Ny fanatrehana rehetra voarakitra tamin'ireo andro ireo dia atao anomalie.`, `Non-working days ${year} excluding weekends: ${days.length}. Any attendance recorded on those days is flagged as an anomaly.`),
      table: { columns: ["Date", L("Motif", "Antony", "Reason")], rows: days.map((d) => [d.day, d.reason]) },
      suggestions,
    };
  }

  const extra = await computeExtra();

  /* ---- vérification avant la note ---- */
  if (/note|grade|mark|isa|naoty|verif|check|hamarino|fanamarinana|baisse|stagiaire|intern|mpianatra/.test(text) && userId !== undefined) {
    const summaries = (await listSummaries({ id: userId, role: role.toUpperCase() })).filter((s) => !s.ready || s.counts.confirmed > 0);
    if (!summaries.length) {
      return { reply: L("Aucun stagiaire n'a de cas de présence à vérifier : les notes peuvent être publiées.", "Tsy misy mpianatra manana fanatrehana hamarinina: azo havoaka ny naoty.", "No intern has an attendance case to check: grades can be published."), suggestions };
    }
    return {
      reply: L(
        `${summaries.length} stage(s) ont des anomalies de présence. Chaque cas doit être confirmé ou justifié par le tuteur ou la RH avant la publication de la note (page « Anomalies & note »). Rien n'est retiré automatiquement.`,
        `Misy fanatrehana tsy mahazatra amin'ny stage ${summaries.length}. Tsy maintsy hamafisin'ny tuteur na ny RH na hohazavaina isaky ny tranga alohan'ny famoahana ny naoty. Tsy misy esorina ho azy.`,
        `${summaries.length} internship(s) have attendance anomalies. Each case must be confirmed or justified by the tutor or HR before the grade is published (“Anomalies & grade” page). Nothing is removed automatically.`,
      ),
      table: {
        columns: [L("Stagiaire", "Stagiaire", "Intern"), L("À vérifier", "Hamarinina", "To check"), L("Justifiés", "Voamarina mahazatra", "Justified"), L("Confirmés", "Voaporofo", "Confirmed"), L("Pénalité proposée", "Fanalana naoty atolotra", "Suggested penalty")],
        rows: summaries.slice(0, 15).map((s) => [s.studentName, s.counts.pending + s.counts.inReview, s.counts.justified, s.counts.confirmed, `${s.penaltyPoints} pt /20`]),
      },
      suggestions,
    };
  }

  /* ---- présences un jour non ouvrable ---- */
  if (/presence|attendance|fanatrehana|alahady|sabotsy|sunday|saturday|weekend/.test(text)) {
    const rows = extra.anomalies.filter((a) => a.type === "PRESENCE_NON_WORKING_DAY" || a.type === "ATTENDANCE_NON_WORKING_DAY");
    if (!rows.length) return { reply: L("Aucune présence n'est enregistrée un jour non ouvrable.", "Tsy misy fanatrehana voarakitra tamin'ny andro tsy fiasana.", "No attendance is recorded on a non-working day."), suggestions };
    return {
      reply: L(`${rows.length} présence(s) ou séance(s) enregistrée(s) un jour non ouvrable. Elles sont à vérifier avant d'entrer dans la note.`, `Misy fanatrehana na fotoam-pampianarana ${rows.length} voarakitra tamin'ny andro tsy fiasana. Tsy maintsy hamarinina alohan'ny hidirany amin'ny naoty.`, `${rows.length} attendance(s) or session(s) recorded on a non-working day. They must be checked before counting towards the grade.`),
      table: { columns: ["Type", L("Cas", "Tranga", "Case"), L("Gravité", "Hamafin'ny olana", "Severity")], rows: rows.slice(0, 15).map((a) => [a.type === "PRESENCE_NON_WORKING_DAY" ? L("Stagiaire", "Stagiaire", "Intern") : L("Bénéficiaires", "Mpahazo tombontsoa", "Beneficiaries"), a.title, sev(a.severity)]) },
      suggestions,
    };
  }

  /* ---- anomalies par domaine ---- */
  const scope = /stagiaire|intern|mpianatra|stage/.test(text) ? "Stage" : /benefici|mpahazo|mpandray|tokantrano/.test(text) ? "Bénéficiaire" : /projet|project|tetikasa|activite|activit|hetsika/.test(text) ? "Projet" : null;
  if (/types?|karazana|catalogue|liste|\blist\b/.test(text) && !scope) {
    return {
      reply: L(`Le catalogue compte ${ANOMALY_CATALOG.length} types d'anomalies (projets, jalons, activités, stagiaires, bénéficiaires, présences).`, `Misy karazana anomalie ${ANOMALY_CATALOG.length} ao amin'ny catalogue (tetikasa, dingana, hetsika, stagiaire, mpahazo tombontsoa, fanatrehana).`, `The catalogue has ${ANOMALY_CATALOG.length} anomaly types (projects, milestones, activities, interns, beneficiaries, attendance).`),
      table: { columns: [L("Domaine", "Faritra", "Domain"), "Type", L("Gravité", "Hamafin'ny olana", "Severity")], rows: ANOMALY_CATALOG.slice(0, 40).map((t) => [t.scope, t.label, sev(t.severity)]) },
      suggestions,
    };
  }

  const scopeOf = (type: string) => ANOMALY_CATALOG.find((t) => t.code === type)?.scope ?? "";
  const list = extra.anomalies
    .filter((a) => (scope === null ? true : scope === "Projet" ? ["Projet", "Activité"].includes(scopeOf(a.type)) : scopeOf(a.type) === scope))
    .sort((a, b) => SEV[a.severity] - SEV[b.severity]);
  if (!list.length) return { reply: L("Aucune anomalie complémentaire détectée pour ce périmètre.", "Tsy misy anomalie hita ho an'io faritra io.", "No additional anomaly detected for this scope."), suggestions };
  return {
    reply: L(`${list.length} anomalie(s) détectée(s)${scope ? ` (${scope.toLowerCase()})` : ""}. Les plus graves :`, `Anomalie ${list.length} no hita${scope ? ` (${scope})` : ""}. Ireo manan-danja indrindra:`, `${list.length} anomaly(ies) detected${scope ? ` (${scope.toLowerCase()})` : ""}. The most serious:`),
    table: { columns: [L("Gravité", "Hamafin'ny olana", "Severity"), "Anomalie", L("Détail", "Antsipiriany", "Detail")], rows: list.slice(0, 12).map((a) => [sev(a.severity), a.title, a.detail.slice(0, 140)]) },
    suggestions,
  };
}
