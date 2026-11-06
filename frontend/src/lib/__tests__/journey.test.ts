import test from "node:test";
import assert from "node:assert/strict";
import {
  buildJourneyPayload,
  labelReadiness,
  parseUserLabel,
  pctRate,
  toDateInput,
  unassignedCoordinators,
} from "../journey";

const labels = (completed: number, dropped: number) => [
  ...Array.from({ length: completed }, () => ({ dropout: 0 })),
  ...Array.from({ length: dropped }, () => ({ dropout: 1 })),
];

test("labelReadiness : seuils 30 clos / 5 par classe / 100 confortable", () => {
  assert.equal(labelReadiness([]).level, "insufficient");
  assert.equal(labelReadiness(labels(40, 2)).level, "insufficient"); // moins de 5 abandons
  assert.deepEqual(labelReadiness(labels(40, 2)).missingPerClass, { completed: 0, dropped: 3 });
  assert.equal(labelReadiness(labels(20, 5)).level, "insufficient"); // 25 < 30
  assert.equal(labelReadiness(labels(20, 5)).missingClosed, 5);
  assert.equal(labelReadiness(labels(25, 5)).level, "indicative");
  assert.equal(labelReadiness(labels(80, 20)).level, "reliable");
});

test("buildJourneyPayload : miroir de normalizeJourney côté API", () => {
  assert.deepEqual(buildJourneyPayload({ status: "ACTIVE", date: "2026-01-01", reason: "x" }), { status: "ACTIVE" });
  const done = buildJourneyPayload({ status: "COMPLETED", date: "2026-03-05", reason: "ignoré" });
  assert.equal(done.status, "COMPLETED");
  assert.equal(done.statusDate, "2026-03-05T12:00:00.000Z");
  assert.equal("dropoutReason" in done, false);
  const drop = buildJourneyPayload({ status: "DROPPED_OUT", date: "", reason: "  déménagement  " });
  assert.equal(drop.dropoutReason, "déménagement");
  assert.equal("statusDate" in drop, false);
});

test("toDateInput / pctRate", () => {
  assert.equal(toDateInput("2026-03-05T12:00:00.000Z"), "2026-03-05");
  assert.equal(toDateInput(null), "");
  assert.equal(toDateInput("pas une date"), "");
  assert.equal(pctRate(null), "—");
  assert.equal(pctRate(0.25), "25 %");
  assert.equal(pctRate(0.1234), "12.3 %");
});

test("parseUserLabel / unassignedCoordinators", () => {
  assert.deepEqual(parseUserLabel("Rado Rakoto (COORDINATOR)"), { name: "Rado Rakoto", role: "COORDINATOR" });
  assert.deepEqual(parseUserLabel("Sans rôle"), { name: "Sans rôle", role: "" });
  const assignments = [{ id: 1, projectId: 10, userId: 5 }];
  assert.deepEqual(unassignedCoordinators([5, 6, 7], assignments), [6, 7]);
  assert.deepEqual(unassignedCoordinators([], assignments), []);
});
