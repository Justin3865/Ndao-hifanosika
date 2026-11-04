import test from "node:test";
import assert from "node:assert/strict";
import { addMonths, classify, computeSchedule, programEndDate, summarize, GRACE_DAYS } from "../src/utils/followUpRules";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

test("addMonths garde la fin de mois (31 janv + 1 mois = 28 fév)", () => {
  assert.equal(addMonths(d("2026-01-31"), 1).toISOString().slice(0, 10), "2026-02-28");
  assert.equal(addMonths(d("2027-12-31"), 2).toISOString().slice(0, 10), "2028-02-29");
  assert.equal(addMonths(d("2026-11-15"), 12).toISOString().slice(0, 10), "2027-11-15");
});

test("computeSchedule donne 3, 6 et 12 mois", () => {
  const s = computeSchedule(d("2026-06-30"));
  assert.deepEqual(s.map((x) => x.horizonMonths), [3, 6, 12]);
  assert.deepEqual(s.map((x) => x.dueDate.toISOString().slice(0, 10)), ["2026-09-30", "2026-12-30", "2027-06-30"]);
});

test("programEndDate : uniquement pour un projet clôturé", () => {
  assert.equal(programEndDate({ status: "ACTIVE", endDate: d("2026-01-01"), updatedAt: d("2026-01-02") }), null);
  assert.equal(programEndDate({ status: "COMPLETED", endDate: d("2026-01-01"), updatedAt: d("2026-02-02") })!.toISOString().slice(0, 10), "2026-01-01");
  assert.equal(programEndDate({ status: "COMPLETED", endDate: null, updatedAt: d("2026-02-02") })!.toISOString().slice(0, 10), "2026-02-02");
});

test("classify : upcoming → due → overdue → missed ; done reste done", () => {
  const due = d("2026-12-01");
  const at = (s: string) => classify({ status: "PENDING", dueDate: due }, d(s));
  assert.equal(at("2026-10-01"), "upcoming");
  assert.equal(at("2026-11-26"), "due");
  assert.equal(at("2026-12-10"), "overdue");
  const late = new Date(due.getTime() + (GRACE_DAYS + 1) * 86400000);
  assert.equal(classify({ status: "PENDING", dueDate: due }, late), "missed");
  assert.equal(classify({ status: "DONE", dueDate: due }, late), "done");
});

test("summarize : taux de réponse, insertion, satisfaction par horizon", () => {
  const rows = [
    { horizonMonths: 3, status: "DONE", occupation: "EMPLOYED", satisfaction: 5, monthlyIncome: 300000 },
    { horizonMonths: 3, status: "DONE", occupation: "SEEKING", satisfaction: 3, monthlyIncome: 0 },
    { horizonMonths: 3, status: "DONE", occupation: "IN_TRAINING", activityCreated: true, satisfaction: 4 },
    { horizonMonths: 3, status: "MISSED" },
    { horizonMonths: 6, status: "PENDING" },
  ];
  const [h3, h6, h12] = summarize(rows);
  assert.equal(h3.total, 4);
  assert.equal(h3.responseRate, 75);          // 3 réalisées / (3 + 1 manquée)
  assert.equal(h3.insertionRate, 66.7);       // emploi + activité créée = 2 sur 3
  assert.equal(h3.avgSatisfaction, 4);
  assert.equal(h3.avgMonthlyIncome, 150000);
  assert.equal(h6.pending, 1);
  assert.equal(h6.responseRate, null);
  assert.equal(h12.total, 0);
});
