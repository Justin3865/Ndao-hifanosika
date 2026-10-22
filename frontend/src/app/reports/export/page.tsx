"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import {
  ResourceConfig,
  errorMessage,
  exportCsv,
  listItems,
} from "@/lib/crud";
import {
  activitiesConfig,
  beneficiariesConfig,
  departementsConfig,
  evaluationsConfig,
  internshipsConfig,
  membersConfig,
  milestonesConfig,
  projectsConfig,
} from "@/lib/resources";

const SOURCES: ResourceConfig[] = [
  projectsConfig,
  activitiesConfig,
  milestonesConfig,
  beneficiariesConfig,
  evaluationsConfig,
  internshipsConfig,
  membersConfig,
  departementsConfig,
];

export default function ReportsExportPage() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const download = async (config: ResourceConfig) => {
    setBusy(config.basePath);
    setError("");

    try {
      const rows = await listItems(config);
      exportCsv(`${config.basePath.replace("/", "")}-${new Date().toISOString().slice(0, 10)}.csv`, config.fields, rows);
    } catch (err) {
      setError(errorMessage(err, `Export de « ${config.title} » impossible (accès refusé ?).`));
    } finally {
      setBusy("");
    }
  };

  /** Télécharge tous les CSV l'un après l'autre (le navigateur peut demander d'autoriser les téléchargements multiples) */
  const downloadAll = async () => {
    setBusy("ALL");
    setError("");

    const failed: string[] = [];
    const stamp = new Date().toISOString().slice(0, 10);

    for (const config of SOURCES) {
      try {
        const rows = await listItems(config);
        exportCsv(`${config.basePath.replace("/", "")}-${stamp}.csv`, config.fields, rows);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch {
        failed.push(config.title);
      }
    }

    if (failed.length > 0) {
      setError(`Export impossible pour : ${failed.join(", ")} (accès refusé ?).`);
    }

    setBusy("");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exports de données</h1>
            <p className="text-sm text-gray-500">Fichiers CSV (ouvrables dans Excel) construits à partir de la base de données.</p>
          </div>

          <button
            type="button"
            onClick={downloadAll}
            disabled={busy !== ""}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:opacity-60"
          >
            {busy === "ALL" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy === "ALL" ? "Téléchargement..." : `Télécharger tout (${SOURCES.length})`}
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SOURCES.map((config) => (
            <button
              key={config.basePath}
              type="button"
              onClick={() => download(config)}
              disabled={busy !== ""}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md disabled:opacity-60"
            >
              <span>
                <span className="block font-semibold text-gray-900">{config.title}</span>
                <span className="text-xs text-gray-500">Télécharger en CSV</span>
              </span>
              <Download className="h-5 w-5 text-blue-700" />
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
