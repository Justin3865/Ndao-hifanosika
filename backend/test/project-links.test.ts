import test from "node:test";
import assert from "node:assert/strict";
import { decideScope } from "../src/utils/projectScopeRules";
import {
  canReachBeneficiary, canUnlink, isEngagedAt, isLinkStatus, normalizeLinkStatus, parseMemberProfile, visibleLinks, withPrimary,
} from "../src/utils/projectLinkRules";

test("un bénéficiaire A+B : le coordinateur de A ne voit pas le rattachement B", () => {
  const links = withPrimary(1, [
    { projectId: 1, status: "ACTIVE", joinedAt: null },
    { projectId: 2, status: "ACTIVE", joinedAt: null },
  ]);
  const coordA = decideScope("COORDINATOR", [1], true);
  assert.deepEqual(visibleLinks(coordA, links).map((l) => l.projectId), [1]);
  assert.equal(canReachBeneficiary(coordA, [1, 2]), true);
  assert.equal(canReachBeneficiary(decideScope("COORDINATOR", [3], true), [1, 2]), false);
  assert.equal(visibleLinks(decideScope("ADMIN", [], true), links).length, 2);
});

test("le projet principal est ajouté s'il manque dans la table et reste en tête", () => {
  const r = withPrimary(5, [{ projectId: 2, status: "COMPLETED", joinedAt: null }], "2026-01-01");
  assert.deepEqual(r.map((l) => [l.projectId, l.isPrimary]), [[5, true], [2, false]]);
});

test("détachement : jamais du projet principal", () => {
  assert.equal(canUnlink(1, 1), false);
  assert.equal(canUnlink(1, 2), true);
});

test("statut par projet : ACTIVE sans date de sortie, les autres avec", () => {
  const now = new Date("2026-11-08T10:00:00Z");
  assert.equal(normalizeLinkStatus("ACTIVE", now, now).exitedAt, null);
  assert.equal(normalizeLinkStatus("DROPPED_OUT", now).exitedAt?.getTime(), now.getTime());
  assert.equal(isLinkStatus("COMPLETED"), true);
  assert.equal(isLinkStatus("FINI"), false);
});

test("fiche membre : validation", () => {
  assert.deepEqual(parseMemberProfile({ jobTitle: "  Chargée S&E ", engagementType: "salarie" }), { data: { jobTitle: "Chargée S&E", engagementType: "SALARIE" } });
  assert.ok("error" in parseMemberProfile({ engagementType: "CDI" }));
  assert.ok("error" in parseMemberProfile({ engagementStart: "2026-05-01", engagementEnd: "2026-01-01" }));
  assert.ok("error" in parseMemberProfile({ engagementStart: "pas une date" }));
  assert.ok("error" in parseMemberProfile({ jobTitle: "x".repeat(121) }));
  assert.deepEqual(parseMemberProfile({ jobTitle: null }), { data: { jobTitle: null } });
});

test("période d'engagement", () => {
  const p = { engagementStart: new Date("2026-01-01"), engagementEnd: new Date("2026-06-30") };
  assert.equal(isEngagedAt(p, new Date("2026-03-01")), true);
  assert.equal(isEngagedAt(p, new Date("2026-07-01")), false);
  assert.equal(isEngagedAt({}, new Date()), true);
});
