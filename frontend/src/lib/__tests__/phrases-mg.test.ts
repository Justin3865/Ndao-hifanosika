import test from "node:test";
import assert from "node:assert/strict";
import { PHRASES_MG, PHRASE_COUNT, normalizeKey, translatePhrase } from "../i18n/phrases.mg";
import { fr, mg } from "../i18n/dictionaries";

test("phrases connues traduites, espaces conservés", () => {
  assert.equal(translatePhrase("Supprimer"), "Fafana");
  assert.equal(translatePhrase("  En cours \n"), "  Mandeha \n");
  assert.equal(translatePhrase("Chargement…"), "Eo am-pakàna…");
});
test("variantes d'apostrophe / points de suspension / entités", () => {
  assert.equal(translatePhrase("Zones d’intervention"), "Faritra iasana");
  assert.equal(translatePhrase("Chargement..."), "Eo am-pakàna…");
  assert.equal(translatePhrase("Siège de l&apos;ONG"), "Foiben'ny ONG");
});
test("texte inconnu ou vide inchangé", () => {
  assert.equal(translatePhrase("Phrase jamais vue"), "Phrase jamais vue");
  assert.equal(translatePhrase("   "), "   ");
});
test("aucune traduction vide, assez de couverture", () => {
  for (const [k, v] of Object.entries(PHRASES_MG)) assert.ok(v.trim().length > 0, k);
  assert.ok(PHRASE_COUNT >= 1000, `couverture ${PHRASE_COUNT}`);
});
test("cohérence avec le dictionnaire existant (même mot pour Projet / Fanombanana)", () => {
  assert.equal(PHRASES_MG["Projet"], mg["common.project"]);
  assert.equal(PHRASES_MG["Enregistrer"], mg["common.save"]);
  assert.equal(PHRASES_MG["Annuler"], mg["common.cancel"]);
  assert.equal(normalizeKey(" a  b "), "a b");
});
test("le dictionnaire existant fait foi : toute phrase qu'il contient est traduite comme lui", () => {
  const seen = new Set<string>();
  for (const k of Object.keys(fr) as Array<keyof typeof fr>) {
    const key = normalizeKey(String(fr[k]));
    if (seen.has(key)) continue; // même texte français sous deux clés : la première fait foi
    seen.add(key);
    const hit = translatePhrase(String(fr[k]));
    if (hit !== String(fr[k])) assert.equal(hit, String(mg[k as keyof typeof mg]), `écart avec ${String(k)}`);
  }
});
test("aucune faute de frappe connue, aucune traduction identique au français", () => {
  assert.ok(!Object.values(PHRASES_MG).includes("Hhamarinina"));
  // Identiques à dessein : noms propres, emprunts, abréviations de mois.
  const SAME_ON_PURPOSE = new Set(["Fokontany", "Jan", "Mar", "Licence 3", "Master 2", "Logo", "Malagasy", "ONG Ndao Hifanosika", "Stage", "Stagiaire"]);
  for (const [k, v] of Object.entries(PHRASES_MG)) {
    if (SAME_ON_PURPOSE.has(k)) continue;
    assert.notEqual(normalizeKey(k), normalizeKey(v), `identique : ${k}`);
  }
});
