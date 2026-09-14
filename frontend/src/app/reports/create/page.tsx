"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Save,
  FileText,
} from "lucide-react";
import {
  FormEvent,
  useState,
} from "react";

import {
  createReport,
  ReportType,
  ReportStatus,
  ReportFormat,
} from "@/lib/reports";

const projects = [
  {
    id: "PRJ-001",
    name: "Maison Digitale",
  },
  {
    id: "PRJ-002",
    name: "Kids Preneur",
  },
  {
    id: "PRJ-003",
    name: "Ankizy Innov",
  },
  {
    id: "PRJ-004",
    name: "Otrikasa",
  },
];

export default function CreateReportPage() {
  const [form, setForm] =
    useState({
      titre: "",
      description: "",

      type: "Projet" as ReportType,

      statut:
        "Brouillon" as ReportStatus,

      format:
        "PDF + Excel" as ReportFormat,

      projectId: "PRJ-001",

      department: "Tous" as
        | "Tous"
        | "Direction"
        | "DSI"
        | "DAF"
        | "Communication"
        | "RH",

      bailleur: "",

      periodeDebut: "",
      periodeFin: "",

      auteur: "",

      nombreBeneficiaires: 0,
      nombreBeneficiairesActifs: 0,

      tauxCompletion: 0,
      tauxReussite: 0,

      nombreActivites: 0,
      nombreActivitesRealisees: 0,

      nombreMembres: 0,
      performanceEquipe: 0,

      satisfaction: 0,

      budgetPrevisionnel: 0,
      budgetUtilise: 0,

      resumeNarratif: "",
      observations: "",
    });

  function update(
    field: string,
    value: string | number
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const project =
      projects.find(
        (p) =>
          p.id ===
          form.projectId
      );

    createReport({
      titre: form.titre,
      description:
        form.description,

      type: form.type,
      statut: form.statut,
      format: form.format,

      projectId: form.projectId,
      projectName:
        project?.name ??
        "Tous les projets",

      department:
        form.department,

      bailleur:
        form.bailleur ||
        "Tous",

      periodeDebut:
        form.periodeDebut,

      periodeFin:
        form.periodeFin,

      dateCreation:
        new Date()
          .toISOString()
          .split("T")[0],

      dateGeneration: "",

      auteur:
        form.auteur,

      nombreBeneficiaires:
        Number(
          form.nombreBeneficiaires
        ),

      nombreBeneficiairesActifs:
        Number(
          form.nombreBeneficiairesActifs
        ),

      tauxCompletion:
        Number(
          form.tauxCompletion
        ),

      tauxReussite:
        Number(
          form.tauxReussite
        ),

      nombreActivites:
        Number(
          form.nombreActivites
        ),

      nombreActivitesRealisees:
        Number(
          form.nombreActivitesRealisees
        ),

      nombreMembres:
        Number(
          form.nombreMembres
        ),

      performanceEquipe:
        Number(
          form.performanceEquipe
        ),

      satisfaction:
        Number(
          form.satisfaction
        ),

      budgetPrevisionnel:
        Number(
          form.budgetPrevisionnel
        ),

      budgetUtilise:
        Number(
          form.budgetUtilise
        ),

      indicateurs: [],

      resumeNarratif:
        form.resumeNarratif,

      observations:
        form.observations,
    });

    window.location.href =
      "/reports";
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">

      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center gap-3">

          <Link
            href="/reports"
            className="rounded-lg border bg-white p-2"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold">
              Créer un rapport
            </h1>

            <p className="text-sm text-gray-500">
              Générer un reporting personnalisé.
            </p>
          </div>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* Général */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <FileText size={20} />
              Informations générales
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Input
                label="Titre du rapport"
                required
                value={form.titre}
                onChange={(v) =>
                  update(
                    "titre",
                    v
                  )
                }
              />

              <Input
                label="Auteur"
                value={form.auteur}
                onChange={(v) =>
                  update(
                    "auteur",
                    v
                  )
                }
              />

              <Select
                label="Type"
                value={form.type}
                onChange={(v) =>
                  update(
                    "type",
                    v
                  )
                }
                options={[
                  "Projet",
                  "Direction",
                  "Département",
                  "Bailleur",
                  "Bénéficiaires",
                  "Équipes",
                  "Évaluation",
                  "Impact",
                ]}
              />

              <Select
                label="Format"
                value={form.format}
                onChange={(v) =>
                  update(
                    "format",
                    v
                  )
                }
                options={[
                  "PDF",
                  "Excel",
                  "PDF + Excel",
                ]}
              />

              <div className="md:col-span-2">

                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    update(
                      "description",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                />

              </div>

            </div>
          </section>

          {/* Périmètre */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Périmètre du reporting
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Select
                label="Projet / programme"
                value={
                  form.projectId
                }
                onChange={(v) =>
                  update(
                    "projectId",
                    v
                  )
                }
                options={projects.map(
                  (p) =>
                    p.id
                )}
                labels={projects.map(
                  (p) =>
                    p.name
                )}
              />

              <Select
                label="Département"
                value={
                  form.department
                }
                onChange={(v) =>
                  update(
                    "department",
                    v
                  )
                }
                options={[
                  "Tous",
                  "Direction",
                  "DSI",
                  "DAF",
                  "Communication",
                  "RH",
                ]}
              />

              <Input
                label="Bailleur / partenaire"
                value={
                  form.bailleur
                }
                onChange={(v) =>
                  update(
                    "bailleur",
                    v
                  )
                }
              />

              <Select
                label="Statut"
                value={
                  form.statut
                }
                onChange={(v) =>
                  update(
                    "statut",
                    v
                  )
                }
                options={[
                  "Brouillon",
                  "En préparation",
                  "Généré",
                  "Validé",
                  "Envoyé",
                ]}
              />

            </div>
          </section>

          {/* Période */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Période
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Input
                label="Date de début"
                type="date"
                value={
                  form.periodeDebut
                }
                onChange={(v) =>
                  update(
                    "periodeDebut",
                    v
                  )
                }
              />

              <Input
                label="Date de fin"
                type="date"
                value={
                  form.periodeFin
                }
                onChange={(v) =>
                  update(
                    "periodeFin",
                    v
                  )
                }
              />

            </div>
          </section>

          {/* Indicateurs */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Indicateurs de suivi
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <NumberInput
                label="Nombre de bénéficiaires"
                value={
                  form.nombreBeneficiaires
                }
                onChange={(v) =>
                  update(
                    "nombreBeneficiaires",
                    v
                  )
                }
              />

              <NumberInput
                label="Bénéficiaires actifs"
                value={
                  form.nombreBeneficiairesActifs
                }
                onChange={(v) =>
                  update(
                    "nombreBeneficiairesActifs",
                    v
                  )
                }
              />

              <NumberInput
                label="Taux de complétion (%)"
                value={
                  form.tauxCompletion
                }
                onChange={(v) =>
                  update(
                    "tauxCompletion",
                    v
                  )
                }
              />

              <NumberInput
                label="Taux de réussite (%)"
                value={
                  form.tauxReussite
                }
                onChange={(v) =>
                  update(
                    "tauxReussite",
                    v
                  )
                }
              />

              <NumberInput
                label="Activités prévues"
                value={
                  form.nombreActivites
                }
                onChange={(v) =>
                  update(
                    "nombreActivites",
                    v
                  )
                }
              />

              <NumberInput
                label="Activités réalisées"
                value={
                  form.nombreActivitesRealisees
                }
                onChange={(v) =>
                  update(
                    "nombreActivitesRealisees",
                    v
                  )
                }
              />

              <NumberInput
                label="Nombre de membres"
                value={
                  form.nombreMembres
                }
                onChange={(v) =>
                  update(
                    "nombreMembres",
                    v
                  )
                }
              />

              <NumberInput
                label="Performance équipe (%)"
                value={
                  form.performanceEquipe
                }
                onChange={(v) =>
                  update(
                    "performanceEquipe",
                    v
                  )
                }
              />

              <NumberInput
                label="Satisfaction (%)"
                value={
                  form.satisfaction
                }
                onChange={(v) =>
                  update(
                    "satisfaction",
                    v
                  )
                }
              />

            </div>
          </section>

          {/* Budget */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Budget indicatif
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <NumberInput
                label="Budget prévisionnel (Ar)"
                value={
                  form.budgetPrevisionnel
                }
                onChange={(v) =>
                  update(
                    "budgetPrevisionnel",
                    v
                  )
                }
              />

              <NumberInput
                label="Budget utilisé (Ar)"
                value={
                  form.budgetUtilise
                }
                onChange={(v) =>
                  update(
                    "budgetUtilise",
                    v
                  )
                }
              />

            </div>
          </section>

          {/* Synthèse */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Synthèse narrative
            </h2>

            <textarea
              rows={6}
              value={
                form.resumeNarratif
              }
              onChange={(e) =>
                update(
                  "resumeNarratif",
                  e.target.value
                )
              }
              placeholder="Résumé des activités, résultats et principaux constats..."
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            />

            <label className="mb-2 mt-5 block text-sm font-medium">
              Observations
            </label>

            <textarea
              rows={5}
              value={
                form.observations
              }
              onChange={(e) =>
                update(
                  "observations",
                  e.target.value
                )
              }
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            />

          </section>

          <div className="flex justify-end gap-3">

            <Link
              href="/reports"
              className="rounded-lg border bg-white px-5 py-2.5 font-medium"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              <Save size={18} />
              Enregistrer
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required && (
          <span className="text-red-500">
            {" "}*
          </span>
        )}
      </label>

      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (
    value: number
  ) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
      </label>

      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) =>
          onChange(
            Number(
              e.target.value
            )
          )
        }
        className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  options: string[];
  labels?: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-lg border px-3 py-2.5"
      >
        {options.map(
          (option, index) => (
            <option
              key={option}
              value={option}
            >
              {labels?.[index] ??
                option}
            </option>
          )
        )}
      </select>
    </div>
  );
}