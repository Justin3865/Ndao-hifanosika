import test from "node:test";
import assert from "node:assert/strict";
import {
  canCreate, canTransition, cleanScores, computeTotal, crossGap, hasLargeGap, missingCriteria, overdueCount, periodLabel,
  planSlots, progressSeries, slotKey, toPerformanceInput,
} from "../src/utils/personEvaluationRules";

const grid = { maxScore: 20, criteria: [{ label: "Ponctualité", weight: 2 }, { label: "Communication", weight: 1 }] };

test("note globale = moyenne pondérée sur 100", () => {
  // (20/20 × 2 + 10/20 × 1) / 3 = 0.8333 → 83.3
  assert.equal(computeTotal([{ score: 20, maxScore: 20, weight: 2 }, { score: 10, maxScore: 20, weight: 1 }]), 83.3);
  assert.equal(computeTotal([]), null);
  assert.equal(computeTotal([{ score: 5, maxScore: 10, weight: 0 }]), null);
  assert.equal(computeTotal([{ score: 30, maxScore: 20, weight: 1 }]), 100); // plafonné
});

test("saisie des notes : bornes, doublons, critère hors grille, poids repris de la grille", () => {
  const ok = cleanScores([{ criterion: "Ponctualité", score: 15 }, { criterion: "communication", score: 8 }], grid);
  assert.ok("scores" in ok);
  if ("scores" in ok) assert.deepEqual(ok.scores.map((s) => [s.criterion, s.maxScore, s.weight]), [["Ponctualité", 20, 2], ["communication", 20, 1]]);
  assert.ok("error" in cleanScores([{ criterion: "Ponctualité", score: 21 }], grid));
  assert.ok("error" in cleanScores([{ criterion: "Ponctualité", score: -1 }], grid));
  assert.ok("error" in cleanScores([{ criterion: "A", score: 1 }, { criterion: "a", score: 2 }]));
  assert.ok("error" in cleanScores([{ criterion: "Inconnu", score: 1 }], grid));
  assert.ok("error" in cleanScores([], grid));
  assert.ok("error" in cleanScores([{ criterion: "X", score: "abc" as unknown as number }]));
  assert.ok("scores" in cleanScores([{ criterion: "Libre", score: 7, maxScore: 10 }])); // sans grille : critère libre
});

test("soumission : tous les critères de la grille doivent être notés", () => {
  assert.deepEqual(missingCriteria(grid, [{ criterion: "ponctualité" }]), ["Communication"]);
  assert.deepEqual(missingCriteria(grid, [{ criterion: "Ponctualité" }, { criterion: "Communication" }]), []);
  assert.deepEqual(missingCriteria(null, []), ["(aucune note)"]);
});

test("machine à états : brouillon → soumis → validé, validé figé", () => {
  assert.equal(canTransition("DRAFT", "edit"), true);
  assert.equal(canTransition("SUBMITTED", "edit"), false);
  assert.equal(canTransition("DRAFT", "validate"), false);
  assert.equal(canTransition("SUBMITTED", "validate"), true);
  assert.equal(canTransition("VALIDATED", "submit"), false);
  assert.equal(canTransition("VALIDATED", "edit"), false);
});

test("droits de création", () => {
  assert.equal(canCreate({ id: 5, role: "STAGIAIRE_M2" }, "STAGIAIRE", 5, "SELF").ok, true);
  assert.equal(canCreate({ id: 6, role: "STAGIAIRE_M2" }, "STAGIAIRE", 5, "SELF").ok, false);          // pas pour autrui
  assert.equal(canCreate({ id: 5, role: "ADMIN" }, "BENEFICIARY", 5, "SELF").ok, false);               // pas d'auto-éval bénéficiaire
  assert.equal(canCreate({ id: 1, role: "RH" }, "MEMBER", 9, "SUPERVISOR").ok, true);
  assert.equal(canCreate({ id: 1, role: "STAGIAIRE_L3" }, "MEMBER", 9, "SUPERVISOR").ok, false);       // un stagiaire n'évalue pas
  assert.equal(canCreate({ id: 1, role: "COMMUNICATION" }, "MEMBER", 9, "SUPERVISOR").ok, false);
  assert.equal(canCreate({ id: 1, role: "TUTEUR_M2" }, "STAGIAIRE", 9, "TUTOR_ACADEMIC").ok, true);
  assert.equal(canCreate({ id: 1, role: "TUTEUR_M2" }, "MEMBER", 9, "TUTOR_ACADEMIC").ok, false);      // tuteur : stagiaires seulement
  assert.equal(canCreate({ id: 1, role: "COORDINATOR" }, "BENEFICIARY", 9, "SUPERVISOR").ok, true);
  assert.equal(canCreate({ id: 1, role: "COORDINATOR" }, "MEMBER", 9, "HR").ok, false);
});

test("lancement de campagne : créneaux attendus et aucun doublon au relancement", () => {
  const targets = [
    { targetType: "MEMBER" as const, targetId: 1 },
    { targetType: "STAGIAIRE" as const, targetId: 2, tutorEnterpriseId: 8, hasAcademicTutor: true },
    { targetType: "BENEFICIARY" as const, targetId: 3 },
  ];
  const first = planSlots(targets, []);
  assert.deepEqual(first.map((s) => `${s.targetType}:${s.targetId}:${s.evaluatorRole}`), [
    "MEMBER:1:SELF", "MEMBER:1:SUPERVISOR",
    "STAGIAIRE:2:SELF", "STAGIAIRE:2:SUPERVISOR", "STAGIAIRE:2:TUTOR_ENTERPRISE", "STAGIAIRE:2:TUTOR_ACADEMIC",
    "BENEFICIARY:3:SUPERVISOR",
  ]);
  assert.equal(planSlots(targets, first.map(slotKey)).length, 0);
  const partial = planSlots(targets, [slotKey(first[0]!)]);
  assert.equal(partial.length, first.length - 1);
});

test("périodes", () => {
  const d = new Date("2026-11-08T00:00:00Z");
  assert.equal(periodLabel("MONTHLY", d), "2026-11");
  assert.equal(periodLabel("QUARTERLY", d), "2026-T4");
  assert.equal(periodLabel("END_OF_MISSION", d), "FIN_MISSION");
  assert.equal(periodLabel(null, d), null);
});

test("évaluation croisée : écart et alerte", () => {
  assert.equal(crossGap(90, 60), 30);
  assert.equal(crossGap(50, 70), -20);
  assert.equal(crossGap(null, 70), null);
  assert.equal(hasLargeGap(30), true);
  assert.equal(hasLargeGap(-14.9), false);
  assert.equal(hasLargeGap(null), false);
});

test("progression : seules les évaluations soumises/validées hors auto-évaluation, triées par date", () => {
  const items = [
    { id: 1, evaluatorRole: "SUPERVISOR", status: "VALIDATED", totalScore: 80, createdAt: "2026-03-01", submittedAt: "2026-03-05", scores: [{ criterion: "A", score: 16, maxScore: 20 }] },
    { id: 2, evaluatorRole: "SELF", status: "SUBMITTED", totalScore: 95, createdAt: "2026-02-01" },
    { id: 3, evaluatorRole: "SUPERVISOR", status: "DRAFT", totalScore: 40, createdAt: "2026-04-01" },
    { id: 4, evaluatorRole: "TUTOR_ACADEMIC", status: "SUBMITTED", totalScore: 70, createdAt: "2026-01-10", submittedAt: "2026-01-12" },
  ];
  assert.deepEqual(progressSeries(items).map((p) => p.id), [4, 1]);
  const ai = toPerformanceInput(items);
  assert.equal(ai.length, 2);
  assert.deepEqual(ai[1], { score: 80, maxScore: 100, evaluatedAt: new Date("2026-03-05").toISOString(), criteria: [{ name: "A", score: 16, maxScore: 20 }] });
});

test("évaluations en retard", () => {
  const now = new Date("2026-11-08");
  assert.equal(overdueCount({ status: "ACTIVE", endDate: "2026-10-31" }, 4, now), 4);
  assert.equal(overdueCount({ status: "ACTIVE", endDate: "2026-12-31" }, 4, now), 0);
  assert.equal(overdueCount({ status: "CLOSED", endDate: "2026-10-31" }, 4, now), 0);
  assert.equal(overdueCount({ status: "ACTIVE", endDate: null }, 4, now), 0);
});
