import test from "node:test";
import assert from "node:assert/strict";
import { detectDrop, dropOptionsFromEnv } from "../src/utils/performanceDropRules";

const pts = (...s: number[]) => s.map((score, i) => ({ at: new Date(2026, 0, 1 + i), score }));

test("pas assez d'historique => pas d'alerte", () => {
  assert.equal(detectDrop(pts(15, 8)).dropped, false);
});
test("baisse de plus de 20 % => alerte avec chiffres", () => {
  const r = detectDrop(pts(16, 15, 17, 10));
  assert.equal(r.dropped, true);
  assert.equal(r.last, 10);
  assert.equal(r.baseline, 16);
  assert.equal(r.dropPercent, 37.5);
});
test("baisse faible ou hausse => pas d'alerte", () => {
  assert.equal(detectDrop(pts(15, 15, 14)).dropped, false);
  assert.equal(detectDrop(pts(10, 12, 18)).dropped, false);
});
test("l'ordre d'entrée n'a pas d'importance (tri par date)", () => {
  const shuffled = [pts(16, 15, 17, 10)[3], ...pts(16, 15, 17, 10).slice(0, 3)];
  assert.equal(detectDrop(shuffled).dropped, true);
});
test("indépendant du barème et base nulle ignorée", () => {
  assert.equal(detectDrop(pts(80, 82, 55)).dropped, true);
  assert.equal(detectDrop(pts(0, 0, 0)).dropped, false);
});
test("seuils par défaut et surcharge env", () => {
  assert.equal(dropOptionsFromEnv({}).dropRatio, 0.2);
  assert.equal(dropOptionsFromEnv({ PERF_DROP_RATIO: "0.3" }).dropRatio, 0.3);
  assert.equal(dropOptionsFromEnv({ PERF_DROP_RATIO: "9" }).dropRatio, 0.2);
});
