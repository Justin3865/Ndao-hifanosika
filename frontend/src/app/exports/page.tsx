"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { getStoredRole } from "@/lib/access";
import api from "@/lib/axios";
import { LookupItem, errorMessage, fetchLookup } from "@/lib/crud";
import { EXPORT_LABEL, exportableDatasets, saveBlob } from "@/lib/gaps";

export default function ExportsPage() {
  const [role, setRole] = useState("");
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    setRole(getStoredRole());
    fetchLookup("projects").then(setProjects).catch(() => setProjects([]));
  }, []);

  const datasets = exportableDatasets(role);
  const anonymized = role.toUpperCase() === "COMMUNICATION";

  const download = async (dataset: string) => {
    setBusy(dataset);
    setError("");
    setInfo("");
    try {
      const res = await api.get("/exports/json", {
        params: { dataset, ...(projectId ? { projectId } : {}) },
        responseType: "blob",
      });
      saveBlob(res.data as Blob, `export-${dataset}.json`);
      setInfo(`Export « ${EXPORT_LABEL[dataset] ?? dataset} » téléchargé.`);
    } catch (err) {
      setError(errorMessage(err, "Export impossible."));
    } finally {
      setBusy("");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export des données (JSON)</h1>
          <p className="text-sm text-gray-500">
            Format standard et portable pour les bailleurs et les outils externes. Pour les PDF et Excel, utilisez la rubrique Rapports.
          </p>
        </div>

        {anonymized && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Vos exports sont pseudonymisés : aucun nom, contact, pièce d&apos;identité ni position GPS n&apos;est inclus.
          </div>
        )}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        <label className="block text-sm sm:max-w-sm">
          <span className="mb-1 block font-medium text-gray-700">Limiter à un projet (facultatif)</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Tous les projets autorisés</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => download(d)}
              disabled={busy !== ""}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
            >
              <span className="font-medium text-gray-900">{EXPORT_LABEL[d] ?? d}</span>
              {busy === d ? <Loader2 className="h-5 w-5 animate-spin text-blue-700" /> : <Download className="h-5 w-5 text-blue-700" />}
            </button>
          ))}
          {datasets.length === 0 && <p className="text-sm text-gray-500">Aucun export disponible pour votre rôle.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
