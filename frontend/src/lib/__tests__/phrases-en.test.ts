import test from "node:test";
import assert from "node:assert/strict";
import { PHRASES_EN, PHRASE_COUNT_EN, normalizeKeyEn, translatePhraseEn } from "../i18n/phrases.en";
import { PHRASES_MG } from "../i18n/phrases.mg";
import { translateFor } from "../i18n/phrases";
import { en, fr } from "../i18n/dictionaries";

test("phrases connues traduites, espaces conservés", () => {
  assert.equal(translatePhraseEn("Supprimer"), "Delete");
  assert.equal(translatePhraseEn("  En cours \n"), "  In progress \n");
  assert.equal(translatePhraseEn("Chargement…"), "Loading…");
});
test("variantes d'apostrophe / points de suspension / entités", () => {
  assert.equal(translatePhraseEn("Zones d’intervention"), "Intervention zones");
  assert.equal(translatePhraseEn("Chargement..."), "Loading…");
  assert.equal(translatePhraseEn("Siège de l&apos;ONG"), "NGO headquarters");
});
test("texte inconnu ou vide inchangé ; motifs à trous", () => {
  assert.equal(translatePhraseEn("Phrase jamais vue"), "Phrase jamais vue");
  assert.equal(translatePhraseEn("   "), "   ");
  assert.equal(translatePhraseEn("Supprimer « Test » ?"), "Delete “Test”?");
  assert.equal(translatePhraseEn("3 projet(s)"), "3 project(s)");
  assert.equal(translatePhraseEn("lundi 9 novembre 2026"), "Monday, November 9, 2026");
});
test("couverture identique au dictionnaire malgache : chaque phrase malgache a son équivalent anglais", () => {
  for (const k of Object.keys(PHRASES_MG)) assert.ok(PHRASES_EN[k] !== undefined, `manque en anglais : ${k}`);
  for (const [k, v] of Object.entries(PHRASES_EN)) assert.ok(v.trim().length > 0, k);
  assert.ok(PHRASE_COUNT_EN >= 1000, `couverture ${PHRASE_COUNT_EN}`);
});
test("le dictionnaire existant fait foi : toute phrase qu'il contient est traduite comme lui", () => {
  const seen = new Set<string>();
  for (const k of Object.keys(fr) as Array<keyof typeof fr>) {
    const key = normalizeKeyEn(String(fr[k]));
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = translatePhraseEn(String(fr[k]));
    if (hit !== String(fr[k])) assert.equal(hit, String(en[k]), `écart avec ${String(k)}`);
  }
});
test("translateFor : français inchangé, mg et en traduits", () => {
  assert.equal(translateFor("fr", "Enregistrer"), "Enregistrer");
  assert.equal(translateFor("en", "Enregistrer"), "Save");
  assert.equal(translateFor("mg", "Enregistrer"), "Tahirizina");
});
