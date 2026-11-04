"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  ResourceConfig,
  errorMessage,
  exportCsv,
  exportXlsx,
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
  const { t } = useI18n();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const download = async (config: ResourceConfig, format: "csv" | "xlsx" = "csv") => {
    setBusy(config.basePath);
    setError("");

    try {
      const rows = await listItems(config);
      const base = `${config.basePath.replace("/", "")}-${new Date().toISOString().slice(0, 10)}`;
      if (format === "xlsx") exportXlsx(`${base}.xlsx`, config.fields, rows, config.title);
      else exportCsv(`${base}.csv`, config.fields, rows);
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
            <h1 className="text-2xl font-bold text-gray-900">{t("export.title")}</h1>
            <p className="text-sm text-gray-500">{t("export.subtitle")}</p>
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
            <div
              key={config.basePath}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <span className="block font-semibold text-gray-900">{config.title}</span>
              <span className="text-xs text-gray-500">{t("export.hint")}</span>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => download(config, "xlsx")}
                  disabled={busy !== ""}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" /> Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => download(config, "csv")}
                  disabled={busy !== ""}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" /> CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
