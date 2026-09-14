"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Save,
} from "lucide-react";

import {
  Internship,
  InternshipStatus,
  InternshipType,
  getInternshipById,
  updateInternship,
} from "@/lib/internships";

const statuses: InternshipStatus[] = [
  "En attente",
  "En cours",
  "Terminé",
  "Annulé",
];

const types: InternshipType[] = [
  "Académique",
  "Professionnel",
  "Stage de fin d'études",
  "Stage d'observation",
];

export default function EditInternshipPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [internship, setInternship] =
    useState<Internship | null>(null);

  useEffect(() => {
    const data = getInternshipById(id);

    setInternship(data ?? null);
  }, [id]);

  if (!internship) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="rounded-xl bg-white p-10 text-center">
          <p>Stage introuvable.</p>
        </div>
      </main>
    );
  }

  function update(
    field: keyof Internship,
    value: string
  ) {
    setInternship((previous) =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (
      !internship.internName ||
      !internship.institution ||
      !internship.field ||
      !internship.department ||
      !internship.supervisor
    ) {
      alert(
        "Veuillez remplir les champs obligatoires."
      );

      return;
    }

    updateInternship(internship.id, internship);

    router.push(
      `/internships/${internship.id}`
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={`/internships/${internship.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au stage
        </Link>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Modifier le stage
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {internship.reference}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                label="Nom complet *"
                value={internship.internName}
                onChange={(value) =>
                  update("internName", value)
                }
              />

              <Field
                label="Email"
                value={internship.internEmail}
                onChange={(value) =>
                  update("internEmail", value)
                }
              />

              <Field
                label="Téléphone"
                value={internship.phone}
                onChange={(value) =>
                  update("phone", value)
                }
              />

              <Field
                label="Établissement *"
                value={internship.institution}
                onChange={(value) =>
                  update("institution", value)
                }
              />

              <Field
                label="Niveau"
                value={internship.level}
                onChange={(value) =>
                  update("level", value)
                }
              />

              <Field
                label="Domaine"
                value={internship.field}
                onChange={(value) =>
                  update("field", value)
                }
              />

              <Select
                label="Type"
                value={internship.type}
                options={types}
                onChange={(value) =>
                  update(
                    "type",
                    value
                  )
                }
              />

              <Select
                label="Statut"
                value={internship.status}
                options={statuses}
                onChange={(value) =>
                  update(
                    "status",
                    value
                  )
                }
              />

              <Field
                label="Département"
                value={internship.department}
                onChange={(value) =>
                  update(
                    "department",
                    value
                  )
                }
              />

              <Field
                label="Superviseur"
                value={internship.supervisor}
                onChange={(value) =>
                  update(
                    "supervisor",
                    value
                  )
                }
              />

              <Field
                label="Projet"
                value={internship.projectName ?? ""}
                onChange={(value) =>
                  update(
                    "projectName",
                    value
                  )
                }
              />

              <Field
                label="Date de début"
                type="date"
                value={internship.startDate}
                onChange={(value) =>
                  update(
                    "startDate",
                    value
                  )
                }
              />

              <Field
                label="Date de fin"
                type="date"
                value={internship.endDate}
                onChange={(value) =>
                  update(
                    "endDate",
                    value
                  )
                }
              />
            </div>

            <TextArea
              label="Objectifs"
              value={internship.objectives}
              onChange={(value) =>
                update("objectives", value)
              }
            />

            <TextArea
              label="Missions / tâches"
              value={internship.tasks}
              onChange={(value) =>
                update("tasks", value)
              }
            />

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
              <Link
                href={`/internships/${internship.id}`}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Link>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                Enregistrer
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <textarea
        rows={5}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}