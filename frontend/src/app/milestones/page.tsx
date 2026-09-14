"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Edit,
  Eye,
  Flag,
  Plus,
  Search,
  Trash2,
  Target,
  CircleCheck,
  Clock3,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout";

import {
  deleteMilestone,
  formatMilestoneDate,
  getMilestones,
  Milestone,
} from "@/lib/milestones";

export default function MilestonesPage() {
  const searchParams = useSearchParams();

  const projectId = searchParams.get("projectId");

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "Tous" | Milestone["statut"]
  >("Tous");

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  useEffect(() => {
    setMilestones(getMilestones());
  }, []);

  const projectMilestones = useMemo(() => {
    if (!projectId) {
      return milestones;
    }

    return milestones.filter(
      (milestone) => milestone.projectId === projectId
    );
  }, [milestones, projectId]);

  const filteredMilestones = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return projectMilestones.filter((milestone) => {
      const matchesSearch =
        !searchValue ||
        milestone.nom.toLowerCase().includes(searchValue) ||
        milestone.code.toLowerCase().includes(searchValue) ||
        milestone.projectName.toLowerCase().includes(searchValue) ||
        milestone.responsable.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "Tous" ||
        milestone.statut === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    projectMilestones,
    search,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMilestones.length / itemsPerPage)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedMilestones = filteredMilestones.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const total = projectMilestones.length;

  const enCours = projectMilestones.filter(
    (milestone) => milestone.statut === "En cours"
  ).length;

  const atteints = projectMilestones.filter(
    (milestone) => milestone.statut === "Atteint"
  ).length;

  const enRetard = projectMilestones.filter(
    (milestone) => milestone.statut === "En retard"
  ).length;

  const progressionMoyenne =
    total > 0
      ? Math.round(
          projectMilestones.reduce(
            (sum, milestone) =>
              sum + milestone.progression,
            0
          ) / total
        )
      : 0;

  const currentProjectName =
    projectMilestones.length > 0
      ? projectMilestones[0].projectName
      : null;

  const handleDelete = (
    id: string,
    name: string
  ) => {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le jalon "${name}" ?`
    );

    if (!confirmed) {
      return;
    }

    deleteMilestone(id);

    setMilestones((current) =>
      current.filter(
        (milestone) => milestone.id !== id
      )
    );

    const newFilteredLength =
      filteredMilestones.length - 1;

    const newTotalPages = Math.max(
      1,
      Math.ceil(
        newFilteredLength / itemsPerPage
      )
    );

    setCurrentPage((page) =>
      Math.min(page, newTotalPages)
    );
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(
      value as "Tous" | Milestone["statut"]
    );
    setCurrentPage(1);
  };

  const getStatusClass = (
    status: Milestone["statut"]
  ) => {
    switch (status) {
      case "À venir":
        return "bg-yellow-100 text-yellow-700";

      case "En cours":
        return "bg-blue-100 text-blue-700";

      case "Atteint":
        return "bg-green-100 text-green-700";

      case "En retard":
        return "bg-red-100 text-red-700";

      case "Annulé":
        return "bg-gray-100 text-gray-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <AppLayout>
      {/* =========================================================
          TITRE + BOUTON AJOUTER
      ========================================================= */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          {/* BREADCRUMB */}
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link
              href="/dashboard"
              className="transition hover:text-blue-600"
            >
              Tableau de bord
            </Link>

            <span>/</span>

            <span>Jalons</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Jalons / Milestones
          </h2>

          {projectId &&
          currentProjectName ? (
            <p className="mt-1 text-gray-500">
              Projet :{" "}
              <span className="font-semibold text-blue-600">
                {currentProjectName}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-gray-500">
              Gestion et suivi des étapes clés
              des projets.
            </p>
          )}
        </div>

        {/* BOUTON AJOUTER */}
        <Link
          href={
            projectId
              ? `/milestones/create?projectId=${projectId}`
              : "/milestones/create"
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Nouveau jalon
        </Link>
      </div>

      {/* =========================================================
          STATISTIQUES
      ========================================================= */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* TOTAL */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <Target className="h-6 w-6 text-purple-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Total jalons
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {total}
              </p>
            </div>
          </div>
        </div>

        {/* EN COURS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <Clock3 className="h-6 w-6 text-blue-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                En cours
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {enCours}
              </p>
            </div>
          </div>
        </div>

        {/* ATTEINTS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <CircleCheck className="h-6 w-6 text-green-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Atteints
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {atteints}
              </p>
            </div>
          </div>
        </div>

        {/* EN RETARD */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                En retard
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {enRetard}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          FILTRES
      ========================================================= */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* RECHERCHE */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                handleSearch(e.target.value)
              }
              placeholder="Rechercher un jalon..."
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* STATUT */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) =>
                handleStatusChange(e.target.value)
              }
              className="w-full rounded-xl border border-gray-300 bg-white py-3 px-4 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Tous">
                Tous les statuts
              </option>

              <option value="À venir">
                À venir
              </option>

              <option value="En cours">
                En cours
              </option>

              <option value="Atteint">
                Atteint
              </option>

              <option value="En retard">
                En retard
              </option>

              <option value="Annulé">
                Annulé
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================
          TABLE
      ========================================================= */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Jalon
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Projet
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Responsable
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Date prévue
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Progression
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Statut
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedMilestones.length > 0 ? (
                paginatedMilestones.map(
                  (milestone) => (
                    <tr
                      key={milestone.id}
                      className="transition hover:bg-gray-50"
                    >
                      {/* JALON */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/milestones/${milestone.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {milestone.nom}
                        </Link>

                        <p className="mt-1 text-xs text-gray-500">
                          {milestone.code}
                        </p>
                      </td>

                      {/* PROJET */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/projects/${milestone.projectId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {milestone.projectName}
                        </Link>
                      </td>

                      {/* RESPONSABLE */}
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {milestone.responsable}
                      </td>

                      {/* DATE */}
                      <td className="px-5 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />

                          {formatMilestoneDate(
                            milestone.datePrevue
                          )}
                        </div>

                        {milestone.dateRealisation && (
                          <p className="mt-1 whitespace-nowrap text-xs text-green-600">
                            Réalisé le{" "}
                            {formatMilestoneDate(
                              milestone.dateRealisation
                            )}
                          </p>
                        )}
                      </td>

                      {/* PROGRESSION */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{
                                width: `${Math.min(
                                  Math.max(
                                    milestone.progression,
                                    0
                                  ),
                                  100
                                )}%`,
                              }}
                            />
                          </div>

                          <span className="whitespace-nowrap text-sm font-medium text-gray-700">
                            {milestone.progression}%
                          </span>
                        </div>
                      </td>

                      {/* STATUT */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            milestone.statut
                          )}`}
                        >
                          {milestone.statut}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* VOIR */}
                          <Link
                            href={`/milestones/${milestone.id}`}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600"
                            title="Voir"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {/* MODIFIER */}
                          <Link
                            href={`/milestones/${milestone.id}/edit`}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>

                          {/* SUPPRIMER */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                milestone.id,
                                milestone.nom
                              )
                            }
                            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center"
                  >
                    <Flag className="mx-auto mb-3 h-10 w-10 text-gray-300" />

                    <p className="font-medium text-gray-700">
                      Aucun jalon trouvé
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Modifiez vos critères de
                      recherche.
                    </p>

                    <Link
                      href={
                        projectId
                          ? `/milestones/create?projectId=${projectId}`
                          : "/milestones/create"
                      }
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Créer un jalon
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================================
            PAGINATION
        ===================================================== */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            Affichage de{" "}
            {filteredMilestones.length === 0
              ? 0
              : (safePage - 1) *
                  itemsPerPage +
                1}{" "}
            à{" "}
            {Math.min(
              safePage * itemsPerPage,
              filteredMilestones.length
            )}{" "}
            sur {filteredMilestones.length}{" "}
            jalons
          </p>

          <div className="flex items-center gap-2">
            {/* PREVIOUS */}
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() =>
                setCurrentPage((page) =>
                  Math.max(1, page - 1)
                )
              }
              className="rounded-lg border border-gray-300 p-2 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* CURRENT PAGE */}
            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              Page {safePage} / {totalPages}
            </span>

            {/* NEXT */}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(
                    totalPages,
                    page + 1
                  )
                )
              }
              className="rounded-lg border border-gray-300 p-2 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}