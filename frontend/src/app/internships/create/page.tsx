"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Save,
} from "lucide-react";

import {
  createInternship,
  InternshipType,
} from "@/lib/internships";

const types: InternshipType[] = [
  "Académique",
  "Professionnel",
  "Stage de fin d'études",
  "Stage d'observation",
];

export default function CreateInternshipPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    internName: "",
    internEmail: "",
    phone: "",
    institution: "",
    level: "",
    field: "",
    type: "Académique" as InternshipType,
    department: "",
    supervisor: "",
    projectName: "",
    projectId: "",
    startDate: "",
    endDate: "",
    objectives: "",
    tasks: "",
    status: "En attente" as const,
    certificateIssued: false,
  });

  const [saving, setSaving] = useState(false);

  function updateField(
    field: string,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (
      !form.internName ||
      !form.institution ||
      !form.field ||
      !form.department ||
      !form.supervisor ||
      !form.startDate ||
      !form.endDate
    ) {
      alert(
        "Veuillez remplir tous les champs obligatoires."
      );

      return;
    }

    if (form.endDate < form.startDate) {
      alert(
        "La date de fin doit être postérieure à la date de début."
      );

      return;
    }

    setSaving(true);

    const internship = createInternship(form);

    router.push(`/internships/${internship.id}`);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/internships"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux stages
        </Link>

        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <Briefcase className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Nouveau stage
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Enregistrer un nouveau stagiaire.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-8 p-6"
          >
            <FormSection title="Informations du stagiaire">
              <Input
                label="Nom complet *"
                value={form.internName}
                onChange={(value) =>
                  updateField("internName", value)
                }
                placeholder="Nom et prénom"
              />

              <Input
                label="Email"
                type="email"
                value={form.internEmail}
                onChange={(value) =>
                  updateField("internEmail", value)
                }
                placeholder="email@example.com"
              />

              <Input
                label="Téléphone"
                value={form.phone}
                onChange={(value) =>
                  updateField("phone", value)
                }
                placeholder="+261..."
              />

              <Input
                label="Établissement *"
                value={form.institution}
                onChange={(value) =>
                  updateField("institution", value)
                }
                placeholder="Université / École"
              />

              <Input
                label="Niveau *"
                value={form.level}
                onChange={(value) =>
                  updateField("level", value)
                }
                placeholder="Licence 3, Master 2..."
              />

              <Input
                label="Domaine / Filière *"
                value={form.field}
                onChange={(value) =>
                  updateField("field", value)
                }
                placeholder="Informatique, Gestion..."
              />
            </FormSection>

            <FormSection title="Informations du stage">
              <Select
                label="Type de stage"
                value={form.type}
                options={types}
                onChange={(value) =>
                  updateField("type", value)
                }
              />

              <Input
                label="Département *"
                value={form.department}
                onChange={(value) =>
                  updateField("department", value)
                }
                placeholder="DSI, DAF, RH..."
              />

              <Input
                label="Encadreur / Superviseur *"
                value={form.supervisor}
                onChange={(value) =>
                  updateField("supervisor", value)
                }
                placeholder="Nom du responsable"
              />

              <Input
                label="Projet"
                value={form.projectName}
                onChange={(value) =>
                  updateField("projectName", value)
                }
                placeholder="Maison Digitale..."
              />

              <Input
                label="Date de début *"
                type="date"
                value={form.startDate}
                onChange={(value) =>
                  updateField("startDate", value)
                }
              />

              <Input
                label="Date de fin *"
                type="date"
                value={form.endDate}
                onChange={(value) =>
                  updateField("endDate", value)
                }
              />
            </FormSection>

            <FormSection title="Objectifs et tâches">
              <div className="md:col-span-2">
                <TextArea
                  label="Objectifs du stage"
                  value={form.objectives}
                  onChange={(value) =>
                    updateField("objectives", value)
                  }
                  placeholder="Décrire les objectifs..."
                />
              </div>

              <div className="md:col-span-2">
                <TextArea
                  label="Missions / tâches"
                  value={form.tasks}
                  onChange={(value) =>
                    updateField("tasks", value)
                  }
                  placeholder="Décrire les missions..."
                />
              </div>
            </FormSection>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
              <Link
                href="/internships"
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Save className="h-4 w-4" />

                {saving
                  ? "Enregistrement..."
                  : "Enregistrer le stage"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 border-b border-gray-100 pb-3 text-lg font-semibold text-gray-900">
        {title}
      </h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
    <label className="block">
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
          <option key={option} value={option}>
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}