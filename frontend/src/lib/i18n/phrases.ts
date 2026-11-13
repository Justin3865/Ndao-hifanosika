// src/lib/i18n/phrases.ts — dispatcher: exact-phrase translation of the interface for each target language.
import type { Lang } from "./dictionaries";
import { translatePhrase as toMalagasy } from "./phrases.mg";
import { translatePhraseEn as toEnglish } from "./phrases.en";

/** French is the source language: it is returned unchanged. */
export function translateFor(lang: Lang, text: string): string {
  if (lang === "mg") return toMalagasy(text);
  if (lang === "en") return toEnglish(text);
  return text;
}
