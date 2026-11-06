import test from "node:test";
import assert from "node:assert/strict";
import { exportableDatasets, fmtSize, toDateInput } from "../gaps";

test("exportableDatasets : miroir de canExport côté API", () => {
  assert.deepEqual(exportableDatasets("ADMIN"), ["projects", "beneficiaries", "activities", "evaluations", "internships"]);
  assert.deepEqual(exportableDatasets("DAF"), ["projects", "activities"]);
  assert.deepEqual(exportableDatasets("COMMUNICATION"), ["projects", "beneficiaries"]);
  assert.deepEqual(exportableDatasets("RH"), ["evaluations", "internships"]);
  assert.ok(!exportableDatasets("COORDINATOR").includes("internships"));
  assert.deepEqual(exportableDatasets("STAGIAIRE_L3"), []);
  assert.deepEqual(exportableDatasets("admin"), exportableDatasets("ADMIN"));
});

test("fmtSize et toDateInput", () => {
  assert.equal(fmtSize(512), "512 o");
  assert.equal(fmtSize(2048), "2 Ko");
  assert.equal(fmtSize(3 * 1024 * 1024), "3.0 Mo");
  assert.equal(toDateInput("2026-11-06T10:00:00.000Z"), "2026-11-06");
  assert.equal(toDateInput(null), "");
});
