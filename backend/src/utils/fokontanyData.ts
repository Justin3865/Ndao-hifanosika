/**
 * Communes et fokontany de Madagascar, lus depuis un fichier local (data/mg-fokontany-by-commune.json).
 *
 * OpenStreetMap contient rarement les fokontany et ses serveurs (Overpass) sont souvent surchargés :
 * la liste OFFICIELLE vient donc de ce fichier. OpenStreetMap ne sert plus qu'à localiser (centre, contour).
 *
 * Format du fichier : [{ "commune": "Ambositra I", "fokontany": ["Ambatomena", ...] }, ...]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "../config/logger";

export interface CommuneEntry {
  /** Nom d'origine */
  name: string;
  /** Clé de recherche (sans accents ni ponctuation), ex. "ambositra i" */
  key: string;
  fokontany: string[];
}

const FILE_NAME = "mg-fokontany-by-commune.json";

const CANDIDATES = [
  process.env.ZONES_FOKONTANY_FILE,
  path.join(process.cwd(), "data", FILE_NAME),
  path.join(process.cwd(), "backend", "data", FILE_NAME),
  path.join(__dirname, "..", "..", "data", FILE_NAME),
  path.join(__dirname, "..", "data", FILE_NAME),
].filter((p): p is string => Boolean(p));

/** Mots d'en-tête retirés devant un nom de commune (« Commune urbaine d'Ambositra » -> « ambositra »). */
const LEADING_STOP = new Set(["commune", "urbaine", "rurale", "ville", "de", "du", "d", "la", "le", "l", "des", "firaisana", "kaominina"]);

const ROMAN = new Set(["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]);

export const alnum = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Clé d'une commune : minuscule, sans accent, sans mot d'en-tête. */
export function communeKey(value: unknown): string {
  const tokens = alnum(value).split(" ").filter(Boolean);
  while (tokens.length > 1 && LEADING_STOP.has(tokens[0])) tokens.shift();
  return tokens.join(" ");
}

/** Clé d'un fokontany (le mot « fokontany » est retiré). */
export function fokontanyKey(value: unknown): string {
  return alnum(value)
    .split(" ")
    .filter((t) => t && t !== "fokontany")
    .join(" ");
}

let loaded = false;
let byKey = new Map<string, CommuneEntry>();
let all: CommuneEntry[] = [];

function load() {
  if (loaded) return;
  loaded = true;

  for (const file of CANDIDATES) {
    try {
      if (!fs.existsSync(file)) continue;

      const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
      const data: { commune?: unknown; fokontany?: unknown }[] = JSON.parse(raw);

      const entries: CommuneEntry[] = [];
      for (const row of Array.isArray(data) ? data : []) {
        const name = String(row?.commune ?? "").trim();
        const list = Array.isArray(row?.fokontany) ? row.fokontany.map((f) => String(f ?? "").trim()).filter(Boolean) : [];
        if (!name) continue;
        entries.push({ name, key: communeKey(name), fokontany: list });
      }

      all = entries;
      byKey = new Map(entries.map((e) => [e.key, e]));
      logger.info(`Fokontany : ${entries.length} communes chargées depuis ${file}`);
      return;
    } catch (error) {
      logger.warn(`Fichier des fokontany illisible (${file})`, (error as Error)?.message);
    }
  }

  logger.warn(`Fichier ${FILE_NAME} introuvable : placez-le dans backend/data/ (ou définissez ZONES_FOKONTANY_FILE). Repli sur OpenStreetMap.`);
}

export const hasFokontanyData = (): boolean => {
  load();
  return all.length > 0;
};

export function communeByKey(key: string): CommuneEntry | null {
  load();
  return byKey.get(key) ?? null;
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }

  return prev[b.length];
}

/**
 * Communes de la liste correspondant à un nom venant d'OpenStreetMap ou d'une saisie.
 *  1. nom identique ;
 *  2. « Ambositra » -> « Ambositra I » + « Ambositra II » (communes découpées en numéros) ;
 *  3. « Antananarivo Renivohitra » -> les 6 arrondissements ;
 *  4. faute de frappe légère (1 ou 2 lettres), seulement si un seul candidat convient (désactivé avec fuzzy = false).
 */
export function findCommunes(name: unknown, fuzzy = true): CommuneEntry[] {
  load();

  const key = communeKey(name);
  if (!key || !all.length) return [];

  const exact = byKey.get(key);
  if (exact) return [exact];

  if (/^antananarivo( renivohitra| ville| commune urbaine)?$/.test(key) || key === "renivohitra") {
    const arrondissements = all.filter((e) => /arrondissement/.test(e.key));
    if (arrondissements.length) return arrondissements;
  }

  const numbered = all.filter((e) => {
    if (!e.key.startsWith(`${key} `)) return false;
    return ROMAN.has(e.key.slice(key.length + 1));
  });
  if (numbered.length) return numbered;

  const max = !fuzzy ? 0 : key.length >= 10 ? 2 : key.length >= 6 ? 1 : 0;
  if (!max) return [];

  let best: CommuneEntry[] = [];
  let bestDistance = max + 1;

  for (const e of all) {
    const d = editDistance(key, e.key, max);
    if (d < bestDistance) {
      bestDistance = d;
      best = [e];
    } else if (d === bestDistance && d <= max) {
      best.push(e);
    }
  }

  return best.length === 1 ? best : [];
}
