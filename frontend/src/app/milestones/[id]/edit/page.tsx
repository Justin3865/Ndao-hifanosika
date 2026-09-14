"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getMilestoneById,
  updateMilestone,
  Milestone,
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

export default function EditMilestonePage() {
  const params = useParams();
  const router = useRouter();

  const [milestone, setMilestone] =
    useState<Milestone | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    const found = getMilestoneById(
      String(params.id)
    );

    setMilestone(found || null);
  }, [params.id]);

  function handleChange(
    field: keyof Milestone,
    value: string | number
  ) {
    if (!milestone) return;

    setMilestone({
      ...milestone,
      [field]: value,
    });
  }

  function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!milestone) return;

    setError("");

    if (
      !milestone.code ||
      !milestone.nom ||
      !milestone.projectId ||
      !milestone.responsable ||
      !milestone.datePrevue
    ) {
      setError(
        "Veuillez remplir tous les champs obligatoires."
      );

      return;
    }

    if (
      milestone.progression < 0 ||
      milestone.progression > 100
    ) {
      setError(
        "La progression doit être comprise entre 0 et 100."
      );

      return;
    }

    updateMilestone(
      milestone.id,
      milestone
    );

    router.push(
      `/milestones/${milestone.id}`
    );
  }

  if (!milestone) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold">
            Jalon introuvable
          </h1>

          <Link
            href="/milestones"
            className="mt-5 inline-block text-blue-600 hover:underline"
          >
            Retour aux jalons
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6">

          <Link
            href={`/milestones/${milestone.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Retour au jalon
          </Link>

          <h1 className="mt-3 text-3xl font-bold">
            Modifier le jalon
          </h1>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* INFORMATIONS */}
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
                  value={milestone.code}
                  onChange={(e) =>
                    handleChange(
                      "code",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nom *
                </label>

                <input
                  type="text"
                  value={milestone.nom}
                  onChange={(e) =>
                    handleChange(
                      "nom",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={milestone.description}
                  onChange={(e) =>
                    handleChange(
                      "description",
                      e.target.value
                    )
                  }
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
                  value={milestone.projectId}
                  onChange={(e) => {

                    const project =
                      projects.find(
                        (item) =>
                          item.id ===
                          e.target.value
                      );

                    setMilestone({
                      ...milestone,
                      projectId:
                        e.target.value,
                      projectName:
                        project?.name || "",
                    });

                  }}
                  className="w-full rounded-lg border px-4 py-3"
                >

                  <option value="">
                    Sélectionner
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
                  value={
                    milestone.activityName || ""
                  }
                  onChange={(e) =>
                    handleChange(
                      "activityName",
                      e.target.value
                    )
                  }
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
                  value={milestone.responsable}
                  onChange={(e) =>
                    handleChange(
                      "responsable",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Date prévue *
                </label>

                <input
                  type="date"
                  value={milestone.datePrevue}
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
                  Date réalisation
                </label>

                <input
                  type="date"
                  value={
                    milestone.dateRealisation ||
                    ""
                  }
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
                  value={milestone.statut}
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
                  value={milestone.progression}
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
                  value={milestone.indicateur}
                  onChange={(e) =>
                    handleChange(
                      "indicateur",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Unité
                </label>

                <input
                  type="text"
                  value={milestone.unite}
                  onChange={(e) =>
                    handleChange(
                      "unite",
                      e.target.value
                    )
                  }
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
                  value={milestone.cible}
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
                  value={
                    milestone.valeurActuelle
                  }
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
                  value={milestone.commentaires}
                  onChange={(e) =>
                    handleChange(
                      "commentaires",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

            </div>

          </section>

          {/* BOUTONS */}
          <div className="flex justify-end gap-3">

            <Link
              href={`/milestones/${milestone.id}`}
              className="rounded-lg border px-5 py-3 font-medium hover:bg-gray-100"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Enregistrer les modifications
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}