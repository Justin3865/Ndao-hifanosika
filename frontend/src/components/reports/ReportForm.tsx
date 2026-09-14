"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save, X, Plus, Trash2 } from "lucide-react";
import type { Report, ReportStatus } from "./ReportTable";

interface ReportFormProps {
  initialData?: Partial<Report>;
  onSubmit: (data: ReportFormData) => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export interface ReportFormData {
  title: string;
  project: string;
  period: string;
  type: string;
  status: ReportStatus;
  description: string;
  author: string;
  beneficiaries: number;
  completionRate: number;
  objectives: string[];
  results: string[];
}

const projects = [
  "Maison Digitale",
  "Kids Preneur",
  "Ankizy Innov",
  "Otrikasa",
];

const reportTypes = [
  "Rapport mensuel",
  "Rapport trimestriel",
  "Rapport semestriel",
  "Rapport annuel",
  "Rapport bailleur",
  "Rapport S&E",
];

export default function ReportForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: ReportFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [project, setProject] = useState(initialData?.project ?? "");
  const [period, setPeriod] = useState(initialData?.period ?? "");
  const [type, setType] = useState(initialData?.type ?? "");
  const [status, setStatus] = useState<ReportStatus>(
    initialData?.status ?? "draft"
  );
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [author, setAuthor] = useState(initialData?.author ?? "");
  const [beneficiaries, setBeneficiaries] = useState(
    initialData?.totalBeneficiaries ?? 0
  );
  const [completionRate, setCompletionRate] = useState(
    initialData?.completionRate ?? 0
  );

  const [objectives, setObjectives] = useState<string[]>([""]);
  const [results, setResults] = useState<string[]>([""]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title ?? "");
      setProject(initialData.project ?? "");
      setPeriod(initialData.period ?? "");
      setType(initialData.type ?? "");
      setStatus(initialData.status ?? "draft");
      setDescription(initialData.description ?? "");
      setAuthor(initialData.author ?? "");
      setBeneficiaries(initialData.totalBeneficiaries ?? 0);
      setCompletionRate(initialData.completionRate ?? 0);
    }
  }, [initialData]);

  const updateObjective = (index: number, value: string) => {
    setObjectives((items) =>
      items.map((item, i) => (i === index ? value : item))
    );
  };

  const removeObjective = (index: number) => {
    setObjectives((items) => items.filter((_, i) => i !== index));
  };

  const updateResult = (index: number, value: string) => {
    setResults((items) =>
      items.map((item, i) => (i === index ? value : item))
    );
  };

  const removeResult = (index: number) => {
    setResults((items) => items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("Le titre du rapport est obligatoire.");
      return;
    }

    if (!project) {
      alert("Veuillez sélectionner un projet.");
      return;
    }

    if (!period.trim()) {
      alert("La période est obligatoire.");
      return;
    }

    await onSubmit({
      title,
      project,
      period,
      type,
      status,
      description,
      author,
      beneficiaries,
      completionRate,
      objectives: objectives.filter(Boolean),
      results: results.filter(Boolean),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {initialData?.id
            ? "Modifier le rapport"
            : "Créer un rapport"}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Renseignez les informations du rapport S&E.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Titre *
          </label>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Rapport trimestriel Q2"
            className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Projet *
          </label>

          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full rounded-lg border bg-white px-3 py-2.5 outline-none focus:border-blue-500"
          >
            <option value="">Sélectionner</option>
            {projects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Période *
          </label>

          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Ex : Janvier - Mars 2026"
            className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Type de rapport
          </label>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border bg-white px-3 py-2.5 outline-none focus:border-blue-500"
          >
            <option value="">Sélectionner</option>
            {reportTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Statut
          </label>

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as ReportStatus)
            }
            className="w-full rounded-lg border bg-white px-3 py-2.5 outline-none focus:border-blue-500"
          >
            <option value="draft">Brouillon</option>
            <option value="generated">Généré</option>
            <option value="validated">Validé</option>
            <option value="archived">Archivé</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Auteur
          </label>

          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Nom du responsable"
            className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Nombre de bénéficiaires
          </label>

          <input
            type="number"
            min={0}
            value={beneficiaries}
            onChange={(e) =>
              setBeneficiaries(Number(e.target.value))
            }
            className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Taux de réalisation (%)
          </label>

          <input
            type="number"
            min={0}
            max={100}
            value={completionRate}
            onChange={(e) =>
              setCompletionRate(Number(e.target.value))
            }
            className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Description
        </label>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Description générale du rapport..."
          className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Objectifs</h3>
            <p className="text-xs text-gray-500">
              Objectifs couverts par le rapport.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setObjectives([...objectives, ""])}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-600 hover:bg-blue-100"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>

        <div className="space-y-2">
          {objectives.map((objective, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={objective}
                onChange={(e) =>
                  updateObjective(index, e.target.value)
                }
                placeholder={`Objectif ${index + 1}`}
                className="flex-1 rounded-lg border px-3 py-2"
              />

              {objectives.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeObjective(index)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Résultats</h3>
            <p className="text-xs text-gray-500">
              Principaux résultats obtenus.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setResults([...results, ""])}
            className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 hover:bg-green-100"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>

        <div className="space-y-2">
          {results.map((result, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={result}
                onChange={(e) =>
                  updateResult(index, e.target.value)
                }
                placeholder={`Résultat ${index + 1}`}
                className="flex-1 rounded-lg border px-3 py-2"
              />

              {results.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeResult(index)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3 border-t pt-5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Annuler
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}