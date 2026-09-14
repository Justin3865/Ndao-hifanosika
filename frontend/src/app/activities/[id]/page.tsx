"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  deleteActivity,
  formatBudget,
  formatDate,
  getActivityById,
  Activity,
} from "@/lib/activities";

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [activity, setActivity] =
    useState<Activity | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const id = params.id;

    if (typeof id !== "string") {
      setLoading(false);
      return;
    }

    const found =
      getActivityById(id);

    setActivity(found ?? null);
    setLoading(false);
  }, [params.id]);

  const handleDelete = () => {
    if (!activity) {
      return;
    }

    const confirmed =
      window.confirm(
        `Voulez-vous vraiment supprimer "${activity.nom}" ?`
      );

    if (!confirmed) {
      return;
    }

    deleteActivity(activity.id);

    router.push("/activities");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">
          Chargement de l'activité...
        </p>
      </main>
    );
  }

  if (!activity) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">

        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-10 text-center shadow-sm">

          <h1 className="text-2xl font-bold">
            Activité introuvable
          </h1>

          <p className="mt-3 text-gray-600">
            L'activité demandée n'existe pas
            ou a été supprimée.
          </p>

          <Link
            href="/activities"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Retour aux activités
          </Link>

        </div>

      </main>
    );
  }

  const statusClass =
    activity.statut === "En cours"
      ? "bg-green-100 text-green-700"
      : activity.statut === "Terminée"
      ? "bg-blue-100 text-blue-700"
      : activity.statut === "Suspendue"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <main className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-8">

          <Link
            href="/activities"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Retour aux activités
          </Link>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-start">

            <div>

              <div className="flex flex-wrap items-center gap-3">

                <h1 className="text-3xl font-bold text-gray-900">
                  {activity.nom}
                </h1>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                >
                  {activity.statut}
                </span>

              </div>

              <p className="mt-2 text-gray-500">
                Code :{" "}
                <span className="font-semibold">
                  {activity.code}
                </span>
              </p>

            </div>

            <div className="flex gap-3">

              <Link
                href={`/activities/${activity.id}/edit`}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
              >
                Modifier
              </Link>

              <button
                onClick={handleDelete}
                className="rounded-lg border border-red-200 bg-white px-5 py-3 font-semibold text-red-600"
              >
                Supprimer
              </button>

            </div>

          </div>

        </div>

        {/* PROGRESSION */}

        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-xl font-bold">
                Progression
              </h2>

              <p className="mt-1 text-gray-500">
                Avancement actuel de l'activité
              </p>

            </div>

            <span className="text-3xl font-bold text-blue-600">
              {activity.progression}%
            </span>

          </div>

          <div className="mt-5 h-4 overflow-hidden rounded-full bg-gray-200">

            <div
              className="h-full rounded-full bg-blue-600"
              style={{
                width: `${activity.progression}%`,
              }}
            />

          </div>

        </section>

        {/* INFORMATIONS */}

        <div className="grid gap-6 lg:grid-cols-3">

          <section className="lg:col-span-2 rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Informations de l'activité
            </h2>

            <div className="space-y-6">

              <div>

                <h3 className="text-sm font-semibold text-gray-500">
                  Description
                </h3>

                <p className="mt-2 leading-7 text-gray-700">
                  {activity.description ||
                    "Aucune description."}
                </p>

              </div>

              <div>

                <h3 className="text-sm font-semibold text-gray-500">
                  Projet
                </h3>

                <Link
                  href={`/projects/${activity.projectId}`}
                  className="mt-2 inline-block font-semibold text-blue-600 hover:underline"
                >
                  {activity.projectName}
                </Link>

              </div>

            </div>

          </section>

          {/* RESPONSABLE */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Responsable
            </h2>

            <p className="text-sm text-gray-500">
              Responsable de l'activité
            </p>

            <p className="mt-2 font-semibold text-gray-900">
              {activity.responsable ||
                "-"}
            </p>

          </section>

          {/* PLANNING */}

          <section className="lg:col-span-2 rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Planning
            </h2>

            <div className="grid gap-6 md:grid-cols-2">

              <div>

                <p className="text-sm text-gray-500">
                  Date de début
                </p>

                <p className="mt-1 font-semibold">
                  {formatDate(
                    activity.dateDebut
                  )}
                </p>

              </div>

              <div>

                <p className="text-sm text-gray-500">
                  Date de fin
                </p>

                <p className="mt-1 font-semibold">
                  {formatDate(
                    activity.dateFin
                  )}
                </p>

              </div>

            </div>

          </section>

          {/* BUDGET */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Budget
            </h2>

            <p className="text-sm text-gray-500">
              Budget prévu
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-600">
              {formatBudget(
                activity.budget,
                activity.devise
              )}
            </p>

          </section>

          {/* INDICATEUR */}

          <section className="lg:col-span-2 rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Indicateur de suivi
            </h2>

            <div className="grid gap-6 sm:grid-cols-3">

              <div>

                <p className="text-sm text-gray-500">
                  Indicateur
                </p>

                <p className="mt-1 font-semibold">
                  {activity.indicateur ||
                    "-"}
                </p>

              </div>

              <div>

                <p className="text-sm text-gray-500">
                  Cible
                </p>

                <p className="mt-1 text-xl font-bold">
                  {activity.cible}{" "}
                  {activity.unite}
                </p>

              </div>

              <div>

                <p className="text-sm text-gray-500">
                  Valeur actuelle
                </p>

                <p className="mt-1 text-xl font-bold text-green-600">
                  {activity.valeurActuelle}{" "}
                  {activity.unite}
                </p>

              </div>

            </div>

          </section>

          {/* BENEFICIAIRES */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Bénéficiaires
            </h2>

            <p className="text-sm text-gray-500">
              Nombre prévu
            </p>

            <p className="mt-2 text-3xl font-bold text-purple-600">
              {activity.nombreBeneficiaires}
            </p>

          </section>

        </div>

      </div>

    </main>
  );
}