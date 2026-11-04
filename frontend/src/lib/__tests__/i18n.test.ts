import test from "node:test";
import assert from "node:assert/strict";
import { fr, mg } from "../i18n/dictionaries";
import { isLang, translate } from "../i18n/translate";

test("chaque clé française existe en malgache, et inversement", () => {
  assert.deepEqual(Object.keys(mg).sort(), Object.keys(fr).sort());
});

test("aucune traduction vide", () => {
  for (const [k, v] of Object.entries(mg)) assert.ok(v.trim().length > 0, `mg vide : ${k}`);
});

test("translate : langue, repli et variables", () => {
  assert.equal(translate("fr", "common.save"), "Enregistrer");
  assert.equal(translate("mg", "common.save"), "Tahirizina");
  assert.equal(translate("mg", "inconnue.cle", undefined, "Repli"), "Repli");
  assert.equal(translate("mg", "inconnue.cle"), "inconnue.cle");
  assert.equal(translate("fr", "x", { n: 3 }, "{n} élèves"), "3 élèves");
});

test("isLang", () => {
  assert.ok(isLang("fr") && isLang("mg"));
  assert.ok(!isLang("en") && !isLang(null));
});
