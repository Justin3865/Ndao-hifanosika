// src/utils/chatTranslateRules.ts — traduction contrôlée FR ↔ EN ↔ MG pour le chatbot (règles PURES).
// Principe du projet : « aucun chiffre / aucun mot inventé ». Le chatbot ne traduit donc QUE à partir du lexique validé
// (les mêmes phrases que l'interface : srcf/src/lib/i18n) ; pour une phrase inconnue il propose les expressions
// connues les plus proches et les termes métier reconnus, au lieu d'inventer une traduction approximative.

import { ChatLang, GLOSSARY, Concept, norm } from "./chatLangRules";

export interface LexiconEntry {
  fr: string;
  en?: string;
  mg?: string;
}

export interface TranslateRequest {
  target: ChatLang;
  source?: ChatLang;
  phrase: string;
}

const LANG_NAMES: Array<[RegExp, ChatLang]> = [
  [/^(?:malagasy|malgache|malagasie|malagasy|teny malagasy)$/, "mg"],
  [/^(?:francais|french|frantsay|teny frantsay)$/, "fr"],
  [/^(?:anglais|english|anglisy|teny anglisy)$/, "en"],
];

export function langFromName(name: string): ChatLang | null {
  const n = norm(name).replace(/^(?:le |la |l'|the |amin'ny |amin ny |ho amin'ny |ho amin ny |en |in |to |into |vers )+/, "").trim();
  for (const [re, l] of LANG_NAMES) if (re.test(n)) return l;
  return null;
}

const LANG_WORD = "(malagasy|malgache|malagasie|francais|french|frantsay|anglais|english|anglisy)";
const strip = (s: string) => s.trim().replace(/^[«“"'\s:]+|[»”"'\s:?.!]+$/g, "").trim();

/** Détecte une demande de traduction dans la question (FR / EN / MG). Renvoie null si ce n'en est pas une. */
export function parseTranslateRequest(raw: string): TranslateRequest | null {
  const t = raw.trim().replace(/[’‘]/g, "'");
  const n = norm(t);
  let m: RegExpExecArray | null;

  // FR : « traduis X en malgache » / « comment dit-on X en anglais ? »
  m = new RegExp(`^(?:traduis|traduire|traduit|traduction de|comment (?:dit|dire|on dit|dit-on|dit on|se dit)|dis(?:-moi)?)\\s+(.+?)\\s+(?:en|vers|au|a l')\\s*(?:langue |teny )?${LANG_WORD}\\s*\\??$`).exec(n);
  if (m) return { phrase: strip(t.slice(n.indexOf(m[1]!), n.indexOf(m[1]!) + m[1]!.length)), target: langFromName(m[2]!)! };
  // FR : « traduis en malgache : X »
  m = new RegExp(`^(?:traduis|traduire|traduction)\\s+(?:en|vers)\\s+${LANG_WORD}\\s*[:\\-]?\\s*(.+)$`).exec(n);
  if (m) return { phrase: strip(t.slice(t.length - m[2]!.length)), target: langFromName(m[1]!)! };
  // FR : « X en malgache ? » (forme courte, phrase brève seulement)
  m = new RegExp(`^(.{2,60}?)\\s+en\\s+${LANG_WORD}\\s*\\??$`).exec(n);
  if (m && !/\b(?:est|sont|combien|quel|quels|quelle)\b/.test(m[1]!)) return { phrase: strip(t.slice(0, m[1]!.length)), target: langFromName(m[2]!)! };

  // EN : « translate X to/into Malagasy » / « how do you say X in French »
  m = new RegExp(`^(?:translate|translation of|how (?:do you|to|can i) say|what is)\\s+(.+?)\\s+(?:to|into|in)\\s+${LANG_WORD}\\s*\\??$`).exec(n);
  if (m && (/^(?:translate|translation|how)/.test(n) || /\b(?:malagasy|french|english)$/.test(n))) return { phrase: strip(t.slice(n.indexOf(m[1]!), n.indexOf(m[1]!) + m[1]!.length)), target: langFromName(m[2]!)! };
  m = new RegExp(`^translate\\s+(?:to|into)\\s+${LANG_WORD}\\s*[:\\-]?\\s*(.+)$`).exec(n);
  if (m) return { phrase: strip(t.slice(t.length - m[2]!.length)), target: langFromName(m[1]!)! };

  // MG : « adikao amin'ny frantsay : X » / « adikao X amin'ny teny anglisy »
  m = new RegExp(`^(?:adikao|dikao|adika)\\s+(?:ho\\s+)?(?:amin'?\\s?ny\\s+)?(?:teny\\s+)?${LANG_WORD}\\s*[:\\-]?\\s*(.+)$`).exec(n);
  if (m) return { phrase: strip(t.slice(t.length - m[2]!.length)), target: langFromName(m[1]!)! };
  m = new RegExp(`^(?:adikao|dikao|adika)\\s+(.+?)\\s+(?:ho\\s+)?(?:amin'?\\s?ny\\s+)?(?:teny\\s+)?${LANG_WORD}\\s*\\??$`).exec(n);
  if (m) return { phrase: strip(t.slice(n.indexOf(m[1]!), n.indexOf(m[1]!) + m[1]!.length)), target: langFromName(m[2]!)! };
  // MG : « inona ny dikan'ny X amin'ny teny frantsay ? » / « ahoana no filazana X amin'ny ... »
  m = new RegExp(`^(?:inona\\s+(?:ny\\s+)?dikan'?\\s?ny|ahoana\\s+no\\s+filazana)\\s+(.+?)\\s+(?:ho\\s+)?(?:amin'?\\s?ny\\s+)?(?:teny\\s+)?${LANG_WORD}\\s*\\??$`).exec(n);
  if (m) return { phrase: strip(t.slice(n.indexOf(m[1]!), n.indexOf(m[1]!) + m[1]!.length)), target: langFromName(m[2]!)! };
  return null;
}

/** Clé de comparaison : sans accents/casse/ponctuation finale, apostrophes unifiées. */
export const lexKey = (s: string): string => norm(s).replace(/[…]/g, "...").replace(/[.:;!?]+$/g, "").replace(/\s+/g, " ").trim();

export interface Lexicon {
  entries: LexiconEntry[];
  index: Record<ChatLang, Map<string, LexiconEntry>>;
}

/** Construit le lexique : phrases de l'interface + libellés du glossaire métier (le glossaire complète, ne remplace pas). */
export function buildLexicon(base: LexiconEntry[]): Lexicon {
  const entries: LexiconEntry[] = base.map((e) => ({ ...e }));
  const seen = new Set(entries.map((e) => lexKey(e.fr)));
  for (const c of Object.keys(GLOSSARY) as Concept[]) {
    const l = GLOSSARY[c].label;
    if (!seen.has(lexKey(l.fr))) {
      entries.push({ fr: l.fr, en: l.en, mg: l.mg });
      seen.add(lexKey(l.fr));
    }
  }
  const index: Lexicon["index"] = { fr: new Map(), en: new Map(), mg: new Map() };
  for (const e of entries) {
    for (const l of ["fr", "en", "mg"] as ChatLang[]) {
      const v = e[l];
      if (v) {
        const k = lexKey(v);
        if (k && !index[l].has(k)) index[l].set(k, e);
      }
    }
  }
  return { entries, index };
}

export type TranslateResult =
  | { kind: "exact"; source: ChatLang; target: ChatLang; text: string; from: string; entry: LexiconEntry }
  | { kind: "same"; source: ChatLang; text: string; entry: LexiconEntry }
  | { kind: "missing-target"; source: ChatLang; target: ChatLang; from: string; entry: LexiconEntry }
  | { kind: "unknown"; target: ChatLang; similar: Array<{ from: string; to: string }>; terms: Array<{ from: string; to: string }> };

const tokens = (s: string) => lexKey(s).split(/[^a-z0-9']+/).filter((w) => w.length > 2);

/** Traduit `phrase` vers `target` à partir du lexique ; sinon propose du proche et des termes reconnus. */
export function translateWithLexicon(phrase: string, target: ChatLang, lex: Lexicon, source?: ChatLang): TranslateResult {
  const key = lexKey(phrase);
  const order: ChatLang[] = source ? [source] : ["fr", "mg", "en"];
  for (const l of order) {
    const hit = lex.index[l].get(key);
    if (!hit) continue;
    if (l === target) return { kind: "same", source: l, text: hit[l]!, entry: hit };
    const out = hit[target];
    return out ? { kind: "exact", source: l, target, text: out, from: hit[l]!, entry: hit } : { kind: "missing-target", source: l, target, from: hit[l]!, entry: hit };
  }

  // Pas de correspondance exacte : expressions proches (recouvrement de mots) et termes connus contenus dans la phrase.
  const want = new Set(tokens(phrase));
  const similar: Array<{ from: string; to: string; score: number }> = [];
  const terms: Array<{ from: string; to: string }> = [];
  for (const e of lex.entries) {
    const to = e[target];
    if (!to) continue;
    for (const l of order) {
      const v = e[l];
      if (!v || l === target) continue;
      const vk = lexKey(v);
      const vt = tokens(v);
      if (!vt.length) continue;
      const common = vt.filter((w) => want.has(w)).length;
      const score = common / Math.max(vt.length, want.size);
      if (common >= 2 && (common / vt.length >= 0.6 || score >= 0.5)) similar.push({ from: v, to, score: common / vt.length });
      if (vt.length <= 3 && vk.length >= 4 && (" " + key + " ").includes(" " + vk + " ")) terms.push({ from: v, to });
    }
  }
  similar.sort((a, b) => b.score - a.score);
  const uniq = <T extends { from: string }>(xs: T[]) => xs.filter((x, i) => xs.findIndex((y) => lexKey(y.from) === lexKey(x.from)) === i);
  return {
    kind: "unknown",
    target,
    similar: uniq(similar).slice(0, 3).map(({ from, to }) => ({ from, to })),
    terms: uniq(terms.sort((a, b) => b.from.length - a.from.length)).slice(0, 6),
  };
}
