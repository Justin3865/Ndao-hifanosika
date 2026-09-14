"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
Eye,
Pencil,
Plus,
Trash2,
} from "lucide-react";

import {
deleteActivity,
formatDate,
getActivities,
type Activity,
type ActivityStatus,
} from "@/lib/activities";

import { AppLayout } from "@/components/layout";

export default function ActivitiesPage() {
const [activities, setActivities] = useState<Activity[]>([]);
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] =
useState<"Tous" | ActivityStatus>("Tous");

/* =======================================================
CHARGEMENT DES ACTIVITÉS
======================================================= */

useEffect(() => {
setActivities(getActivities());
}, []);

/* =======================================================
FILTRAGE
======================================================= */

const filteredActivities = useMemo(() => {
const value = search.toLowerCase().trim();

return activities.filter((activity) => {
  const matchesSearch =
    !value ||
    activity.nom.toLowerCase().includes(value) ||
    activity.code.toLowerCase().includes(value) ||
    activity.projectName.toLowerCase().includes(value) ||
    activity.responsable.toLowerCase().includes(value);

  const matchesStatus =
    statusFilter === "Tous" ||
    activity.statut === statusFilter;

  return matchesSearch && matchesStatus;
});

}, [activities, search, statusFilter]);

/* =======================================================
STATISTIQUES
======================================================= */

const total = activities.length;

const enCours = activities.filter(
(activity) => activity.statut === "En cours"
).length;

const terminees = activities.filter(
(activity) => activity.statut === "Terminée"
).length;

const progressionMoyenne =
activities.length > 0
? Math.round(
activities.reduce(
(sum, activity) => sum + activity.progression,
0
) / activities.length
)
: 0;

/* =======================================================
SUPPRESSION
======================================================= */

const handleDelete = (id: string, name: string) => {
const confirmed = window.confirm(
`Voulez-vous vraiment supprimer l'activité "${name}" ?`
);

if (!confirmed) {
  return;
}

deleteActivity(id);
setActivities(getActivities());

};

/* =======================================================
STATUT
======================================================= */

const getStatusClass = (status: ActivityStatus) => {
switch (status) {
case "En cours":
return "bg-green-100 text-green-700";

  case "Terminée":
    return "bg-blue-100 text-blue-700";

  case "Planifiée":
    return "bg-yellow-100 text-yellow-700";

  case "Suspendue":
    return "bg-red-100 text-red-700";

  default:
    return "bg-gray-100 text-gray-700";
}

};

/* =======================================================
RENDER
======================================================= */

return ( <AppLayout> <div className="space-y-6">

    {/* =================================================
        BREADCRUMB
    ================================================= */}

    <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
      <Link
        href="/dashboard"
        className="transition hover:text-purple-600"
      >
        Tableau de bord
      </Link>

      <span>/</span>

      <span>Activités</span>
    </div>

    {/* =================================================
        TITRE + ACTION
    ================================================= */}

    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Activités
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Planification, suivi et évaluation des activités
          des projets.
        </p>
      </div>

      <Link
        href="/activities/create"
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
      >
        <Plus className="mr-2 h-4 w-4" />
        Nouvelle activité
      </Link>
    </div>

    {/* =================================================
        STATISTIQUES
    ================================================= */}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

      {/* TOTAL */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Total activités
        </p>

        <p className="mt-2 text-3xl font-bold text-gray-900">
          {total}
        </p>
      </div>

      {/* EN COURS */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          En cours
        </p>

        <p className="mt-2 text-3xl font-bold text-green-600">
          {enCours}
        </p>
      </div>

      {/* TERMINÉES */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Terminées
        </p>

        <p className="mt-2 text-3xl font-bold text-blue-600">
          {terminees}
        </p>
      </div>

      {/* PROGRESSION */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Progression moyenne
        </p>

        <p className="mt-2 text-3xl font-bold text-purple-600">
          {progressionMoyenne}%
        </p>
      </div>

    </div>

    {/* =================================================
        FILTRES
    ================================================= */}

    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">

        {/* RECHERCHE */}

        <div className="md:col-span-2">
          <label
            htmlFor="search"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Rechercher
          </label>

          <input
            id="search"
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Nom, code, projet, responsable..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* STATUT */}

        <div>
          <label
            htmlFor="status"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Statut
          </label>

          <select
            id="status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "Tous"
                  | ActivityStatus
              )
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="Tous">
              Tous les statuts
            </option>

            <option value="Planifiée">
              Planifiée
            </option>

            <option value="En cours">
              En cours
            </option>

            <option value="Terminée">
              Terminée
            </option>

            <option value="Suspendue">
              Suspendue
            </option>
          </select>
        </div>

      </div>
    </div>

    {/* =================================================
        TABLEAU
    ================================================= */}

    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">

        <table className="w-full min-w-[1100px]">

          {/* TABLE HEADER */}

          <thead className="bg-gray-100">
            <tr>

              <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                Activité
              </th>

              <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                Projet
              </th>

              <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                Responsable
              </th>

              <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                Période
              </th>

              <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                Progression
              </th>

              <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                Statut
              </th>

              <th className="px-5 py-4 text-right text-sm font-semibold text-gray-700">
                Actions
              </th>

            </tr>
          </thead>

          {/* TABLE BODY */}

          <tbody className="divide-y divide-gray-200">

            {filteredActivities.map((activity) => (
              <tr
                key={activity.id}
                className="transition hover:bg-gray-50"
              >

                {/* ACTIVITÉ */}

                <td className="px-5 py-4">
                  <Link
                    href={`/activities/${activity.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {activity.nom}
                  </Link>

                  <p className="mt-1 text-xs text-gray-500">
                    {activity.code}
                  </p>
                </td>

                {/* PROJET */}

                <td className="px-5 py-4 text-sm text-gray-700">
                  {activity.projectName}
                </td>

                {/* RESPONSABLE */}

                <td className="px-5 py-4 text-sm text-gray-700">
                  {activity.responsable}
                </td>

                {/* PÉRIODE */}

                <td className="px-5 py-4 text-sm text-gray-700">
                  {formatDate(activity.dateDebut)}

                  <br />

                  <span className="text-gray-400">
                    au
                  </span>{" "}

                  {formatDate(activity.dateFin)}
                </td>

                {/* PROGRESSION */}

                <td className="px-5 py-4">
                  <div className="w-32">

                    <div className="mb-1 flex justify-between text-xs text-gray-600">
                      <span>
                        {activity.progression}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{
                          width: `${activity.progression}%`,
                        }}
                      />
                    </div>

                  </div>
                </td>

                {/* STATUT */}

                <td className="px-5 py-4">
                  <span
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      activity.statut
                    )}`}
                  >
                    {activity.statut}
                  </span>
                </td>

                {/* ACTIONS */}

                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">

                    <Link
                      href={`/activities/${activity.id}`}
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                      title="Voir"
                    >
                      <Eye size={17} />
                    </Link>

                    <Link
                      href={`/activities/${activity.id}/edit`}
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-yellow-50 hover:text-yellow-600"
                      title="Modifier"
                    >
                      <Pencil size={17} />
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          activity.id,
                          activity.nom
                        )
                      }
                      className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                      title="Supprimer"
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>
                </td>

              </tr>
            ))}

            {/* AUCUN RÉSULTAT */}

            {filteredActivities.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-12 text-center text-gray-500"
                >
                  Aucune activité trouvée.
                </td>
              </tr>
            )}

          </tbody>

        </table>
      </div>
    </div>

  </div>
</AppLayout>

);
}
