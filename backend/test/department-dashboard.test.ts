import test from "node:test";
import assert from "node:assert/strict";
import { budgetSummary, isCampaignLate, isInserted, mean, pct, sectionsForRole, tally } from "../src/utils/departmentDashboardRules";

test("sections par rôle (cahier §4 / §5.5)", () => {
  assert.deepEqual(sectionsForRole("RH"), ["RH"]);
  assert.deepEqual(sectionsForRole("daf"), ["DAF"]);
  assert.deepEqual(sectionsForRole("COMMUNICATION"), ["IMPACT"]);
  assert.deepEqual(sectionsForRole("COORDINATOR"), ["IMPACT"]);
  assert.deepEqual(sectionsForRole("DIRECTION"), ["RH", "DAF", "IMPACT"]);
  assert.deepEqual(sectionsForRole("ADMIN"), ["RH", "DAF", "IMPACT"]);
  assert.deepEqual(sectionsForRole("STAGIAIRE_L3"), []);
  assert.deepEqual(sectionsForRole(""), []);
});

test("pourcentage et moyenne tolèrent les valeurs absentes", () => {
  assert.equal(pct(1, 4), 25);
  assert.equal(pct(5, 0), null);
  assert.equal(mean([4, 5, null, undefined]), 4.5);
  assert.equal(mean([]), null);
});

test("budget : totaux, taux, dépassement, projets sans budget", () => {
  const s = budgetSummary([
    { id: 1, name: "A", budget: "1000", budgetSpent: "500" },
    { id: 2, name: "B", budget: 200, budgetSpent: 250 },
    { id: 3, name: "C", budget: null, budgetSpent: null },
  ]);
  assert.equal(s.totalBudget, 1200);
  assert.equal(s.totalSpent, 750);
  assert.equal(s.rate, 63);
  assert.equal(s.overBudget, 1);
  assert.equal(s.withoutBudget, 1);
  assert.equal(s.projects[0].name, "B"); // le plus consommé d'abord
  assert.equal(s.projects.find((p) => p.id === 3)?.rate, null);
});

test("tally compte les clés connues et ignore les autres", () => {
  assert.deepEqual(tally(["A", "B", "A", "X", null], ["A", "B", "C"] as const), { A: 2, B: 1, C: 0 });
});

test("insertion : emploi, auto-emploi ou activité créée", () => {
  assert.equal(isInserted({ occupation: "EMPLOYED" }), true);
  assert.equal(isInserted({ occupation: "SEEKING", activityCreated: true }), true);
  assert.equal(isInserted({ occupation: "SEEKING", activityCreated: false }), false);
  assert.equal(isInserted({}), false);
});

test("campagne en retard : fin dépassée et ni brouillon ni clôturée", () => {
  const now = new Date("2026-11-08T00:00:00Z");
  assert.equal(isCampaignLate({ status: "ACTIVE", endDate: "2026-10-01" }, now), true);
  assert.equal(isCampaignLate({ status: "ACTIVE", endDate: "2026-12-01" }, now), false);
  assert.equal(isCampaignLate({ status: "CLOSED", endDate: "2026-10-01" }, now), false);
  assert.equal(isCampaignLate({ status: "DRAFT", endDate: "2026-10-01" }, now), false);
  assert.equal(isCampaignLate({ status: "ACTIVE", endDate: null }, now), false);
});
