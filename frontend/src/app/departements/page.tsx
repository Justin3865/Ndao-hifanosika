"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Users,
  Briefcase,
  Eye,
  Pencil,
  Trash2,
  Search,
  Filter,
  Building2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { AppLayout } from "@/components/layout";

type DepartementStatus = "Actif" | "Inactif";

type Departement = {
  id: number;
  code: string;
  name: string;
  description: string;
  responsable: string;
  email: string;
  telephone: string;
  status: DepartementStatus;
  members: number;
  projects: number;
  createdAt: string;
};

const initialDepartements: Departement[] = [
  {
    id: 1,
    code: "DIR",
    name: "Direction",
    description:
      "Pilotage stratégique et coordination générale de l'organisation.",
    responsable: "Directeur Général",
    email: "direction@ndaohifanosika.org",
    telephone: "+261 34 00 000 01",
    status: "Actif",
    members: 5,
    projects: 4,
    createdAt: "2026-01-15",
  },
  {
    id: 2,
    code: "DSI",
    name: "Direction des Systèmes d'Information",
    description:
      "Gestion des systèmes informatiques, données et solutions numériques.",
    responsable: "Responsable DSI",
    email: "dsi@ndaohifanosika.org",
    telephone: "+261 34 00 000 02",
    status: "Actif",
    members: 6,
    projects: 4,
    createdAt: "2026-01-18",
  },
  {
    id: 3,
    code: "DAF",
    name: "Direction Administrative et Financière",
    description:
      "Gestion administrative, financière, budgétaire et comptable.",
    responsable: "Responsable DAF",
    email: "daf@ndaohifanosika.org",
    telephone: "+261 34 00 000 03",
    status: "Actif",
    members: 7,
    projects: 4,
    createdAt: "2026-01-20",
  },
  {
    id: 4,
    code: "COM",
    name: "Communication",
    description:
      "Communication institutionnelle, visibilité et relations publiques.",
    responsable: "Responsable Communication",
    email: "communication@ndaohifanosika.org",
    telephone: "+261 34 00 000 04",
    status: "Actif",
    members: 5,
    projects: 3,
    createdAt: "2026-01-22",
  },
  {
    id: 5,
    code: "RH",
    name: "Ressources Humaines",
    description:
      "Gestion des ressources humaines, recrutement et développement des compétences.",
    responsable: "Responsable RH",
    email: "rh@ndaohifanosika.org",
    telephone: "+261 34 00 000 05",
    status: "Actif",
    members: 5,
    projects: 2,
    createdAt: "2026-01-25",
  },
];

export default function DepartementsPage() {
  const [departements, setDepartements] =
    useState<Departement[]>(initialDepartements);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "Tous" | DepartementStatus
  >("Tous");

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 4;

  const filteredDepartements = useMemo(() => {
    return departements.filter((departement) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        departement.name.toLowerCase().includes(searchValue) ||
        departement.code.toLowerCase().includes(searchValue) ||
        departement.responsable.toLowerCase().includes(searchValue) ||
        departement.email.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "Tous" ||
        departement.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [departements, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDepartements.length / itemsPerPage)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedDepartements = filteredDepartements.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const totalMembers = departements.reduce(
    (total, departement) => total + departement.members,
    0
  );

  const totalProjects = departements.reduce(
    (total, departement) => total + departement.projects,
    0
  );

  const activeDepartments = departements.filter(
    (departement) => departement.status === "Actif"
  ).length;

  const inactiveDepartments = departements.filter(
    (departement) => departement.status === "Inactif"
  ).length;

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (
    value: "Tous" | DepartementStatus
  ) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleDelete = (id: number) => {
    const departement = departements.find(
      (item) => item.id === id
    );

    if (!departement) return;

    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le département "${departement.name}" ?`
    );

    if (!confirmed) return;

    setDepartements((currentDepartements) =>
      currentDepartements.filter(
        (item) => item.id !== id
      )
    );

    const newFilteredLength =
      filteredDepartements.length - 1;

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

  const handleNextPage = () => {
    setCurrentPage((page) =>
      Math.min(totalPages, page + 1)
    );
  };

  const handlePreviousPage = () => {
    setCurrentPage((page) =>
      Math.max(1, page - 1)
    );
  };

  return (
    <AppLayout>
      {/* TITRE + BOUTON AJOUTER */}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link
              href="/dashboard"
              className="transition hover:text-blue-600"
            >
              Tableau de bord
            </Link>

            <span>/</span>

            <span>Départements</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Départements
          </h2>

          <p className="mt-1 text-gray-500">
            Gérez les départements, leurs responsables,
            membres et projets.
          </p>
        </div>

        <Link
          href="/departements/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Nouveau département
        </Link>
      </div>

      {/* STATISTIQUES */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Total départements
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {departements.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Départements actifs
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {activeDepartments}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
              <Building2 className="h-6 w-6 text-gray-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Départements inactifs
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {inactiveDepartments}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Membres
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {totalMembers}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTRES */}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                handleSearch(event.target.value)
              }
              placeholder="Rechercher un département..."
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <select
              value={statusFilter}
              onChange={(event) =>
                handleStatusChange(
                  event.target.value as
                    | "Tous"
                    | DepartementStatus
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Tous">
                Tous les statuts
              </option>

              <option value="Actif">
                Actif
              </option>

              <option value="Inactif">
                Inactif
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLEAU */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Département
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Responsable
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Contact
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Membres
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Projets
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
              {paginatedDepartements.length > 0 ? (
                paginatedDepartements.map(
                  (departement) => (
                    <tr
                      key={departement.id}
                      className="transition hover:bg-gray-50"
                    >
                      {/* DEPARTEMENT */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
                            <span className="text-xs font-bold text-purple-700">
                              {departement.code}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">
                              {departement.name}
                            </p>

                            <p className="max-w-[300px] truncate text-sm text-gray-500">
                              {departement.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* RESPONSABLE */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                            <Users className="h-4 w-4 text-gray-500" />
                          </div>

                          <span className="text-sm text-gray-700">
                            {departement.responsable}
                          </span>
                        </div>
                      </td>

                      {/* CONTACT */}

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-700">
                            {departement.email}
                          </p>

                          <p className="text-xs text-gray-500">
                            {departement.telephone}
                          </p>
                        </div>
                      </td>

                      {/* MEMBRES */}

                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                          <Users className="h-4 w-4 text-blue-600" />

                          <span className="text-sm font-semibold text-blue-700">
                            {departement.members}
                          </span>
                        </div>
                      </td>

                      {/* PROJETS - SEUL CHANGEMENT */}

                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                          <Briefcase className="h-4 w-4 text-blue-600" />

                          <span className="text-sm font-semibold text-blue-700">
                            {departement.projects}
                          </span>
                        </div>
                      </td>

                      {/* STATUT */}

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            departement.status === "Actif"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {departement.status}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/departements/${departement.id}`}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600"
                            title="Voir"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/departements/${departement.id}/edit`}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                departement.id
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
                    <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />

                    <p className="font-medium text-gray-700">
                      Aucun département trouvé
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Modifiez vos critères de recherche.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            Affichage de{" "}
            {filteredDepartements.length === 0
              ? 0
              : (safePage - 1) * itemsPerPage + 1}{" "}
            à{" "}
            {Math.min(
              safePage * itemsPerPage,
              filteredDepartements.length
            )}{" "}
            sur {filteredDepartements.length} départements
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={handlePreviousPage}
              className="rounded-lg border border-gray-300 p-2 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              Page {safePage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={handleNextPage}
              className="rounded-lg border border-gray-300 p-2 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* INFORMATION */}

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100">
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              Gestion des départements
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Les départements permettent d'organiser
              les équipes de Ndao Hifanosika et de
              faciliter le suivi des membres, des projets
              et des activités.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}