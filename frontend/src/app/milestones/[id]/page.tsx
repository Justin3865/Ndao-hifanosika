"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  deleteMilestone,
  getMilestoneById,
  Milestone,
} from "@/lib/milestones";

function statusClass(status: string) {
  switch (status) {
    case "Atteint":
      return "bg-green-100 text-green-700";

    case "En cours":
      return "bg-blue-100 text-blue-700";

    case "En retard":
      return "bg-red-100 text-red-700";

    case "Annulé":
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

function formatDate(date?: string) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString(
    "fr-FR"
  );
}

export default function MilestoneDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [milestone, setMilestone] =
    useState<Milestone | null>(null);

  useEffect(() => {
    const id = String(params.id);

    const found = getMilestoneById(id);

    setMilestone(found || null);
  }, [params.id]);

  function handleDelete() {
    if (!milestone) return;

    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce jalon ?"
    );

    if (!confirmed) return;

    deleteMilestone(milestone.id);

    router.push("/milestones");
  }

  if (!milestone) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold">
            Jalon introuvable
          </h1>

          <p className="mt-2 text-gray-500">
            Le jalon demandé n'existe pas ou a été supprimé.
          </p>

          <Link
            href="/milestones"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 text-white"
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

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

          <div>
            <Link
              href="/milestones"
              className="text-sm text-blue-600 hover:underline"
            >
              ← Retour aux jalons
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-3">

              <h1 className="text-3xl font-bold text-gray-900">
                {milestone.nom}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${statusClass(
                  milestone.statut
                )}`}
              >
                {milestone.statut}
              </span>

            </div>

            <p className="mt-2 text-sm text-gray-500">
              {milestone.code}
            </p>
          </div>

          <div className="flex gap-2">

            <Link
              href={`/milestones/${milestone.id}/edit`}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Modifier
            </Link>

            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-200 px-4 py-2 font-medium text-red-600 hover:bg-red-50"
            >
              Supprimer
            </button>

          </div>

        </div>

        {/* PROGRESSION */}
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-lg font-bold">
              Progression
            </h2>

            <span className="text-2xl font-bold text-blue-600">
              {milestone.progression}%
            </span>

          </div>

          <div className="h-4 overflow-hidden rounded-full bg-gray-200">

            <div
              className="h-full rounded-full bg-blue-600"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    milestone.progression
                  )
                )}%`,
              }}
            />

          </div>

        </section>

        {/* DESCRIPTION */}
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-3 text-xl font-bold">
            Description
          </h2>

          <p className="leading-7 text-gray-600">
            {milestone.description ||
              "Aucune description disponible."}
          </p>

        </section>

        {/* PROJET */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">

          <section className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-4 text-xl font-bold">
              Projet / Activité
            </h2>

            <dl className="space-y-4">

              <div>
                <dt className="text-sm text-gray-500">
                  Projet
                </dt>

                <dd className="font-semibold">
                  {milestone.projectName}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">
                  Activité
                </dt>

                <dd className="font-semibold">
                  {milestone.activityName || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">
                  Responsable
                </dt>

                <dd className="font-semibold">
                  {milestone.responsable}
                </dd>
              </div>

            </dl>

          </section>

          {/* PLANIFICATION */}
          <section className="rounded-xl bg-white p-6 shadow-sm">

            <h2 className="mb-4 text-xl font-bold">
              Planification
            </h2>

            <dl className="space-y-4">

              <div>
                <dt className="text-sm text-gray-500">
                  Date prévue
                </dt>

                <dd className="font-semibold">
                  {formatDate(
                    milestone.datePrevue
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">
                  Date de réalisation
                </dt>

                <dd className="font-semibold">
                  {formatDate(
                    milestone.dateRealisation
                  )}
                </dd>
              </div>

            </dl>

          </section>

        </div>

        {/* INDICATEUR */}
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-bold">
            Indicateur de suivi
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

            <div>
              <p className="text-sm text-gray-500">
                Indicateur
              </p>

              <p className="mt-1 font-semibold">
                {milestone.indicateur || "—"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Cible
              </p>

              <p className="mt-1 text-2xl font-bold">
                {milestone.cible}{" "}
                <span className="text-sm font-normal text-gray-500">
                  {milestone.unite}
                </span>
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Valeur actuelle
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-600">
                {milestone.valeurActuelle}{" "}
                <span className="text-sm font-normal text-gray-500">
                  {milestone.unite}
                </span>
              </p>
            </div>

          </div>

        </section>

        {/* COMMENTAIRES */}
        <section className="rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-3 text-xl font-bold">
            Commentaires
          </h2>

          <p className="text-gray-600">
            {milestone.commentaires ||
              "Aucun commentaire."}
          </p>

        </section>

      </div>
    </main>
  );
}