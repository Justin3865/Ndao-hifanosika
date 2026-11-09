// src/services/noteDecisions.ts  (AJOUT) — décisions de vérification des anomalies avant la note.
// Stockage dans la table existante AnomalyAction (aucune migration) : clé « NOTEVERIF:<clé de l'anomalie> ».
// JUSTIFIED  -> la présence est légitime : l'anomalie d'origine est aussi marquée RÉSOLUE (plus de notification).
// CONFIRMED  -> l'anomalie est avérée : elle reste active et compte pour la proposition de pénalité.
// IN_REVIEW  -> en cours de vérification.

import { db } from "../utils/db";
import type { CaseDecision } from "../utils/extraAnomalyRules";

export const VERIF_PREFIX = "NOTEVERIF:";
const JUSTIFIED_MARK = "[NOTE] ";

export interface DecisionRow {
  decision: Exclude<CaseDecision, "PENDING">;
  comment: string;
  by: string | null;
  at: string;
}

const STATUS_OF: Record<DecisionRow["decision"], string> = { JUSTIFIED: "RESOLVED", CONFIRMED: "RESOLVED", IN_REVIEW: "IN_PROGRESS" };

export async function loadDecisions(): Promise<Map<string, DecisionRow>> {
  const out = new Map<string, DecisionRow>();
  try {
    const rows = (await db.anomalyAction.findMany({ where: { key: { startsWith: VERIF_PREFIX } } })) as Array<{ key: string; note: string | null; userName: string | null; updatedAt: Date }>;
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.note ?? "{}") as { decision?: string; comment?: string };
        if (parsed.decision === "JUSTIFIED" || parsed.decision === "CONFIRMED" || parsed.decision === "IN_REVIEW") {
          out.set(row.key.slice(VERIF_PREFIX.length), { decision: parsed.decision, comment: parsed.comment ?? "", by: row.userName, at: row.updatedAt.toISOString() });
        }
      } catch {
        /* ligne illisible : ignorée */
      }
    }
  } catch {
    /* table absente : aucune décision (tout est « à vérifier ») */
  }
  return out;
}

export async function saveDecision(key: string, type: string, title: string, decision: DecisionRow["decision"], comment: string, user: { id: number; name: string }): Promise<void> {
  const note = JSON.stringify({ decision, comment: comment.slice(0, 500) });
  const base = { type: "NOTE_VERIFICATION", title: title.slice(0, 200), status: STATUS_OF[decision], note, snoozedUntil: null, userId: user.id, userName: user.name };
  await db.anomalyAction.upsert({ where: { key: `${VERIF_PREFIX}${key}` }, create: { key: `${VERIF_PREFIX}${key}`, ...base }, update: base });

  if (decision === "JUSTIFIED") {
    const silent = { type, title: title.slice(0, 200), status: "RESOLVED", note: `${JUSTIFIED_MARK}Justifiée : ${comment.slice(0, 400)}`, snoozedUntil: null, userId: user.id, userName: user.name };
    await db.anomalyAction.upsert({ where: { key }, create: { key, ...silent }, update: silent });
  } else {
    // Décision modifiée : on ne retire que la résolution posée par cette vérification, jamais celle d'un utilisateur.
    await db.anomalyAction.deleteMany({ where: { key, note: { startsWith: JUSTIFIED_MARK } } });
  }
}
