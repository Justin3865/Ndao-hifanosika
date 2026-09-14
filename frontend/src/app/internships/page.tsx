"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  GraduationCap,
  Pencil,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  Internship,
  InternshipStatus,
  deleteInternship,
  formatInternshipDate,
  getInternships,
  getStatusClass,
} from "@/lib/internships";

import { AppLayout } from "@/components/layout";

const statuses: Array<InternshipStatus | "Tous"> = [
  "Tous",
  "En attente",
  "En cours",
  "Terminé",
  "Annulé",
];

export default function InternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<InternshipStatus | "Tous">("Tous");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setInternships(getInternships());
    setLoaded(true);
  }, []);

  const statistics = {
    total: internships.length,

    pending: internships.filter(
      (item) => item.status === "En attente"
    ).length,

    active: internships.filter(
      (item) => item.status === "En cours"
    ).length,

    completed: internships.filter(
      (item) => item.status === "Terminé"
    ).length,

    cancelled: internships.filter(
      (item) => item.status === "Annulé"
    ).length,
  };

  const filteredInternships = useMemo(() => {
    const value = search.trim().toLowerCase();

    return internships.filter((internship) => {
      const matchesSearch =
        !value ||
        internship.internName
          .toLowerCase()
          .includes(value) ||
        internship.reference
          .toLowerCase()
          .includes(value) ||
        internship.institution
          .toLowerCase()
          .includes(value) ||
        internship.field
          .toLowerCase()
          .includes(value) ||
        internship.department
          .toLowerCase()
          .includes(value) ||
        internship.projectName
          ?.toLowerCase()
          .includes(value);

      const matchesStatus =
        statusFilter === "Tous" ||
        internship.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [internships, search, statusFilter]);

  function handleDelete(id: string) {
    const internship = internships.find(
      (item) => item.id === id
    );

    if (!internship) {
      return;
    }

    const confirmed = window.confirm(
      `Voulez-vous supprimer le stage de ${internship.internName} ?`
    );

    if (!confirmed) {
      return;
    }

    deleteInternship(id);
    setInternships(getInternships());
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("Tous");
  }

  if (!loaded) {
    return (
      <AppLayout>
        <div className="min-h-[calc(100vh-8rem)]">
          <div className="mx-auto max-w-7xl rounded-2xl bg-white p-10 text-center shadow-sm">
            <GraduationCap className="mx-auto h-10 w-10 animate-pulse text-blue-600" />

            <p className="mt-4 text-gray-600">
              Chargement des stages...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* =========================================================
            HEADER
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

              <span>Stages</span>
            </div>

            {/* TITRE - SANS LOGO */}
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Stages
            </h2>

            <p className="mt-1 text-gray-500">
              Gestion et suivi des stagiaires de
              Ndao Hifanosika.
            </p>
          </div>

          {/* BOUTON AJOUTER */}
          <Link
            href="/internships/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Nouveau stage
          </Link>
        </div>

        {/* =========================================================
            STATISTIQUES
        ========================================================= */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* TOTAL */}
          <StatCard
            label="Total"
            value={statistics.total}
            icon={GraduationCap}
            iconClass="bg-blue-100 text-blue-600"
          />

          {/* EN ATTENTE */}
          <StatCard
            label="En attente"
            value={statistics.pending}
            icon={Clock}
            iconClass="bg-yellow-100 text-yellow-600"
          />

          {/* EN COURS */}
          <StatCard
            label="En cours"
            value={statistics.active}
            icon={Users}
            iconClass="bg-indigo-100 text-indigo-600"
          />

          {/* TERMINÉS */}
          <StatCard
            label="Terminés"
            value={statistics.completed}
            icon={CheckCircle2}
            iconClass="bg-green-100 text-green-600"
          />

          {/* ANNULÉS */}
          <StatCard
            label="Annulés"
            value={statistics.cancelled}
            icon={XCircle}
            iconClass="bg-red-100 text-red-600"
          />

        </div>

        {/* =========================================================
            FILTRES
        ========================================================= */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* RECHERCHE */}
            <div className="relative">

              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Rechercher un stagiaire, projet..."
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* STATUT */}
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | InternshipStatus
                    | "Tous"
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {statuses.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status === "Tous"
                    ? "Tous les statuts"
                    : status}
                </option>
              ))}
            </select>

          </div>

          {/* RESULTATS + RESET */}
          {(search || statusFilter !== "Tous") && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">

              <span className="text-sm text-gray-500">
                {filteredInternships.length} résultat
                {filteredInternships.length > 1
                  ? "s"
                  : ""}
              </span>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:text-blue-800"
              >
                <X className="h-4 w-4" />
                Réinitialiser
              </button>

            </div>
          )}

        </section>

        {/* =========================================================
            TABLE
        ========================================================= */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* TABLE HEADER */}
          <div className="border-b border-gray-200 px-5 py-4">

            <div>
              <h2 className="font-semibold text-gray-900">
                Liste des stages
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                {filteredInternships.length} stage
                {filteredInternships.length > 1
                  ? "s"
                  : ""}
              </p>
            </div>

          </div>

          {/* =====================================================
              EMPTY STATE
          ===================================================== */}
          {filteredInternships.length === 0 ? (
            <div className="p-12 text-center">

              <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />

              <h3 className="mt-4 font-semibold text-gray-900">
                Aucun stage trouvé
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Modifiez vos critères de recherche
                ou créez un nouveau stage.
              </p>

              <Link
                href="/internships/create"
                className="mt-5 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Nouveau stage
              </Link>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[950px] text-left text-sm">

                <thead className="border-b border-gray-200 bg-gray-50">

                  <tr>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Stagiaire
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Formation
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Département
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Projet
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Période
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Statut
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredInternships.map(
                    (internship) => (
                      <tr
                        key={internship.id}
                        className="transition hover:bg-gray-50"
                      >

                        {/* STAGIAIRE */}
                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                              {internship.internName
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">

                              <p className="font-medium text-gray-900">
                                {internship.internName}
                              </p>

                              <p className="truncate text-sm text-gray-500">
                                {internship.reference}
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* FORMATION */}
                        <td className="px-5 py-4">

                          <p className="font-medium text-gray-800">
                            {internship.field}
                          </p>

                          <p className="text-xs text-gray-500">
                            {internship.level}
                          </p>

                        </td>

                        {/* DEPARTEMENT */}
                        <td className="px-5 py-4">

                          <span className="whitespace-nowrap rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                            {internship.department}
                          </span>

                        </td>

                        {/* PROJET */}
                        <td className="px-5 py-4">

                          <span className="text-gray-700">
                            {internship.projectName ?? "—"}
                          </span>

                        </td>

                        {/* PERIODE */}
                        <td className="px-5 py-4 text-sm text-gray-500">

                          <div className="flex items-center gap-2 whitespace-nowrap">

                            <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />

                            {formatInternshipDate(
                              internship.startDate
                            )}

                          </div>

                          <div className="mt-1 pl-6 whitespace-nowrap text-xs text-gray-500">
                            au{" "}
                            {formatInternshipDate(
                              internship.endDate
                            )}
                          </div>

                        </td>

                        {/* STATUT */}
                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                              internship.status
                            )}`}
                          >
                            {internship.status}
                          </span>

                        </td>

                        {/* ACTIONS */}
                        <td className="px-5 py-4">

                          <div className="flex items-center justify-end gap-1">

                            {/* VOIR */}
                            <Link
                              href={`/internships/${internship.id}`}
                              title="Voir"
                              className="rounded-lg p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>

                            {/* MODIFIER */}
                            <Link
                              href={`/internships/${internship.id}/edit`}
                              title="Modifier"
                              className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>

                            {/* SUPPRIMER */}
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={() =>
                                handleDelete(
                                  internship.id
                                )
                              }
                              className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>
      </div>
    </AppLayout>
  );
}

/* ===============================================================
   STAT CARD
================================================================ */

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: typeof GraduationCap;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">

      <div className="flex items-center gap-4">

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0">

          <p className="text-sm text-gray-500">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}