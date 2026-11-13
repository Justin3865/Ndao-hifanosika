"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Loader2, Pencil, Search } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getStoredRole } from "@/lib/access";
import api from "@/lib/axios";
import { LookupItem, errorMessage, fetchLookup, fmtDate } from "@/lib/crud";
import {
  JOURNEY_LABELS,
  JOURNEY_STATUSES,
  JOURNEY_STYLE,
  JourneyRow,
  JourneyStatus,
  JourneySummary,
  LabelReadiness,
  buildJourneyPayload,
  labelReadiness,
  pctRate,
  toDateInput,
} from "@/lib/journey";

const PAGE_SIZE = 50;
const EDIT_ROLES = ["ADMIN", "COORDINATOR"]; // miroir de PUT /api/journey/beneficiary/:id
const LABEL_ROLES = ["ADMIN", "DIRECTION"]; // miroir de GET /api/journey/labels

const READINESS_STYLE: Record<LabelReadiness["level"], string> = {
  insufficient: "border-amber-200 bg-amber-50 text-amber-900",
  indicative: "border-blue-200 bg-blue-50 text-blue-900",
  reliable: "border-green-200 bg-green-50 text-green-900",
};

export default function ParcoursPage() {
  const { t } = useI18n();
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<JourneyRow[]>([]);
  const [summary, setSummary] = useState<JourneySummary | null>(null);
  const [readiness, setReadiness] = useState<LabelReadiness | null>(null);
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<"" | JourneyStatus>("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [editing, setEditing] = useState<JourneyRow | null>(null);
  const [form, setForm] = useState({ status: "ACTIVE" as JourneyStatus, date: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const canEdit = EDIT_ROLES.includes(role);
  const canSeeLabels = LABEL_ROLES.includes(role);

  useEffect(() => {
    setRole(getStoredRole());
    // Lien profond depuis la carte « modèle d'abandon » : /parcours?status=DROPPED_OUT
    const wanted = new URLSearchParams(window.location.search).get("status");
    if (wanted && (JOURNEY_STATUSES as string[]).includes(wanted)) setStatus(wanted as JourneyStatus);
    fetchLookup("projects").then(setProjects).catch(() => setProjects([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params: Record<string, string> = {};
    if (projectId) params.projectId = projectId;
    try {
      const [list, sum] = await Promise.all([
        api.get("/journey", { params: { ...params, ...(status ? { status } : {}) } }),
        api.get("/journey/summary", { params }),
      ]);
      setRows(list.data?.data ?? []);
      setSummary(sum.data?.data ?? null);
      setPage(1);
    } catch (err) {
      setError(errorMessage(err, t("common.error")));
    } finally {
      setLoading(false);
    }
  }, [projectId, status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Carte « prêt pour l'évaluation du modèle » : réservée à ceux qui peuvent lire les labels.
  const loadReadiness = useCallback(async () => {
    if (!canSeeLabels) return;
    try {
      const res = await api.get("/journey/labels");
      setReadiness(labelReadiness(res.data?.data ?? []));
    } catch {
      setReadiness(null);
    }
  }, [canSeeLabels]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.firstName} ${r.lastName} ${r.project?.name ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const open = (row: JourneyRow) => {
    setEditing(row);
    setForm({
      status: row.journeyStatus,
      date: toDateInput(row.statusDate) || new Date().toISOString().slice(0, 10),
      reason: row.dropoutReason ?? "",
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      await api.put(`/journey/beneficiary/${editing.id}`, buildJourneyPayload(form));
      setInfo("Statut du parcours enregistré.");
      setEditing(null);
      await Promise.all([load(), loadReadiness()]);
    } catch (err) {
      setError(errorMessage(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  const counts = summary?.counts ?? { ACTIVE: 0, COMPLETED: 0, DROPPED_OUT: 0 };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parcours des bénéficiaires</h1>
          <p className="text-sm text-gray-500">
            Suivez qui est en cours, a terminé ou a abandonné. Ces statuts servent à calculer le taux d&apos;abandon et à évaluer le
            modèle de risque d&apos;abandon : renseignez-les avec soin.
          </p>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEY_STATUSES.map((s) => (
            <div key={s} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">{JOURNEY_LABELS[s]}</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{counts[s] ?? 0}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Taux d&apos;abandon</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{pctRate(summary?.rate)}</p>
            <p className="mt-1 text-xs text-gray-500">Abandons / (terminés + abandons). Les parcours en cours sont exclus.</p>
          </div>
        </section>

        {readiness && (
          <section className={`rounded-2xl border p-4 text-sm ${READINESS_STYLE[readiness.level]}`}>
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Données disponibles pour évaluer le modèle d&apos;abandon</p>
                <p>{t("journey.readiness.counts", { closed: readiness.closed, completed: readiness.completed, dropped: readiness.dropped })}</p>
                {readiness.level === "insufficient" && (
                  <p>
                    {t("journey.readiness.insufficient", {
                      more: readiness.missingClosed > 0 ? t("journey.readiness.more", { n: readiness.missingClosed }) : "",
                    })}
                  </p>
                )}
                {readiness.level === "indicative" && <p>{t("journey.readiness.indicative")}</p>}
                {readiness.level === "reliable" && <p>{t("journey.readiness.reliable")}</p>}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 md:flex-row md:items-center">
            <div className="relative md:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher"
                aria-label="Rechercher"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label={t("common.project")}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">{t("common.project")} : {t("common.all")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "" | JourneyStatus)}
              aria-label={t("common.status")}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">{t("common.status")} : {t("common.all")}</option>
              {JOURNEY_STATUSES.map((s) => (
                <option key={s} value={s}>{JOURNEY_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}</div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{t("common.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-2">Bénéficiaire</th>
                    <th className="px-5 py-2">{t("common.project")}</th>
                    <th className="px-5 py-2">{t("common.status")}</th>
                    <th className="px-5 py-2">Date</th>
                    <th className="px-5 py-2">Motif d&apos;abandon</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-2 font-medium text-gray-900">{r.firstName} {r.lastName}</td>
                      <td className="px-5 py-2 text-gray-600">{r.project?.name ?? "—"}</td>
                      <td className="px-5 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${JOURNEY_STYLE[r.journeyStatus]}`}>{JOURNEY_LABELS[r.journeyStatus]}</span>
                      </td>
                      <td className="px-5 py-2">{r.statusDate ? fmtDate(r.statusDate) : "—"}</td>
                      <td className="max-w-xs truncate px-5 py-2 text-gray-600" title={r.dropoutReason ?? ""}>{r.dropoutReason ?? "—"}</td>
                      <td className="px-5 py-2 text-right">
                        {canEdit && (
                          <button type="button" onClick={() => open(r)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:underline">
                            <Pencil className="h-3.5 w-3.5" /> Modifier
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
              <span>{t("journey.results", { n: filtered.length })}</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40">← Précédent</button>
                <span>{page} / {pages}</span>
                <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40">Suivant →</button>
              </div>
            </div>
          )}
        </section>

        {!canEdit && !loading && (
          <p className="text-xs text-gray-500">Consultation seule : seuls l’administrateur et les coordinateurs modifient les parcours.</p>
        )}
      </div>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title="Statut du parcours"
        description={editing ? `${editing.firstName} ${editing.lastName}` : undefined}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Annuler</button>
            <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
              {saving ? t("common.loading") : "Enregistrer"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <label className="block">
            <span className="mb-1 block font-medium text-gray-700">{t("common.status")}</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as JourneyStatus })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {JOURNEY_STATUSES.map((s) => (
                <option key={s} value={s}>{JOURNEY_LABELS[s]}</option>
              ))}
            </select>
          </label>
          {form.status !== "ACTIVE" && (
            <label className="block">
              <span className="mb-1 block font-medium text-gray-700">{form.status === "COMPLETED" ? "Date de fin du parcours" : "Date de l'abandon"}</span>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
          )}
          {form.status === "DROPPED_OUT" && (
            <label className="block">
              <span className="mb-1 block font-medium text-gray-700">Motif d&apos;abandon (facultatif)</span>
              <textarea
                value={form.reason}
                maxLength={1000}
                rows={3}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <span className="mt-1 block text-xs text-gray-500">Évitez d&apos;y inscrire des informations personnelles sensibles.</span>
            </label>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
