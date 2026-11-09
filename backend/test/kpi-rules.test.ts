import test from "node:test";
import assert from "node:assert/strict";
import { alertUsage, isAdopted, makeKpi, pct } from "../src/utils/kpiRules";

const now = new Date("2026-11-09T00:00:00Z");

test("pct : dénominateur nul => null, sinon 1 décimale", () => {
  assert.equal(pct(1, 0), null);
  assert.equal(pct(1, 3), 33.3);
});
test("isAdopted : fenêtre de 90 jours, null et futur refusés", () => {
  assert.equal(isAdopted(new Date("2026-10-01T00:00:00Z"), now), true);
  assert.equal(isAdopted(new Date("2026-06-01T00:00:00Z"), now), false);
  assert.equal(isAdopted(null, now), false);
  assert.equal(isAdopted(new Date("2027-01-01T00:00:00Z"), now), false);
});
test("alertUsage compte décisions et prises en charge", () => {
  assert.deepEqual(alertUsage(["RESOLVED", "IGNORED", "IN_PROGRESS", "X"]), { total: 4, handled: 2, taken: 1, touched: 3 });
});
test("makeKpi : met reste null sans cible, calculé avec cible", () => {
  assert.equal(makeKpi("a", "A", 1, 2).met, null);
  assert.equal(makeKpi("a", "A", 1, 2, 50).met, true);
  assert.equal(makeKpi("a", "A", 1, 2, 80).met, false);
  assert.equal(makeKpi("a", "A", 0, 0, 80).met, null);
});
