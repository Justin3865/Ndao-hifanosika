"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { useI18n } from "@/components/i18n/I18nProvider";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";

type Occupation = "EMPLOYED" | "SELF_EMPLOYED" | "IN_TRAINING" | "SEEKING" | "INACTIVE";

interface FollowUp {
  id: number;
  horizonMonths: number;
  dueDate: string;
  status: string;
  phase: "done" | "upcoming" | "due" | "overdue" | "missed";
  beneficiary: { id: number; firstName: string; lastName: string; project: { name: string } };
}

interface Summary {
  horizonMonths: number;
  total: number;
  done: number;
  responseRate: number | null;
  insertionRate: number | null;
  avgSatisfaction: number | null;
  avgMonthlyIncome: number | null;
}

const OCCUPATIONS: Occupation[] = ["EMPLOYED", "SELF_EMPLOYED", "IN_TRAINING", "SEEKING", "INACTIVE"];
const PHASE_STYLE: Record<FollowUp["phase"], string> = {
  done: "bg-green-100 text-green-800",
  upcoming: "bg-gray-100 text-gray-700",
  due: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  missed: "bg-red-200 text-red-900",
};

const pct = (v: number | null) => (v === null ? "—" : `${v} %`);
const num = (v: number | null) => (v === null ? "—" : String(v));

export default function FollowUpsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [horizon, setHorizon] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [form, setForm] = useState({ occupation: "SEEKING" as Occupation, activityCreated: false, monthlyIncome: "", satisfaction: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, impact] = await Promise.all([
        api.get("/follow-ups", { params: horizon ? { horizon } : {} }),
        api.get("/follow-ups/impact"),
      ]);
      setRows(list.data?.data ?? []);
      setSummary(impact.data?.data?.summary ?? []);
    } catch (err) {
      setError(errorMessage(err, t("common.error")));
    } finally {
      setLoading(false);
    }
  }, [horizon, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = async () => {
    setError("");
    try {
      await api.post("/follow-ups/sync");
      setInfo(t("followup.synced"));
      await load();
    } catch (err) {
      setError(errorMessage(err, t("common.error")));
    }
  };

  const open = (row: FollowUp) => {
    setEditing(row);
    setForm({ occupation: "SEEKING", activityCreated: false, monthlyIncome: "", satisfaction: "", notes: "" });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      await api.put(`/follow-ups/${editing.id}/complete`, {
        occupation: form.occupation,
        activityCreated: form.activityCreated,
        ...(form.monthlyIncome !== "" ? { monthlyIncome: Number(form.monthlyIncome) } : {}),
        ...(form.satisfaction !== "" ? { satisfaction: Number(form.satisfaction) } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      });
      setInfo(t("followup.saved"));
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("followup.title")}</h1>
            <p className="text-sm text-gray-500">{t("followup.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={sync}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
          >
            <RefreshCw className="h-4 w-4" /> {t("followup.sync")}
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">{t("followup.impact")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {summary.map((s) => (
              <div key={s.horizonMonths} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-blue-800">
                  {s.horizonMonths} {t("followup.months")} <span className="font-normal text-gray-500">({s.done}/{s.total})</span>
                </p>
                <dl className="mt-3 space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between"><dt>{t("followup.responseRate")}</dt><dd className="font-semibold">{pct(s.responseRate)}</dd></div>
                  <div className="flex justify-between"><dt>{t("followup.insertionRate")}</dt><dd className="font-semibold">{pct(s.insertionRate)}</dd></div>
                  <div className="flex justify-between"><dt>{t("followup.avgSatisfaction")}</dt><dd className="font-semibold">{num(s.avgSatisfaction)}</dd></div>
                  <div className="flex justify-between"><dt>{t("followup.avgIncome")}</dt><dd className="font-semibold">{num(s.avgMonthlyIncome)}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
            <label className="text-sm text-gray-600" htmlFor="fu-horizon">{t("followup.horizon")}</label>
            <select
              id="fu-horizon"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value ? Number(e.target.value) : "")}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">{t("common.all")}</option>
              {[3, 6, 12].map((h) => <option key={h} value={h}>{h} {t("followup.months")}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}</div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{t("common.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-2">{t("followup.beneficiary")}</th>
                    <th className="px-5 py-2">{t("common.project")}</th>
                    <th className="px-5 py-2">{t("followup.horizon")}</th>
                    <th className="px-5 py-2">{t("followup.dueDate")}</th>
                    <th className="px-5 py-2">{t("common.status")}</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-2 font-medium text-gray-900">{r.beneficiary.firstName} {r.beneficiary.lastName}</td>
                      <td className="px-5 py-2 text-gray-600">{r.beneficiary.project.name}</td>
                      <td className="px-5 py-2">{r.horizonMonths} {t("followup.months")}</td>
                      <td className="px-5 py-2">{new Date(r.dueDate).toLocaleDateString("fr-FR")}</td>
                      <td className="px-5 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PHASE_STYLE[r.phase]}`}>{t(`followup.phase.${r.phase}`)}</span></td>
                      <td className="px-5 py-2 text-right">
                        {r.status === "PENDING" && (
                          <button type="button" onClick={() => open(r)} className="text-sm font-semibold text-blue-800 hover:underline">{t("followup.record")}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">
              {t("followup.record")} — {editing.beneficiary.firstName} {editing.beneficiary.lastName} ({editing.horizonMonths} {t("followup.months")})
            </h3>
            <label className="block text-sm">
              {t("followup.occupation")}
              <select value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value as Occupation })} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2">
                {OCCUPATIONS.map((o) => <option key={o} value={o}>{t(`followup.occ.${o}`)}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activityCreated} onChange={(e) => setForm({ ...form, activityCreated: e.target.checked })} />
              {t("followup.activityCreated")}
            </label>
            <label className="block text-sm">
              {t("followup.income")}
              <input type="number" min={0} value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2" />
            </label>
            <label className="block text-sm">
              {t("followup.satisfaction")}
              <input type="number" min={1} max={5} value={form.satisfaction} onChange={(e) => setForm({ ...form, satisfaction: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2" />
            </label>
            <label className="block text-sm">
              {t("common.notes")}
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">{t("common.cancel")}</button>
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? t("common.loading") : t("common.save")}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
