import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRoute, percentile, recordSample, resetPerfStats, snapshot } from "../src/utils/perfStats";

test("normalizeRoute remplace les identifiants", () => {
  assert.equal(normalizeRoute("get", "/api/users/12/edit?x=1"), "GET /api/users/:id/edit");
  assert.equal(normalizeRoute("GET", "/api/projects"), "GET /api/projects");
});

test("percentile (méthode du rang le plus proche)", () => {
  const xs = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.equal(percentile(xs, 50), 50);
  assert.equal(percentile(xs, 95), 95);
  assert.equal(percentile([], 95), 0);
});

test("snapshot : p95, lenteurs et erreurs", () => {
  resetPerfStats();
  for (let i = 1; i <= 100; i++) recordSample("GET /api/a", i * 10, i === 100 ? 500 : 200, 500);
  recordSample("GET /api/b", 20, 200, 500);
  const [a, b] = snapshot();
  assert.equal(a.route, "GET /api/a");          // trié par p95 décroissant
  assert.equal(a.p95, 950);
  assert.equal(a.slow, 50);                     // 510..1000 ms
  assert.equal(a.errors, 1);
  assert.equal(b.p95, 20);
});
