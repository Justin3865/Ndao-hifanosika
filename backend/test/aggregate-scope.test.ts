import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedBy, classifyAggregate, filterRows, projectIdOf, recomputeBeneficiaryReport, recomputeEvaluationReport,
  recomputeInBody, recomputeMonitoringOverview, zoneScore,
} from "../src/utils/aggregateScopeRules";
import { decideScope } from "../src/utils/projectScopeRules";

const scope = decideScope("COORDINATOR", [1, 2], false);

test("classification des routes agrégées", () => {
  assert.deepEqual(classifyAggregate("GET", "/api/vulnerability/zones"), { kind: "recompute", what: "zones" });
  assert.deepEqual(classifyAggregate("GET", "/api/reports/dashboard?x=1"), { kind: "recompute", what: "dashboard" });
  assert.deepEqual(classifyAggregate("GET", "/api/reports/projects/7"), { kind: "guard", projectId: 7 });
  assert.deepEqual(classifyAggregate("POST", "/api/monitoring/projects/3/objectives"), { kind: "guard", projectId: 3 });
  assert.deepEqual(classifyAggregate("GET", "/api/ai/performance"), { kind: "filter", by: "projectId" });
  assert.deepEqual(classifyAggregate("GET", "/api/ai/dropout-risk"), { kind: "filter", by: "beneficiaryId" });
  assert.equal(classifyAggregate("GET", "/api/ai/summary").kind, "deny");
  assert.equal(classifyAggregate("POST", "/api/ai/chat").kind, "deny");
  assert.equal(classifyAggregate("GET", "/api/ai/datasets/households/export.csv").kind, "deny");
  assert.equal(classifyAggregate("GET", "/api/ai/anomalies/alerts").kind, "deny");
  assert.equal(classifyAggregate("GET", "/api/ai/anomalies/catalog").kind, "allow");
  assert.equal(classifyAggregate("GET", "/api/ai/health").kind, "allow");
  assert.equal(classifyAggregate("POST", "/api/ai/score/dropout-risk").kind, "allow");
  assert.equal(classifyAggregate("GET", "/api/beneficiaries").kind, "allow");
  assert.equal(classifyAggregate("GET", "/api/AI/Summary/").kind, "deny");
});

test("filterRows : data tableau, tableau sous data, ligne sans clé retirée", () => {
  const ok = allowedBy(scope);
  const a = filterRows({ success: true, data: [{ projectId: 1 }, { projectId: 9 }, {}] }, projectIdOf, ok) as any;
  assert.deepEqual(a.data, [{ projectId: 1 }]);
  const b = filterRows({ data: { projects: [{ projectId: 2 }, { projectId: 3 }], count: 2 } }, projectIdOf, ok) as any;
  assert.deepEqual(b.data.projects, [{ projectId: 2 }]);
  const c = filterRows({ data: [{ project: { id: 2 } }, { project: { id: 5 } }] }, projectIdOf, ok) as any;
  assert.equal(c.data.length, 1);
});

test("rapport bénéficiaires : totaux recalculés après filtrage", () => {
  const body = { success: true, data: { total: 3, vulnerable: 3, byGender: { male: 3, female: 0, other: 0 }, beneficiaries: [
    { projectId: 1, gender: "FEMALE", vulnerable: true }, { projectId: 1, gender: "MALE", vulnerable: false }, { projectId: 8, gender: "MALE", vulnerable: true },
  ] } };
  const filtered = filterRows(body, projectIdOf, allowedBy(scope));
  const out = recomputeInBody(filtered, "beneficiaries-report") as any;
  assert.equal(out.data.total, 2);
  assert.equal(out.data.vulnerable, 1);
  assert.deepEqual(out.data.byGender, { male: 1, female: 1, other: 0 });
  assert.equal(recomputeBeneficiaryReport({ beneficiaries: [] }).total, 0);
});

test("rapport évaluations : moyenne et statuts recalculés", () => {
  const r = recomputeEvaluationReport({ evaluations: [{ score: 80, status: "VALIDATED" }, { score: 60, status: "DRAFT" }, { score: null, status: "SUBMITTED" }] }) as any;
  assert.equal(r.total, 3);
  assert.equal(r.averageScore, 70);
  assert.deepEqual(r.byStatus, { draft: 1, submitted: 1, validated: 1 });
  assert.equal((recomputeEvaluationReport({ evaluations: [] }) as any).averageScore, null);
});

test("suivi & évaluation : résumé recalculé sur les projets conservés", () => {
  const r = recomputeMonitoringOverview({ projects: [{ status: "ACTIVE", trend: "LATE", alerts: [1, 2] }, { status: "ACTIVE", trend: "OK", alerts: [] }] }) as any;
  assert.equal(r.count, 2);
  assert.deepEqual(r.summary, { active: 2, late: 1, alerts: 2 });
});

test("zoneScore : même formule que computeZoneStats", () => {
  assert.equal(zoneScore(0.5, 1000, 250), Math.round((0.5 * 0.65 + 0.5 * 0.2 + 0.5 * 0.15) * 100));
  assert.equal(zoneScore(0, null, null), 0);
  assert.equal(zoneScore(1, 5000, 9999), 100);
});
