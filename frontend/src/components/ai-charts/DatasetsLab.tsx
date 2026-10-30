"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, Play, Shuffle, Trash2, X } from "lucide-react";
import api from "@/lib/axios";
import { getStoredRole } from "@/lib/access";
import { errorMessage } from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";

interface Metrics { accuracy: number; precision: number; recall: number; f1: number; auc: number }

type Kind = "households" | "interns" | "projects";

interface Overview {
  kind: Kind;
  title: string;
  description: string;
  labelRule: string;
  positiveText: string;
  negativeText: string;
  current: { labeled: number; unlabeled: number; positives: number };
  last: { id: number; at: string } | null;
}

interface Row {
  id: number;
  name: string;
  context: string;
  link: string;
  label: 0 | 1 | null;
  labelText: string | null;
  scores: Record<string, number>;
  ensemble: number;
  predicted: 0 | 1;
  predictedText: string;
  correct: boolean | null;
  values: Record<string, number | null>;
}

interface Report {
  available: boolean;
  reason?: string;
  kind: Kind;
  title: string;
  labelRule: string;
  positiveText: string;
  negativeText: string;
  generatedAt: string;
  seed: number;
  testRatio: number;
  featureNames: string[];
  counts: { total: number; labeled: number; train: number; test: number; unlabeled: number; positives: number; trainPositives: number; testPositives: number };
  reliability: "INSUFFISANTE" | "FAIBLE" | "CORRECTE";
  methods: Array<{ key: string; name: string; test: Metrics; train: Metrics; overfit: number }>;
  baselineTest: Metrics;
  best: { key: string; name: string; auc: number; f1: number; accuracy: number } | null;
  confusion: { tp: number; fp: number; tn: number; fn: number };
  train: Row[];
  test: Row[];
  unlabeled: Row[];
  runId?: number;
}

interface HistoryItem {
  id: number;
  at: string;
  sampleSize: number;
  seed: number | null;
  counts: Report["counts"] | null;
  reliability: Report["reliability"] | null;
  best: Report["best"];
}

type ListKey = "train" | "test" | "unlabeled";

const pct = (v: number) => `${Math.round(v * 100)} %`;
const fmt = (v: number) => (Math.round(v * 100) / 100).toFixed(2);
const fmtDate = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const RELIABILITY_STYLE = {
  INSUFFISANTE: "bg-red-100 text-red-700",
  FAIBLE: "bg-amber-100 text-amber-700",
  CORRECTE: "bg-green-100 text-green-700",
};

const PAGE = 25;

/**
 * Jeux de données : pour chaque source (ménages, stagiaires, Suivi & Évaluation des projets),
 * la liste des données d'ENTRAÎNEMENT, la liste des données de TEST (jamais vues pendant
 * l'entraînement) et les données « à tester » dont le résultat n'est pas encore connu.
 */
export function DatasetsLab({ onChanged }: { onChanged?: () => void } = {}) {
  const [overview, setOverview] = useState<Overview[]>([]);
  const [kind, setKind] = useState<Kind>("interns");
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canTrain, setCanTrain] = useState(false);
  const [list, setList] = useState<ListKey>("test");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [openRow, setOpenRow] = useState<number | null>(null);

  const loadKind = useCallback(async (k: Kind) => {
    const [latest, hist] = await Promise.all([api.get(`/ai/datasets/${k}/latest`), api.get(`/ai/datasets/${k}/history`)]);
    setReport(latest.data?.data ?? null);
    setHistory(hist.data?.data ?? []);
  }, []);

  const loadOverview = useCallback(async () => {
    const res = await api.get("/ai/datasets");
    setOverview(res.data?.data ?? []);
  }, []);

  useEffect(() => {
    setCanTrain(["ADMIN", "DSI"].includes(getStoredRole()));

    void (async () => {
      try {
        await loadOverview();
        setError("");
      } catch (err) {
        setError(errorMessage(err, "Jeux de données indisponibles."));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadOverview]);

  useEffect(() => {
    setSearch("");
    setShown(PAGE);
    setOpenRow(null);
    setList("test");
    void loadKind(kind).catch(() => {
      setReport(null);
      setHistory([]);
    });
  }, [kind, loadKind]);

  const run = async (shuffle: boolean) => {
    setBusy(true);

    try {
      const res = await api.post(`/ai/datasets/${kind}/run`, { shuffle });
      const data = res.data?.data as Report;
      setReport(data);
      setShown(PAGE);

      if (data.available) toast.success("Entraînement et test terminés, résultats enregistrés.");
      else toast.warning(data.reason ?? "Données insuffisantes.");

      await Promise.all([loadKind(kind), loadOverview()]);
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, "Entraînement impossible."));
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async (item: HistoryItem) => {
    try {
      const res = await api.get(`/ai/datasets/runs/${item.id}`);
      setReport(res.data?.data ?? null);
      setShown(PAGE);
    } catch (err) {
      toast.error(errorMessage(err, "Lecture impossible."));
    }
  };

  const removeRun = async (item: HistoryItem) => {
    const ok = await confirmDialog(`Supprimer l'entraînement du ${fmtDate(item.at)} ? Cette action est définitive.`, {
      title: "Supprimer cet entraînement",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/ai/models/${item.id}`);
      toast.success("Entraînement supprimé.");
      await Promise.all([loadKind(kind), loadOverview()]);
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, "Suppression impossible."));
    }
  };

  const meta = overview.find((o) => o.kind === kind);

  const rows = useMemo(() => {
    const source = report?.[list] ?? [];
    const q = search.trim().toLowerCase();
    return q ? source.filter((r) => `${r.name} ${r.context}`.toLowerCase().includes(q)) : source;
  }, [report, list, search]);

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Chargement des jeux de données…</div>;
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;

  const positive = meta?.positiveText ?? "Positif";

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Données d&apos;entraînement et de test</h2>

      <div className="flex flex-wrap gap-2">
        {overview.map((o) => (
          <button
            key={o.kind}
            type="button"
            onClick={() => setKind(o.kind)}
            className={`rounded-xl border px-4 py-2 text-left text-sm transition ${kind === o.kind ? "border-blue-700 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            <span className="block font-semibold">{o.title}</span>
            <span className="block text-xs text-gray-500">{o.current.labeled} avec résultat{o.current.unlabeled ? ` · ${o.current.unlabeled} à tester` : ""}</span>
          </button>
        ))}
      </div>

      {meta && (
        <div className="flex flex-wrap items-center gap-3">
          {canTrain && (
            <>
              <button type="button" onClick={() => void run(false)} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Entraîner et tester
              </button>
              <button type="button" onClick={() => void run(true)} disabled={busy} title="Redécoupe au hasard les listes d'entraînement et de test" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                <Shuffle className="h-4 w-4" /> Nouveau tirage
              </button>
            </>
          )}
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer font-medium text-blue-700">Définition du résultat</summary>
            <p className="mt-1 max-w-xl">{meta.labelRule}</p>
          </details>
        </div>
      )}

      {!report && <p className="text-sm text-gray-500">Aucun entraînement pour cette source.</p>}

      {report && !report.available && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{report.reason ?? "Données insuffisantes."}</p>
      )}

      {report && report.available && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-800">Entraînement : {report.counts.train}</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">Test : {report.counts.test}</span>
            {report.counts.unlabeled > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">À tester : {report.counts.unlabeled}</span>}
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-gray-900">Résultats sur les données de test</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${RELIABILITY_STYLE[report.reliability]}`}>Fiabilité : {report.reliability.toLowerCase()}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>{["Modèle", "Exactitude", "F1", "AUC"].map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.methods.map((m) => (
                    <tr key={m.key} className={m.key === report.best?.key ? "bg-emerald-50/60" : undefined}>
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{m.key === report.best?.key ? "🏆 " : ""}{m.name.split(" (")[0]}{m.overfit > 0.15 && <span title="Sur-apprentissage : bien meilleur à l'entraînement qu'au test" className="ml-1 text-red-600">⚠</span>}</td>
                      <td className="pr-4">{pct(m.test.accuracy)}</td>
                      <td className="pr-4">{fmt(m.test.f1)}</td>
                      <td className="pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400" style={{ width: `${m.test.auc * 100}%` }} />
                          </div>
                          {fmt(m.test.auc)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500">Test : {report.confusion.tp + report.confusion.tn} bien classés sur {report.counts.test} · {report.confusion.fp} fausses alertes · {report.confusion.fn} cas manqués.</p>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {([
                ["train", "Données d'entraînement", report.counts.train],
                ["test", "Données de test", report.counts.test],
                ["unlabeled", "À tester (résultat inconnu)", report.counts.unlabeled],
              ] as Array<[ListKey, string, number]>).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setList(key); setShown(PAGE); setOpenRow(null); }}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${list === key ? "bg-blue-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {label} ({count})
                </button>
              ))}
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShown(PAGE); }}
                placeholder="Rechercher un nom…"
                className="ml-auto w-full max-w-xs rounded-xl border border-gray-300 px-3 py-1.5 text-sm sm:w-64"
              />
            </div>

            {rows.length === 0 ? (
              <p className="py-4 text-sm text-gray-500">Aucune ligne.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr><th className="w-6" /><th className="py-2 pr-3 font-semibold">Nom</th><th className="pr-3 font-semibold">Contexte</th><th className="pr-3 font-semibold">Résultat connu</th><th className="pr-3 font-semibold">Score « {positive.toLowerCase()} »</th><th className="pr-3 font-semibold">Prédit</th><th className="font-semibold">{list === "unlabeled" ? "" : "Verdict"}</th></tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, shown).map((r) => {
                      const open = openRow === r.id;
                      return (
                        <Fragment key={`${list}-${r.id}`}>
                          <tr className="border-t border-gray-100 text-gray-700">
                            <td>
                              <button type="button" onClick={() => setOpenRow(open ? null : r.id)} aria-label="Voir les variables" aria-expanded={open} className="text-gray-400 hover:text-gray-700">
                                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="py-2 pr-3 font-medium text-gray-900"><Link href={r.link} className="hover:underline">{r.name}</Link></td>
                            <td className="pr-3 text-gray-500">{r.context}</td>
                            <td className="pr-3">{r.labelText ?? <span className="text-gray-400">inconnu</span>}</td>
                            <td className="pr-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                                  <div className={`h-full rounded-full ${r.ensemble >= 50 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${r.ensemble}%` }} />
                                </div>
                                {r.ensemble} %
                              </div>
                            </td>
                            <td className="pr-3">{r.predictedText}</td>
                            <td>
                              {r.correct === null ? null : r.correct ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-4 w-4" /> Correct</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600"><X className="h-4 w-4" /> Erreur</span>
                              )}
                            </td>
                          </tr>
                          {open && (
                            <tr className="bg-gray-50">
                              <td />
                              <td colSpan={6} className="py-3 pr-3">
                                <div className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
                                  {report.featureNames.map((f) => (
                                    <div key={f} className="flex justify-between gap-3 border-b border-gray-200 py-1">
                                      <span className="text-gray-500">{f}</span>
                                      <span className="font-medium text-gray-900">{r.values[f] === null || r.values[f] === undefined ? "—" : r.values[f]}</span>
                                    </div>
                                  ))}
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                  Scores par méthode : {Object.entries(r.scores).map(([k, v]) => `${k.toUpperCase()} ${v} %`).join(" · ")}
                                </p>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {rows.length > shown && (
              <button type="button" onClick={() => setShown((s) => s + PAGE)} className="rounded-xl border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Afficher plus ({rows.length - shown} restantes)
              </button>
            )}
          </div>
        </>
      )}

      {history.length > 0 && (
        <details className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-gray-900">Historique ({history.length})</summary>
          <div className="mt-2 divide-y divide-gray-100">
            {history.map((h, i) => (
              <div key={h.id} className={`flex flex-wrap items-center justify-between gap-2 py-3 text-sm ${report?.runId === h.id ? "bg-sky-50/60" : ""}`}>
                <span className="font-medium text-gray-900">
                  {fmtDate(h.at)}
                  {i === 0 && <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">Dernier</span>}
                </span>
                <span className="text-gray-500">
                  {h.counts ? `${h.counts.train} entraînement · ${h.counts.test} test` : `${h.sampleSize} lignes`}
                  {h.best ? ` · 🏆 ${h.best.name.split(" (")[0]} (AUC ${fmt(h.best.auc)})` : ""}
                </span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => void openHistory(h)} className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100">Voir les listes</button>
                  {canTrain && (
                    <button type="button" onClick={() => void removeRun(h)} title="Supprimer" aria-label="Supprimer" className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
