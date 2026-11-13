import test from "node:test";
import assert from "node:assert/strict";
import { concepts, detectLang, norm, pick, statusLabel, term } from "../src/utils/chatLangRules";
import { knowledgeSuggestions, matchKnowledge, KNOWLEDGE } from "../src/utils/chatKnowledgeRules";
import { buildLexicon, parseTranslateRequest, translateWithLexicon } from "../src/utils/chatTranslateRules";

test("détection de langue : FR / EN / MG", () => {
  assert.equal(detectLang("Quels sont les ménages les plus vulnérables ?").lang, "fr");
  assert.equal(detectLang("Compare Fianarantsoa et Tamatave").lang, "fr");
  assert.equal(detectLang("How many projects are active?").lang, "en");
  assert.equal(detectLang("Show me the late activities").lang, "en");
  assert.equal(detectLang("Iza avy ny tokantrano marefo indrindra ao Fianarantsoa?").lang, "mg");
  assert.equal(detectLang("Firy ny tetikasa mavitrika?").lang, "mg");
  assert.equal(detectLang("Ahoana no hanampiana mpahazo tombontsoa?").lang, "mg");
});

test("détection : texte ambigu → langue de l'interface, sinon français", () => {
  assert.equal(detectLang("Fianarantsoa", "mg").lang, "mg");
  assert.equal(detectLang("Fianarantsoa", "en").confident, false);
  assert.equal(detectLang("???").lang, "fr");
  // un texte sans ambiguïté l'emporte sur l'indice d'interface
  assert.equal(detectLang("Combien de projets ?", "mg").lang, "fr");
});

test("concepts reconnus quelle que soit la langue", () => {
  for (const q of ["combien de projets", "how many projects", "firy ny tetikasa"]) {
    const c = concepts(q);
    assert.ok(c.has("project") && c.has("count"), q);
  }
  assert.ok(concepts("hetsika tara").has("activity") && concepts("hetsika tara").has("late"));
  assert.ok(concepts("late activities").has("late"));
  assert.ok(concepts("mpahazo tombontsoa firy").has("beneficiary"));
  assert.ok(concepts("tokantrano marefo").has("household") && concepts("tokantrano marefo").has("vulnerable"));
});

test("glossaire : mêmes termes que l'interface (dictionnaire de référence)", () => {
  assert.equal(term("project", "mg"), "tetikasa");
  assert.equal(term("beneficiary", "mg"), "mpahazo tombontsoa");
  assert.equal(term("evaluation", "mg"), "fanombanana");
  assert.equal(term("report", "mg"), "tatitra");
  assert.equal(term("project", "en", true), "projects");
  assert.equal(term("activity", "en", true), "activities");
  assert.equal(term("project", "fr", true), "projets");
  assert.equal(statusLabel("IN_PROGRESS", "mg"), "Mandeha");
  assert.equal(statusLabel("UNKNOWN", "en"), "UNKNOWN");
  assert.equal(pick({ fr: "a", mg: "b" } as { fr: string; en?: string; mg: string }, "en"), "a");
});

test("base de connaissances : trois langues pour chaque entrée, suggestions valides", () => {
  const ids = new Set(KNOWLEDGE.map((e) => e.id));
  assert.equal(ids.size, KNOWLEDGE.length, "identifiants uniques");
  for (const e of KNOWLEDGE) {
    for (const l of ["fr", "en", "mg"] as const) {
      assert.ok(e.answer[l].trim().length > 40, `${e.id}.${l}`);
      assert.ok(e.question[l].trim().length > 5, `${e.id}.question.${l}`);
    }
    for (const n of e.next) assert.ok(ids.has(n), `${e.id} → ${n}`);
    for (const re of e.triggers) assert.doesNotThrow(() => new RegExp(norm(re)), `${e.id}: ${re}`);
  }
});

test("base de connaissances : la bonne entrée est trouvée dans les trois langues", () => {
  const cases: Array<[string, string]> = [
    ["Comment ajouter un bénéficiaire ?", "add_beneficiary"],
    ["How do I add a beneficiary?", "add_beneficiary"],
    ["Ahoana no hanampiana mpahazo tombontsoa vaovao?", "add_beneficiary"],
    ["Comment changer la langue ?", "language"],
    ["How do I change the language?", "language"],
    ["Ahoana no anovana ny fiteny?", "language"],
    ["Comment produire un rapport PDF ?", "report"],
    ["Ahoana no mamoaka tatitra PDF?", "report"],
    ["Comment exporter en Excel ?", "export"],
    ["Pourquoi mes données sont masquées (•••) ?", "protection"],
    ["Nahoana no misy angona saronana?", "protection"],
    ["Comment est calculé le risque d'abandon ?", "dropout_risk"],
    ["Ahoana no kajiana ny loza hijanonana?", "dropout_risk"],
    ["Comment affecter un coordinateur à un projet ?", "assign"],
    ["Que faire en cas d'erreur accès refusé 403 ?", "troubleshooting"],
    ["What can you do?", "help"],
    ["Inona no azonao atao?", "help"],
  ];
  for (const [q, id] of cases) assert.equal(matchKnowledge(q)?.entry.id, id, q);
  assert.equal(matchKnowledge("blablabla xyz"), null);
});

test("suggestions : questions complètes dans la langue demandée", () => {
  assert.equal(knowledgeSuggestions(null, "mg").length, 4);
  const s = knowledgeSuggestions(KNOWLEDGE.find((e) => e.id === "login")!, "en");
  assert.ok(s.every((x) => /\?$/.test(x)));
});

test("demande de traduction : FR / EN / MG", () => {
  assert.deepEqual(parseTranslateRequest("Traduis « Mot de passe oublié » en malgache"), { phrase: "Mot de passe oublié", target: "mg" });
  assert.deepEqual(parseTranslateRequest("comment dit-on bénéficiaire en anglais ?"), { phrase: "bénéficiaire", target: "en" });
  assert.deepEqual(parseTranslateRequest("Translate 'Save' into Malagasy"), { phrase: "Save", target: "mg" });
  assert.deepEqual(parseTranslateRequest("translate to French: Tetikasa mavitrika"), { phrase: "Tetikasa mavitrika", target: "fr" });
  assert.deepEqual(parseTranslateRequest("Adikao amin'ny frantsay: Tetikasa"), { phrase: "Tetikasa", target: "fr" });
  assert.deepEqual(parseTranslateRequest("Inona ny dikan'ny fanombanana amin'ny teny anglisy?"), { phrase: "fanombanana", target: "en" });
  assert.equal(parseTranslateRequest("Combien de projets sont actifs ?"), null);
  assert.equal(parseTranslateRequest("Quel est le total en retard ?"), null);
});

const LEX = buildLexicon([
  { fr: "Enregistrer", en: "Save", mg: "Tahirizina" },
  { fr: "Mot de passe oublié ?", en: "Forgot password?", mg: "Adino ny teny miafina?" },
  { fr: "Activités récentes", en: "Recent activities", mg: "Hetsika vao haingana" },
]);

test("traduction contrôlée : exacte dans les deux sens, sans accents ni casse", () => {
  const a = translateWithLexicon("mot de passe oublie", "mg", LEX);
  assert.ok(a.kind === "exact" && a.text === "Adino ny teny miafina?" && a.from === "Mot de passe oublié ?" && a.entry.en === "Forgot password?");
  const b = translateWithLexicon("Tahirizina", "fr", LEX);
  assert.ok(b.kind === "exact" && b.source === "mg" && b.text === "Enregistrer");
  const en = translateWithLexicon("Save", "mg", LEX);
  assert.equal(en.kind === "exact" && en.text, "Tahirizina");
  assert.equal(translateWithLexicon("Enregistrer", "fr", LEX).kind, "same");
});

test("traduction : le glossaire métier est ajouté au lexique", () => {
  const r = translateWithLexicon("bénéficiaire", "mg", LEX);
  assert.equal(r.kind === "exact" && r.text, "mpahazo tombontsoa");
});

test("traduction : phrase inconnue → propositions proches, jamais de traduction inventée", () => {
  const r = translateWithLexicon("Voir les activités récentes du projet", "mg", LEX);
  assert.equal(r.kind, "unknown");
  if (r.kind === "unknown") {
    assert.ok(r.similar.some((s) => s.to === "Hetsika vao haingana"));
    assert.ok(r.terms.some((t) => t.to === "tetikasa"));
  }
});

import { LEXICON_BASE } from "../src/data/lexicon";
const REAL = buildLexicon(LEXICON_BASE);

test("lexique réel (généré depuis l'interface) : FR ↔ MG ↔ EN cohérents avec les écrans", () => {
  assert.ok(LEXICON_BASE.length > 1000);
  const a = translateWithLexicon("Mot de passe oublié ?", "mg", REAL);
  assert.ok(a.kind === "exact" && /teny miafina/.test(a.text));
  const b = translateWithLexicon("Tetikasa", "fr", REAL);
  assert.ok(b.kind === "exact" && /^projets?$/i.test(b.text));
  const c = translateWithLexicon("Beneficiaries", "mg", REAL);
  assert.ok(c.kind === "exact" && c.text === "Mpahazo tombontsoa");
  const d = translateWithLexicon("Enregistrer", "en", REAL);
  assert.ok(d.kind === "exact" && d.text === "Save");
  // pivot français : MG -> EN
  const e = translateWithLexicon("Tahirizina", "en", REAL);
  assert.ok(e.kind === "exact" && e.text === "Save");
});

test("lexique : aucune entrée vide, termes du glossaire alignés sur l'interface", () => {
  for (const e of LEXICON_BASE) {
    assert.ok(e.fr.trim().length > 0);
    assert.ok(e.mg || e.en, e.fr);
  }
  assert.equal(term("report", "mg"), "tatitra");
  const r = translateWithLexicon("Rapports", "mg", REAL);
  assert.ok(r.kind === "exact" && r.text === "Tatitra");
});
