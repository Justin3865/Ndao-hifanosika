"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { ExportFormatDialog } from "@/components/reports/ExportFormatDialog";
import { getStoredRole } from "@/lib/access";
import api from "@/lib/axios";
import { LookupItem, errorMessage, fetchLookup } from "@/lib/crud";
import { ExportFormat, ExportRow, rowsToSheet, saveSheetAs, saveWorkbook } from "@/lib/exportFormats";
import { EXPORT_LABEL, exportableDatasets, saveBlob } from "@/lib/gaps";
import type { XlsxSheet } from "@/lib/xlsx";

/** Ce que l'utilisateur vient de cliquer : un jeu de données précis, ou « Tout télécharger ». */
type Target = { kind: "one"; dataset: string } | { kind: "all" };

export default function ExportsPage() {
  const [role, setRole] = useState("");
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    setRole(getStoredRole());
    fetchLookup("projects").then(setProjects).catch(() => setProjects([]));
  }, []);

  const datasets = exportableDatasets(role);
  const anonymized = role.toUpperCase() === "COMMUNICATION";
  const label = (dataset: string) => EXPORT_LABEL[dataset] ?? dataset;
  const params = (dataset: string) => ({ dataset, ...(projectId ? { projectId } : {}) });

  /** Lignes d'un jeu de données (même route et même périmètre que l'export JSON). */
  const fetchRows = async (dataset: string): Promise<ExportRow[]> => {
    const res = await api.get("/exports/json", { params: params(dataset) });
    return (res.data?.data ?? []) as ExportRow[];
  };

  /** Fichier JSON tel que fourni par le serveur (comportement d'origine, inchangé). */
  const downloadJson = async (dataset: string) => {
    const res = await api.get("/exports/json", { params: params(dataset), responseType: "blob" });
    saveBlob(res.data as Blob, `export-${dataset}.json`);
  };

  const download = async (dataset: string, format: ExportFormat) => {
    setBusy(dataset);
    setError("");
    setInfo("");
    try {
      if (format === "json") {
        await downloadJson(dataset);
      } else {
        const rows = await fetchRows(dataset);
        saveSheetAs(format, `export-${dataset}`, rowsToSheet(label(dataset), rows));
      }
      setInfo(`Export « ${label(dataset)} » téléchargé (${format === "xlsx" ? "Excel" : format.toUpperCase()}).`);
    } catch (err) {
      setError(errorMessage(err, "Export impossible."));
    } finally {
      setBusy("");
    }
  };

  /** Tout télécharger : Excel = un seul classeur (une feuille par jeu), CSV / JSON = un fichier par jeu. */
  const downloadAll = async (format: ExportFormat) => {
    setBusy("ALL");
    setError("");
    setInfo("");

    const failed: string[] = [];
    const sheets: XlsxSheet[] = [];
    let done = 0;

    for (const dataset of datasets) {
      try {
        if (format === "json") {
          await downloadJson(dataset);
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else if (format === "csv") {
          const rows = await fetchRows(dataset);
          saveSheetAs("csv", `export-${dataset}`, rowsToSheet(label(dataset), rows));
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          const rows = await fetchRows(dataset);
          sheets.push(rowsToSheet(label(dataset), rows));
        }
        done += 1;
      } catch {
        failed.push(label(dataset));
      }
    }

    if (format === "xlsx" && sheets.length > 0) {
      saveWorkbook(`export-tout-${new Date().toISOString().slice(0, 10)}`, sheets);
    }

    if (failed.length > 0) setError(`Export impossible pour : ${failed.join(", ")} (accès refusé ?).`);
    if (done > 0) setInfo(`${done} export(s) téléchargé(s) (${format === "xlsx" ? "Excel" : format.toUpperCase()}).`);
    setBusy("");
  };

  const onPick = (format: ExportFormat) => {
    const current = target;
    setTarget(null);
    if (!current) return;
    if (current.kind === "all") void downloadAll(format);
    else void download(current.dataset, format);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export des données (JSON, CSV, Excel)</h1>
          <p className="text-sm text-gray-500">
            Choisissez le format au moment du téléchargement. Le JSON est le format standard et portable pour les bailleurs et les outils externes. Pour les PDF, utilisez la rubrique Rapports.
          </p>
        </div>

        {anonymized && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Vos exports sont pseudonymisés : aucun nom, contact, pièce d&apos;identité ni position GPS n&apos;est inclus.
          </div>
        )}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block text-sm sm:max-w-sm sm:flex-1">
            <span className="mb-1 block font-medium text-gray-700">Limiter à un projet (facultatif)</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Tous les projets autorisés</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setTarget({ kind: "all" })}
            disabled={busy !== "" || datasets.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {busy === "ALL" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy === "ALL" ? "Téléchargement..." : "Tout télécharger"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setTarget({ kind: "one", dataset: d })}
              disabled={busy !== ""}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
            >
              <span className="font-medium text-gray-900">{label(d)}</span>
              {busy === d ? <Loader2 className="h-5 w-5 animate-spin text-blue-700" /> : <Download className="h-5 w-5 text-blue-700" />}
            </button>
          ))}
          {datasets.length === 0 && <p className="text-sm text-gray-500">Aucun export disponible pour votre rôle.</p>}
        </div>
      </div>

      <ExportFormatDialog
        open={target !== null}
        title={target?.kind === "all" ? "Tout télécharger" : target ? `Exporter « ${label(target.dataset)} »` : ""}
        subtitle={
          target?.kind === "all"
            ? "Choisissez le format. En Excel, tout est regroupé dans un seul classeur ; en CSV ou JSON, un fichier par jeu de données."
            : undefined
        }
        onClose={() => setTarget(null)}
        onPick={onPick}
      />
    </AppLayout>
  );
}
