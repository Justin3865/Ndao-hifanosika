import test from "node:test";
import assert from "node:assert/strict";
import {
  attendanceOnNonWorkingDay, beneficiaryAnomalies, countDecisions, dayKeyMg, easterSunday, gpsIdentical,
  insideMadagascar, internshipDatesInvalid, malagasyHolidays, nonWorkingDaysOfYear, nonWorkingReason,
  noteRecommendations, notePolicy, penaltyPoints, presenceOnNonWorkingDay, projectAnomalies, robustOutliers,
  taskInconsistencies, type InternshipInput, type PresenceInput,
} from "../src/utils/extraAnomalyRules";

const stage: InternshipInput = { id: 1, studentId: 10, studentName: "Rakoto Jean", supervisorId: 20, title: "Stage", startDate: new Date("2026-03-02T00:00:00Z"), endDate: new Date("2026-08-28T00:00:00Z"), status: "IN_PROGRESS", projectId: 5, durationMonths: 6 };
const presence = (id: number, day: string, extra: Partial<PresenceInput> = {}): PresenceInput => ({ id, userId: 10, day, internshipId: 1, projectId: 5, status: "OK", flags: [], checkInAt: new Date(`${day}T05:30:00Z`), checkOutAt: new Date(`${day}T13:30:00Z`), inLatitude: -18.9, inLongitude: 47.5, inAccuracy: 10, tasksDone: 1, summary: "ok", ...extra });

test("Pâques et jours fériés malgaches 2026", () => {
  assert.equal(easterSunday(2026).toISOString().slice(0, 10), "2026-04-05");
  const h = malagasyHolidays(2026);
  assert.equal(h["2026-04-06"], "Lundi de Pâques");
  assert.equal(h["2026-05-14"], "Ascension");
  assert.equal(h["2026-05-25"], "Lundi de Pentecôte");
  assert.equal(h["2026-06-26"], "Fête de l'Indépendance");
});

test("jour ouvrable ou non", () => {
  assert.equal(nonWorkingReason("2026-11-08", new Set()), "dimanche");
  assert.equal(nonWorkingReason("2026-11-07", new Set()), "samedi");
  assert.match(nonWorkingReason("2026-06-26", new Set()) ?? "", /Indépendance/); // vendredi férié
  assert.equal(nonWorkingReason("2026-06-25", new Set()), null);
  assert.match(nonWorkingReason("2026-12-24", new Set(["2026-12-24"])) ?? "", /fermeture/);
  assert.ok(nonWorkingDaysOfYear(2026, new Set()).length >= 104 + 5);
});

test("jour local de Madagascar (UTC+3)", () => {
  assert.equal(dayKeyMg(new Date("2026-06-25T22:00:00Z")), "2026-06-26");
});

test("présence un jour férié : anomalie liée au stage, au stagiaire et au tuteur", () => {
  const rows = presenceOnNonWorkingDay([presence(1, "2026-06-26"), presence(2, "2026-06-25"), presence(3, "2026-06-27")], [stage], new Set());
  assert.deepEqual(rows.map((r) => r.key), ["PRESENCE_NON_WORKING_DAY:1", "PRESENCE_NON_WORKING_DAY:3"]);
  assert.deepEqual(rows[0].ownerIds, [10, 20]);
  assert.match(rows[0].link, /internshipId=1/);
});

test("GPS identique répété", () => {
  const list = [1, 2, 3, 4, 5].map((i) => presence(i, `2026-06-0${i}`));
  assert.equal(gpsIdentical(list, [stage]).length, 1);
  assert.equal(gpsIdentical(list.slice(0, 4), [stage]).length, 0);
});

test("dates de stage incohérentes et tâches contradictoires", () => {
  assert.equal(internshipDatesInvalid([{ ...stage, endDate: new Date("2026-01-01T00:00:00Z") }]).length, 1);
  const t = (id: number, status: string, progress: number, report: string | null) => ({ id, internshipId: 1, title: "t", status, progress, report, evidenceName: null });
  assert.equal(taskInconsistencies([t(1, "COMPLETED", 40, "r"), t(2, "COMPLETED", 100, null)], [stage]).length, 1);
  assert.equal(taskInconsistencies([t(1, "COMPLETED", 40, "r")], [stage]).length, 0);
});

test("valeurs atypiques robustes", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ internshipId: i + 1, values: [20 + (i % 3), 480 + (i % 4), 1, 0, 8.5] as Array<number | null> }));
  rows.push({ internshipId: 99, values: [3, 20, 0, 0.9, 8.5] });
  const out = robustOutliers(rows);
  assert.ok(out.some((o) => o.internshipId === 99));
  assert.equal(robustOutliers(rows.slice(0, 5)).length, 0);
});

test("bénéficiaires : CIN en double, GPS invalide, mineur sans consentement, abandon silencieux", () => {
  const now = new Date("2026-11-08T00:00:00Z");
  const base = { projectId: 1, age: 30, birthDate: null, phone: null, cinNumber: null, householdSize: 4, childrenUnder5: 1, outOfSchoolChildren: 0, latitude: null, longitude: null, homeLatitude: null, homeLongitude: null };
  const people = [
    { ...base, id: 1, name: "A", cinNumber: "101 111 111 111" },
    { ...base, id: 2, name: "B", cinNumber: "101111111111", homeLatitude: 18.9, homeLongitude: 47.5 },
    { ...base, id: 3, name: "C", age: 12 },
    { ...base, id: 4, name: "D", householdSize: 2, childrenUnder5: 5 },
    { ...base, id: 5, name: "E" },
  ];
  const att = [1, 2, 3].map((i) => ({ beneficiaryId: 5, activityId: i, present: true, createdAt: new Date(`2026-0${i}-10T08:00:00Z`) }));
  const types = beneficiaryAnomalies(people, att, [], [], now).map((r) => `${r.type}:${r.entityId}`);
  assert.ok(types.includes("BENEFICIARY_CIN_DUPLICATE:1") && types.includes("BENEFICIARY_CIN_DUPLICATE:2"));
  assert.ok(types.includes("BENEFICIARY_GPS_INVALID:2"));
  assert.ok(types.includes("BENEFICIARY_MINOR_NO_CONSENT:3"));
  assert.ok(types.includes("BENEFICIARY_HOUSEHOLD_INCONSISTENT:4"));
  assert.ok(types.includes("BENEFICIARY_SILENT_DROPOUT:5"));
  assert.equal(insideMadagascar(-18.9, 47.5), true);
  assert.equal(insideMadagascar(18.9, 47.5), false);
});

test("séance pointée un jour férié et anomalies de projet", () => {
  const act = { id: 7, projectId: 1, title: "Atelier", status: "COMPLETED", startDate: new Date("2026-06-26T06:00:00Z"), endDate: null, budget: 100, budgetSpent: 150, createdById: 3, presentCount: 12, lastRecordedAt: null };
  assert.equal(attendanceOnNonWorkingDay([act], new Set()).length, 1);
  const project = { id: 1, name: "P", status: "COMPLETED", startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2026-03-01T00:00:00Z"), beneficiaryTarget: 10, createdById: 3, beneficiaries: 0, milestonesOpen: 2 };
  const types = projectAnomalies([project], [act], new Date("2026-11-08T00:00:00Z")).map((r) => r.type);
  assert.ok(types.includes("PROJECT_COMPLETED_INCOMPLETE"));
  assert.ok(types.includes("ACTIVITY_SPENT_OVER_BUDGET"));
  assert.ok(types.includes("ACTIVITY_OUT_OF_PROJECT_WINDOW"));
});

test("note : pénalité plafonnée, recommandations, jamais automatique", () => {
  const policy = notePolicy({} as NodeJS.ProcessEnv);
  assert.deepEqual(policy, { perCase: 0.25, cap: 2, scale: 20 });
  assert.equal(penaltyPoints(3, policy), 0.75);
  assert.equal(penaltyPoints(100, policy), 2);
  assert.equal(notePolicy({ NOTE_ANOMALY_PENALTY_PER_CASE: "0.5", NOTE_ANOMALY_PENALTY_CAP: "1" } as unknown as NodeJS.ProcessEnv).cap, 1);
  const counts = countDecisions(["PENDING", "IN_REVIEW", "JUSTIFIED", "CONFIRMED", "CONFIRMED", "CONFIRMED"]);
  assert.deepEqual(counts, { pending: 1, inReview: 1, justified: 1, confirmed: 3 });
  const reco = noteRecommendations(counts, 14, policy).join(" | ");
  assert.match(reco, /2 cas à vérifier/);
  assert.match(reco, /14 → 13.25/);
  assert.match(reco, /jamais appliquée automatiquement/);
  assert.match(reco, /entretien/);
  assert.match(noteRecommendations(countDecisions([]), null, policy)[0], /Aucune anomalie/);
});
