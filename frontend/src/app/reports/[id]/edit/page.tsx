"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  FileText,
  CalendarDays,
  Building2,
  Landmark,
  Users,
  Target,
  Wallet,
  CheckCircle2,
} from "lucide-react";

import {
  getReportById,
  updateReport,
  Report,
  ReportType,
  ReportStatus,
  ReportFormat,
  Department,
} from "@/lib/reports";

const REPORT_TYPES: ReportType[] = [
  "Projet",
  "Direction",
  "D├®partement",
  "Bailleur",
  "B├®n├®ficiaires",
  "├ëquipes",
  "├ëvaluation",
  "Impact",
];

const REPORT_STATUSES: ReportStatus[] = [
  "Brouillon",
  "En pr├®paration",
  "G├®n├®r├®",
  "Valid├®",
  "Envoy├®",
];

const REPORT_FORMATS: ReportFormat[] = [
  "PDF",
  "Excel",
  "PDF + Excel",
];

const DEPARTMENTS: Department[] = [
  "Direction",
  "DSI",
  "DAF",
  "Communication",
  "RH",
];

export default function ReportEditPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existingReport = getReportById(id);

    if (existingReport) {
      setReport(existingReport);
    }

    setLoading(false);
  }, [id]);

  function handleChange(
    field: keyof Report,
    value: string | number
  ) {
    setReport((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function handleNumberChange(
    field: keyof Report,
    value: string
  ) {
    const numberValue =
      value === "" ? 0 : Number(value);

    handleChange(field, numberValue);
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!report) {
      return;
    }

    setError("");

    if (!report.titre.trim()) {
      setError("Le titre du rapport est obligatoire.");
      return;
    }

    if (!report.periodeDebut) {
      setError("La date de début est obligatoire.");
      return;
    }

    if (!report.periodeFin) {
      setError("La date de fin est obligatoire.");
      return;
    }

    if (
      new Date(report.periodeFin) <
      new Date(report.periodeDebut)
    ) {
      setError(
        "La date de fin doit être postérieure ou égale à la date de début."
      );
      return;
    }

    if (report.tauxCompletion < 0 || report.tauxCompletion > 100) {
      setError(
        "Le taux de complétion doit être compris entre 0 et 100."
      );
      return;
    }

    if (report.tauxReussite < 0 || report.tauxReussite > 100) {
      setError(
        "Le taux de réussite doit être compris entre 0 et 100."
      );
      return;
    }

    if (report.satisfaction < 0 || report.satisfaction > 100) {
      setError(
        "Le taux de satisfaction doit être compris entre 0 et 100."
      );
      return;
    }

    setSaving(true);

    try {
      const updated = updateReport(report.id, {
        titre: report.titre,
        description: report.description,

        type: report.type,
        statut: report.statut,
        format: report.format,

        projectId: report.projectId,
        projectName: report.projectName,

        department: report.department,
        bailleur: report.bailleur,

        periodeDebut: report.periodeDebut,
        periodeFin: report.periodeFin,

        auteur: report.auteur,

        nombreBeneficiaires:
          report.nombreBeneficiaires,

        nombreBeneficiairesActifs:
          report.nombreBeneficiairesActifs,

        tauxCompletion:
          report.tauxCompletion,

        tauxReussite:
          report.tauxReussite,

        nombreActivites:
          report.nombreActivites,

        nombreActivitesRealisees:
          report.nombreActivitesRealisees,

        nombreMembres:
          report.nombreMembres,

        performanceEquipe:
          report.performanceEquipe,

        satisfaction:
          report.satisfaction,

        budgetPrevisionnel:
          report.budgetPrevisionnel,

        budgetUtilise:
          report.budgetUtilise,

        resumeNarratif:
          report.resumeNarratif,

        observations:
          report.observations,
      });

      if (!updated) {
        setError(
          "Impossible de modifier ce rapport."
        );
        setSaving(false);
        return;
      }

      router.push(`/reports/${report.id}`);
      router.refresh();
    } catch {
      setError(
        "Une erreur est survenue pendant l'enregistrement."
      );
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">
              Chargement du rapport...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-10 text-center shadow-sm">
          <FileText
            size={48}
            className="mx-auto text-gray-300"
          />

          <h1 className="mt-4 text-xl font-bold text-gray-900">
            Rapport introuvable
          </h1>

          <p className="mt-2 text-gray-500">
            Le rapport demandé n'existe pas ou a été supprimé.
          </p>

          <Link
            href="/reports"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            <ArrowLeft size={18} />
            Retour aux rapports
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/reports/${report.id}`}
              className="rounded-lg border bg-white p-2 hover:bg-gray-50"
              title="Retour"
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <p className="text-sm text-gray-500">
                {report.reference}
              </p>

              <h1 className="text-2xl font-bold text-gray-900">
                Modifier le rapport
              </h1>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
            {report.reference}
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* INFORMATIONS GENERALES */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <FileText
                size={21}
                className="text-blue-600"
              />

              <h2 className="text-lg font-semibold">
                Informations générales
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <Field
                label="Titre du rapport"
                required
                className="md:col-span-2"
              >
                <input
                  type="text"
                  value={report.titre}
                  onChange={(e) =>
                    handleChange(
                      "titre",
                      e.target.value
                    )
                  }
                  className="input"
                  placeholder="Titre du rapport"
                />
              </Field>

              <Field
                label="Type de rapport"
                required
              >
                <select
                  value={report.type}
                  onChange={(e) =>
                    handleChange(
                      "type",
                      e.target.value as ReportType
                    )
                  }
                  className="input"
                >
                  {REPORT_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Statut"
                required
              >
                <select
                  value={report.statut}
                  onChange={(e) =>
                    handleChange(
                      "statut",
                      e.target.value as ReportStatus
                    )
                  }
                  className="input"
                >
                  {REPORT_STATUSES.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Format"
                required
              >
                <select
                  value={report.format}
                  onChange={(e) =>
                    handleChange(
                      "format",
                      e.target.value as ReportFormat
                    )
                  }
                  className="input"
                >
                  {REPORT_FORMATS.map(
                    (format) => (
                      <option
                        key={format}
                        value={format}
                      >
                        {format}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Auteur">
                <input
                  type="text"
                  value={report.auteur}
                  onChange={(e) =>
                    handleChange(
                      "auteur",
                      e.target.value
                    )
                  }
                  className="input"
                />
              </Field>

              <Field
                label="Description"
                className="md:col-span-2"
              >
                <textarea
                  value={report.description}
                  onChange={(e) =>
                    handleChange(
                      "description",
                      e.target.value
                    )
                  }
                  rows={4}
                  className="input resize-y"
                  placeholder="Description du rapport..."
                />
              </Field>
            </div>
          </section>

          {/* PROJET / BAILLEUR */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Building2
                size={21}
                className="text-blue-600"
              />

              <h2 className="text-lg font-semibold">
                Projet et bailleur
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <Field label="Projet">
                <input
                  type="text"
                  value={report.projectName}
                  onChange={(e) =>
                    handleChange(
                      "projectName",
                      e.target.value
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="ID Projet">
                <input
                  type="text"
                  value={report.projectId}
                  onChange={(e) =>
                    handleChange(
                      "projectId",
                      e.target.value
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="Bailleur">
                <div className="relative">
                  <Landmark
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    value={report.bailleur}
                    onChange={(e) =>
                      handleChange(
                        "bailleur",
                        e.target.value
                      )
                    }
                    className="input pl-10"
                    placeholder="Nom du bailleur"
                  />
                </div>
              </Field>

              <Field label="Département">
                <select
                  value={report.department}
                  onChange={(e) =>
                    handleChange(
                      "department",
                      e.target.value as
                        | Department
                        | "Tous"
                    )
                  }
                  className="input"
                >
                  <option value="Tous">
                    Tous
                  </option>

                  {DEPARTMENTS.map(
                    (department) => (
                      <option
                        key={department}
                        value={department}
                      >
                        {department}
                      </option>
                    )
                  )}
                </select>
              </Field>
            </div>
          </section>

          {/* PERIODE */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <CalendarDays
                size={21}
                className="text-blue-600"
              />

              <h2 className="text-lg font-semibold">
                Période du rapport
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <Field
                label="Date de début"
                required
              >
                <input
                  type="date"
                  value={report.periodeDebut}
                  onChange={(e) =>
                    handleChange(
                      "periodeDebut",
                      e.target.value
                    )
                  }
                  className="input"
                />
              </Field>

              <Field
                label="Date de fin"
                required
              >
                <input
                  type="date"
                  value={report.periodeFin}
                  onChange={(e) =>
                    handleChange(
                      "periodeFin",
                      e.target.value
                    )
                  }
                  className="input"
                />
              </Field>
            </div>
          </section>

          {/* INDICATEURS */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Target
                size={21}
                className="text-blue-600"
              />

              <h2 className="text-lg font-semibold">
                Indicateurs de performance
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

              <NumberField
                label="Nombre de bénéficiaires"
                value={report.nombreBeneficiaires}
                onChange={(value) =>
                  handleNumberChange(
                    "nombreBeneficiaires",
                    value
                  )
                }
                icon={
                  <Users size={18} />
                }
              />

              <NumberField
                label="Bénéficiaires actifs"
                value={
                  report.nombreBeneficiairesActifs
                }
                onChange={(value) =>
                  handleNumberChange(
                    "nombreBeneficiairesActifs",
                    value
                  )
                }
                icon={
                  <Users size={18} />
                }
              />

              <NumberField
                label="Taux de complétion (%)"
                value={report.tauxCompletion}
                onChange={(value) =>
                  handleNumberChange(
                    "tauxCompletion",
                    value
                  )
                }
                min={0}
                max={100}
              />

              <NumberField
                label="Taux de réussite (%)"
                value={report.tauxReussite}
                onChange={(value) =>
                  handleNumberChange(
                    "tauxReussite",
                    value
                  )
                }
                min={0}
                max={100}
              />

              <NumberField
                label="Activités prévues"
                value={report.nombreActivites}
                onChange={(value) =>
                  handleNumberChange(
                    "nombreActivites",
                    value
                  )
                }
              />

              <NumberField
                label="Activités réalisées"
                value={
                  report.nombreActivitesRealisees
                }
                onChange={(value) =>
                  handleNumberChange(
                    "nombreActivitesRealisees",
                    value
                  )
                }
              />

              <NumberField
                label="Nombre de membres"
                value={report.nombreMembres}
                onChange={(value) =>
                  handleNumberChange(
                    "nombreMembres",
                    value
                  )
                }
              />

              <NumberField
                label="Performance équipe (%)"
                value={report.performanceEquipe}
                onChange={(value) =>
                  handleNumberChange(
                    "performanceEquipe",
                    value
                  )
                }
                min={0}
                max={100}
              />

              <NumberField
                label="Satisfaction (%)"
                value={report.satisfaction}
                onChange={(value) =>
                  handleNumberChange(
                    "satisfaction",
                    value
                  )
                }
                min={0}
                max={100}
              />
            </div>
          </section>

          {/* BUDGET */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Wallet
                size={21}
                className="text-blue-600"
              />

              <h2 className="text-lg font-semibold">
                Budget
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <NumberField
                label="Budget prévisionnel (Ar)"
                value={
                  report.budgetPrevisionnel
                }
                onChange={(value) =>
                  handleNumberChange(
                    "budgetPrevisionnel",
                    value
                  )
                }
                min={0}
              />

              <NumberField
                label="Budget utilisé (Ar)"
                value={
                  report.budgetUtilise
                }
                onChange={(value) =>
                  handleNumberChange(
                    "budgetUtilise",
                    value
                  )
                }
                min={0}
              />
            </div>
          </section>

          {/* SYNTHESE */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <FileText
                size={21}
                className="text-blue-600"
              />

              <h2 className="text-lg font-semibold">
                Synthèse et recommandations
              </h2>
            </div>

            <div className="space-y-5">

              <Field label="Synthèse narrative">
                <textarea
                  value={report.resumeNarratif}
                  onChange={(e) =>
                    handleChange(
                      "resumeNarratif",
                      e.target.value
                    )
                  }
                  rows={7}
                  className="input resize-y"
                  placeholder="Saisissez la synthèse narrative..."
                />
              </Field>

              <Field label="Observations et recommandations">
                <textarea
                  value={report.observations}
                  onChange={(e) =>
                    handleChange(
                      "observations",
                      e.target.value
                    )
                  }
                  rows={7}
                  className="input resize-y"
                  placeholder="Saisissez les observations et recommandations..."
                />
              </Field>
            </div>
          </section>

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/reports/${report.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Enregistrer les modifications
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(209 213 219);
          background: white;
          padding: 0.625rem 0.75rem;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
        }

        .input:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 2px rgb(59 130 246 / 0.1);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  required = false,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  icon,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}

        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className={`input ${
            icon ? "pl-10" : ""
          }`}
        />
      </div>
    </div>
  );
}