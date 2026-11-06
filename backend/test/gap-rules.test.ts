import test from "node:test";
import assert from "node:assert/strict";
import {
  anonymizeRow, attendanceLevel, attendanceRate, canExport, canReadDocs, canUploadDoc, cleanBase64,
  consentState, isMinor, isObjectiveOverdue, nextObjectiveStatus, objectiveProgress, retentionCutoffs,
  retentionPolicy, safeFileName,
} from "../src/utils/gapRules";

test("taux de présence et niveau", () => {
  const r = attendanceRate([{ present: true }, { present: true }, { present: false }, { present: true }]);
  assert.deepEqual(r, { total: 4, present: 3, absent: 1, rate: 75 });
  assert.equal(attendanceRate([]).rate, null);
  assert.equal(attendanceLevel(75, 4), "GOOD");
  assert.equal(attendanceLevel(60, 4), "MEDIUM");
  assert.equal(attendanceLevel(40, 4), "LOW");
  assert.equal(attendanceLevel(100, 2), "UNKNOWN"); // trop peu de séances pour conclure
  assert.equal(attendanceLevel(null, 10), "UNKNOWN");
});

test("objectifs : progression, retard, statut", () => {
  assert.equal(objectiveProgress(5, 10), 50);
  assert.equal(objectiveProgress(15, 10), 100);
  assert.equal(objectiveProgress(undefined, 10), 0);
  assert.equal(objectiveProgress(3, 0), null);
  const now = new Date("2026-11-06T00:00:00Z");
  assert.equal(isObjectiveOverdue({ dueDate: "2026-11-01", status: "IN_PROGRESS" }, now), true);
  assert.equal(isObjectiveOverdue({ dueDate: "2026-11-01", status: "ACHIEVED" }, now), false);
  assert.equal(isObjectiveOverdue({ dueDate: "2026-12-01", status: "PLANNED" }, now), false);
  assert.equal(isObjectiveOverdue({ status: "PLANNED" }, now), false);
  assert.equal(nextObjectiveStatus("PLANNED", 10, 10), "ACHIEVED");
  assert.equal(nextObjectiveStatus("PLANNED", 2, 10), "IN_PROGRESS");
  assert.equal(nextObjectiveStatus("PLANNED", 0, 10), "PLANNED");
  assert.equal(nextObjectiveStatus("CANCELLED", 10, 10), "CANCELLED");
});

test("documents de stage : droits et nettoyage", () => {
  const i = { studentId: 5, supervisorId: 9 };
  assert.equal(canUploadDoc("STAGIAIRE_M2", 5, i, "MEMOIRE"), true);
  assert.equal(canUploadDoc("STAGIAIRE_M2", 6, i, "MEMOIRE"), false);
  assert.equal(canUploadDoc("RH", 1, i, "CONVENTION"), true);
  assert.equal(canUploadDoc("TUTEUR_M2", 9, i, "CONVENTION"), false);
  assert.equal(canReadDocs("TUTEUR_M2", 9, i), true);
  assert.equal(canReadDocs("TUTEUR_M2", 10, i), false);
  assert.equal(canReadDocs("DIRECTION", 1, i), true);
  assert.equal(cleanBase64("data:application/pdf;base64,QUJD\nREVG"), "QUJDREVG");
  assert.equal(safeFileName("../../etc/passwd"), "passwd");
  assert.equal(safeFileName("Mémoire final (v2).pdf"), "Mémoire final _v2_.pdf");
  assert.equal(safeFileName(""), "document");
});

test("mineur et consentement", () => {
  const now = new Date("2026-11-06T00:00:00Z");
  assert.equal(isMinor({ age: 12 }, now), true);
  assert.equal(isMinor({ age: 30 }, now), false);
  assert.equal(isMinor({ birthDate: "2008-11-07" }, now), true); // 17 ans, anniversaire demain
  assert.equal(isMinor({ birthDate: "2008-11-06" }, now), false); // 18 ans aujourd'hui
  assert.equal(isMinor({}, now), false);
  assert.equal(consentState({ age: 10 }, null, now), "MISSING");
  assert.equal(consentState({ age: 10 }, { consentAt: "2026-01-01" }, now), "GRANTED");
  assert.equal(consentState({ age: 10 }, { consentAt: "2026-01-01", revokedAt: "2026-02-01" }, now), "REVOKED");
  assert.equal(consentState({ age: 40 }, null, now), "NOT_REQUIRED");
});

test("politique de conservation : défauts, minimum d'audit, coupures", () => {
  assert.deepEqual(retentionPolicy({}), { auditMonths: 24, notificationMonths: 12, reminderLogMonths: 6 });
  assert.equal(retentionPolicy({ RETENTION_AUDIT_MONTHS: "3" }).auditMonths, 24); // < 12 refusé
  assert.equal(retentionPolicy({ RETENTION_AUDIT_MONTHS: "36" }).auditMonths, 36);
  assert.equal(retentionPolicy({ RETENTION_NOTIFICATION_MONTHS: "abc" }).notificationMonths, 12);
  const now = new Date("2026-11-06T12:00:00Z");
  const c = retentionCutoffs(retentionPolicy({}), now);
  assert.equal(c.audit.getFullYear(), 2024);
  assert.equal(c.notification.getFullYear(), 2025);
  assert.ok(now.getTime() - c.tokens.getTime() === 24 * 3600 * 1000);
});

test("export : droits par rôle et anonymisation", () => {
  assert.equal(canExport("ADMIN", "beneficiaries"), "full");
  assert.equal(canExport("COMMUNICATION", "beneficiaries"), "anonymized");
  assert.equal(canExport("COMMUNICATION", "internships"), false);
  assert.equal(canExport("DAF", "beneficiaries"), false);
  assert.equal(canExport("DAF", "projects"), "full");
  assert.equal(canExport("STAGIAIRE_L3", "projects"), false);
  assert.equal(canExport("COORDINATOR", "internships"), false);
  const a = anonymizeRow({ id: 7, firstName: "A", lastName: "B", phone: "0340000000", email: "a@b.mg", age: 15, gender: "FEMALE", vulnerable: true, projectId: 2 });
  assert.equal(a.pseudonym, "B-00007");
  assert.equal(a.ageBand, "<18");
  for (const k of ["id", "firstName", "lastName", "phone", "email", "age"]) assert.ok(!(k in a), k);
  assert.equal(a.gender, "FEMALE");
  assert.equal(a.projectId, 2);
});
