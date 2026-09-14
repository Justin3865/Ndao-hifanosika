"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMilestone,
  MilestoneStatus,
} from "@/lib/milestones";

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

const statuses: MilestoneStatus[] = [
  "À venir",
  "En cours",
  "Atteint",
  "En retard",
  "Annulé",
];

export default function CreateMilestonePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    code: "",
    nom: "",
    description: "",

    projectId: "",
    projectName: "",

    activityId: "",
    activityName: "",

    responsable: "",

    datePrevue: "",
    dateRealisation: "",

    statut: "À venir" as MilestoneStatus,
    progression: 0,

    indicateur: "",
    cible: 0,
    valeurActuelle: 0,
    unite: "",

    commentaires: "",
  });

  const [error, setError] = useState("");

  function handleChange(
    field: string,
    value: string | number
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");

    if (
      !form.code ||
      !form.nom ||
      !form.projectId ||
      !form.responsable ||
      !form.datePrevue
    ) {
      setError(
        "Veuillez remplir tous les champs obligatoires."
      );
      return;
    }

    if (
      form.progression < 0 ||
      form.progression > 100
    ) {
      setError(
        "La progression doit être comprise entre 0 et 100."
      );
      return;
    }

    if (
      form.dateRealisation &&
      form.dateRealisation > form.datePrevue
    ) {
      // Ce contrôle reste volontairement souple :
      // une réalisation peut être après la date prévue
      // si le jalon est en retard.
    }

    const project = projects.find(
      (item) => item.id === form.projectId
    );

    createMilestone({
      ...form,
      projectName:
        project?.name || form.projectName,
    });

    router.push("/milestones");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6">
          <Link
            href="/milestones"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Retour aux jalons
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Créer un nouveau jalon
          </h1>

          <p className="mt-1 text-gray-500">
            Ajoutez une étape importante d'un projet ou
            d'une activité.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* INFORMATIONS GÉNÉRALES */}
          <section className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-bold">
              Informations générales
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Code *
                </label>

                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    handleChange(
                      "code",
                      e.target.value
                    )
                  }
                  placeholder="MS-XXX-001"
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nom du jalon *
                </label>

                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) =>
                    handleChange(
                      "nom",
                      e.target.value
                    )
                  }
                  placeholder="Ex. Lancement de la formation"
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    handleChange(
                      "description",
                      e.target.value
                    )
                  }
                  placeholder="Description du jalon..."
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

            </div>

          </section>

          {/* PROJET */}
          <section className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-bold">
              Projet et activité
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Projet *
                </label>

                <select
                  value={form.projectId}
                  onChange={(e) => {
                    const selected =
                      projects.find(
                        (project) =>
                          project.id ===
                          e.target.value
                      );

                    setForm((previous) => ({
                      ...previous,
                      projectId:
                        e.target.value,
                      projectName:
                        selected?.name || "",
                    }));
                  }}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="">
                    Sélectionner un projet
                  </option>

                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Activité
                </label>

                <input
                  type="text"
                  value={form.activityName}
                  onChange={(e) =>
                    handleChange(
                      "activityName",
                      e.target.value
                    )
                  }
                  placeholder="Nom de l'activité"
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

            </div>

          </section>

          {/* PLANIFICATION */}
          <section className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-bold">
              Planification
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Responsable *
                </label>

                <input
                  type="text"
                  value={form.responsable}
                  onChange={(e) =>
                    handleChange(
                      "responsable",
                      e.target.value
                    )
                  }
                  placeholder="Responsable"
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Date prévue *
                </label>

                <input
                  type="date"
                  value={form.datePrevue}
                  onChange={(e) =>
                    handleChange(
                      "datePrevue",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Date de réalisation
                </label>

                <input
                  type="date"
                  value={form.dateRealisation}
                  onChange={(e) =>
                    handleChange(
                      "dateRealisation",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

            </div>

          </section>

          {/* SUIVI */}
          <section className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-bold">
              Suivi et indicateurs
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Statut
                </label>

                <select
                  value={form.statut}
                  onChange={(e) =>
                    handleChange(
                      "statut",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                >
                  {statuses.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Progression (%)
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.progression}
                  onChange={(e) =>
                    handleChange(
                      "progression",
                      Number(e.target.value)
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Indicateur
                </label>

                <input
                  type="text"
                  value={form.indicateur}
                  onChange={(e) =>
                    handleChange(
                      "indicateur",
                      e.target.value
                    )
                  }
                  placeholder="Ex. Nombre de personnes formées"
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Unité
                </label>

                <input
                  type="text"
                  value={form.unite}
                  onChange={(e) =>
                    handleChange(
                      "unite",
                      e.target.value
                    )
                  }
                  placeholder="personnes, ateliers..."
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Cible
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.cible}
                  onChange={(e) =>
                    handleChange(
                      "cible",
                      Number(e.target.value)
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Valeur actuelle
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.valeurActuelle}
                  onChange={(e) =>
                    handleChange(
                      "valeurActuelle",
                      Number(e.target.value)
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Commentaires
                </label>

                <textarea
                  rows={4}
                  value={form.commentaires}
                  onChange={(e) =>
                    handleChange(
                      "commentaires",
                      e.target.value
                    )
                  }
                  placeholder="Commentaires ou observations..."
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

            </div>

          </section>

          {/* BOUTONS */}
          <div className="flex justify-end gap-3">

            <Link
              href="/milestones"
              className="rounded-lg border px-5 py-3 font-medium hover:bg-gray-100"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Créer le jalon
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}