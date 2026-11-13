import test from "node:test";
import assert from "node:assert/strict";
import { en, fr, mg, LANGS } from "../i18n/dictionaries";
import { isLang, translate } from "../i18n/translate";

test("chaque clé française existe en malgache et en anglais, et inversement", () => {
  assert.deepEqual(Object.keys(mg).sort(), Object.keys(fr).sort());
  assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort());
});

test("aucune traduction vide ; mêmes variables {x} dans les trois langues", () => {
  const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
  for (const k of Object.keys(fr) as Array<keyof typeof fr>) {
    assert.ok(mg[k].trim().length > 0, `mg vide : ${k}`);
    assert.ok(en[k].trim().length > 0, `en vide : ${k}`);
    assert.equal(vars(mg[k]), vars(fr[k]), `variables mg : ${k}`);
    assert.equal(vars(en[k]), vars(fr[k]), `variables en : ${k}`);
  }
});

test("translate : langue, repli et variables", () => {
  assert.equal(translate("fr", "common.save"), "Enregistrer");
  assert.equal(translate("en", "common.save"), "Save");
  assert.equal(translate("mg", "common.save"), "Tahirizina");
  assert.equal(translate("en", "inconnue.cle", undefined, "Repli"), "Repli");
  assert.equal(translate("mg", "inconnue.cle"), "inconnue.cle");
  assert.equal(translate("fr", "x", { n: 3 }, "{n} élèves"), "3 élèves");
  assert.equal(translate("en", "journey.results", { n: 4 }), "4 results");
});

test("isLang et sélecteur de langue : FR, EN, MG", () => {
  assert.ok(isLang("fr") && isLang("mg") && isLang("en"));
  assert.ok(!isLang("de") && !isLang(null));
  assert.deepEqual(LANGS.map((l) => l.code).sort(), ["en", "fr", "mg"]);
});
