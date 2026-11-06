import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessProject, decideScope, dropoutRate, filterByProject, normalizeJourney,
} from "../src/utils/projectScopeRules";

test("seul le rôle COORDINATOR est filtré", () => {
  assert.equal(decideScope("ADMIN", [1], true).scoped, false);
  assert.equal(decideScope("coordinator", [1], false).scoped, true);
});

test("transition : coordinateur sans affectation garde l'accès, sauf mode strict", () => {
  assert.equal(decideScope("COORDINATOR", [], false).scoped, false);
  const strict = decideScope("COORDINATOR", [], true);
  assert.equal(strict.scoped, true);
  assert.equal(canAccessProject(strict, 5), false);
});

test("accès limité aux projets affectés", () => {
  const d = decideScope("COORDINATOR", [2, 2, 3], false);
  assert.deepEqual(d.allowed, [2, 3]);
  assert.equal(canAccessProject(d, 2), true);
  assert.equal(canAccessProject(d, 9), false);
  assert.equal(canAccessProject(d, null), false);
});

test("filterByProject ne garde que les lignes autorisées", () => {
  const d = decideScope("COORDINATOR", [1], false);
  const rows = [{ p: 1 }, { p: 2 }, { p: undefined }];
  assert.deepEqual(filterByProject(d, rows, (r) => r.p), [{ p: 1 }]);
  assert.equal(filterByProject({ scoped: false, allowed: [] }, rows, (r) => r.p).length, 3);
});

test("normalizeJourney : date et motif selon le statut", () => {
  const now = new Date("2026-11-05T00:00:00Z");
  assert.deepEqual(normalizeJourney({ status: "ACTIVE", dropoutReason: "x" }, now), { status: "ACTIVE", statusDate: null, dropoutReason: null });
  assert.equal(normalizeJourney({ status: "DROPPED_OUT", dropoutReason: "  déménagement " }, now).dropoutReason, "déménagement");
  assert.equal(normalizeJourney({ status: "COMPLETED", dropoutReason: "x" }, now).dropoutReason, null);
  assert.equal(normalizeJourney({ status: "DROPPED_OUT" }, now).statusDate, now);
});

test("dropoutRate exclut les parcours actifs et gère zéro", () => {
  assert.equal(dropoutRate({ COMPLETED: 0, DROPPED_OUT: 0, ACTIVE: 4 }).rate, null);
  assert.equal(dropoutRate({ COMPLETED: 6, DROPPED_OUT: 2, ACTIVE: 4 }).rate, 0.25);
});
