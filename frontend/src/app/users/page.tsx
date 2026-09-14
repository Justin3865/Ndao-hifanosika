"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { AppLayout } from "@/components/layout";

type UserStatus = "Actif" | "Inactif" | "Suspendu";

type UserItem = {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  status: UserStatus;
  lastLogin: string;
  initials: string;
};

const initialUsers: UserItem[] = [
  {
    id: 1,
    name: "Jean Rakoto",
    email: "jean.rakoto@ndao-hifanosika.org",
    role: "Administrateur",
    department: "Direction",
    phone: "+261 34 00 000 01",
    status: "Actif",
    lastLogin: "02/09/2026 08:45",
    initials: "JR",
  },
  {
    id: 2,
    name: "Marie Andria",
    email: "marie.andria@ndao-hifanosika.org",
    role: "Responsable S&E",
    department: "DSI",
    phone: "+261 34 00 000 02",
    status: "Actif",
    lastLogin: "02/09/2026 09:10",
    initials: "MA",
  },
  {
    id: 3,
    name: "Paul Rabe",
    email: "paul.rabe@ndao-hifanosika.org",
    role: "Chef de projet",
    department: "Communication",
    phone: "+261 34 00 000 03",
    status: "Actif",
    lastLogin: "01/09/2026 15:20",
    initials: "PR",
  },
  {
    id: 4,
    name: "Sarah Rakoto",
    email: "sarah.rakoto@ndao-hifanosika.org",
    role: "Chargée RH",
    department: "RH",
    phone: "+261 34 00 000 04",
    status: "Actif",
    lastLogin: "01/09/2026 14:30",
    initials: "SR",
  },
  {
    id: 5,
    name: "David Ranaivo",
    email: "david.ranaivo@ndao-hifanosika.org",
    role: "Assistant",
    department: "DAF",
    phone: "+261 34 00 000 05",
    status: "Inactif",
    lastLogin: "28/08/2026 10:15",
    initials: "DR",
  },
  {
    id: 6,
    name: "Lucien Razaf",
    email: "lucien.razaf@ndao-hifanosika.org",
    role: "Évaluateur",
    department: "DSI",
    phone: "+261 34 00 000 06",
    status: "Actif",
    lastLogin: "02/09/2026 07:55",
    initials: "LR",
  },
  {
    id: 7,
    name: "Nathalie Raso",
    email: "nathalie.raso@ndao-hifanosika.org",
    role: "Coordinatrice",
    department: "Direction",
    phone: "+261 34 00 000 07",
    status: "Suspendu",
    lastLogin: "25/08/2026 11:40",
    initials: "NR",
  },
  {
    id: 8,
    name: "Hery Andri",
    email: "hery.andri@ndao-hifanosika.org",
    role: "Agent terrain",
    department: "Communication",
    phone: "+261 34 00 000 08",
    status: "Actif",
    lastLogin: "02/09/2026 08:20",
    initials: "HA",
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [departmentFilter, setDepartmentFilter] = useState("Tous");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        user.name.toLowerCase().includes(searchValue) ||
        user.email.toLowerCase().includes(searchValue) ||
        user.role.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "Tous" || user.status === statusFilter;

      const matchesDepartment =
        departmentFilter === "Tous" ||
        user.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [users, search, statusFilter, departmentFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / itemsPerPage)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedUsers = filteredUsers.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const activeUsers = users.filter(
    (user) => user.status === "Actif"
  ).length;

  const inactiveUsers = users.filter(
    (user) => user.status === "Inactif"
  ).length;

  const suspendedUsers = users.filter(
    (user) => user.status === "Suspendu"
  ).length;

  const handleDelete = (id: number) => {
    const user = users.find((item) => item.id === id);

    if (!user) return;

    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer l'utilisateur "${user.name}" ?`
    );

    if (!confirmed) return;

    setUsers((currentUsers) =>
      currentUsers.filter((item) => item.id !== id)
    );

    const newFilteredLength = filteredUsers.length - 1;

    const newTotalPages = Math.max(
      1,
      Math.ceil(newFilteredLength / itemsPerPage)
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
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentFilter(value);
    setCurrentPage(1);
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

            <span>Utilisateurs</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Utilisateurs
          </h2>

          <p className="mt-1 text-gray-500">
            Gérez les comptes et les accès des utilisateurs.
          </p>
        </div>

        {/* BOUTON AJOUTER - BLEU */}
        <Link
          href="/users/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Ajouter un utilisateur
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
              <Users className="h-6 w-6 text-purple-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Total utilisateurs
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {users.length}
              </p>
            </div>
          </div>
        </div>

        {/* ACTIFS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Utilisateurs actifs
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {activeUsers}
              </p>
            </div>
          </div>
        </div>

        {/* INACTIFS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
              <UserX className="h-6 w-6 text-gray-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Inactifs
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {inactiveUsers}
              </p>
            </div>
          </div>
        </div>

        {/* SUSPENDUS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <ShieldCheck className="h-6 w-6 text-red-600" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Suspendus
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {suspendedUsers}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          FILTRES
      ========================================================= */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* RECHERCHE */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* STATUT */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <select
              value={statusFilter}
              onChange={(e) =>
                handleStatusChange(e.target.value)
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

              <option value="Suspendu">
                Suspendu
              </option>
            </select>
          </div>

          {/* DEPARTEMENT */}
          <select
            value={departmentFilter}
            onChange={(e) =>
              handleDepartmentChange(e.target.value)
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="Tous">
              Tous les départements
            </option>

            <option value="Direction">
              Direction
            </option>

            <option value="DSI">
              DSI
            </option>

            <option value="DAF">
              DAF
            </option>

            <option value="Communication">
              Communication
            </option>

            <option value="RH">
              RH
            </option>
          </select>
        </div>
      </div>

      {/* =========================================================
          TABLE
      ========================================================= */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Utilisateur
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Rôle
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Département
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Statut
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                  Dernière connexion
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-gray-50"
                  >
                    {/* UTILISATEUR */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
                          <span className="text-sm font-semibold text-purple-700">
                            {user.initials}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">
                            {user.name}
                          </p>

                          <p className="truncate text-sm text-gray-500">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* ROLE */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-700">
                        {user.role}
                      </span>
                    </td>

                    {/* DEPARTEMENT */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-700">
                        {user.department}
                      </span>
                    </td>

                    {/* STATUT */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.status === "Actif"
                            ? "bg-green-100 text-green-700"
                            : user.status === "Inactif"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    {/* DERNIERE CONNEXION */}
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {user.lastLogin}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* VOIR */}
                        <Link
                          href={`/users/${user.id}`}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        {/* MODIFIER */}
                        <Link
                          href={`/users/${user.id}/edit`}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>

                        {/* SUPPRIMER - ROUGE */}
                        <button
                          type="button"
                          onClick={() => handleDelete(user.id)}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center"
                  >
                    <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />

                    <p className="font-medium text-gray-700">
                      Aucun utilisateur trouvé
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

        {/* =====================================================
            PAGINATION
        ===================================================== */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            Affichage de{" "}
            {filteredUsers.length === 0
              ? 0
              : (safePage - 1) * itemsPerPage + 1}{" "}
            à{" "}
            {Math.min(
              safePage * itemsPerPage,
              filteredUsers.length
            )}{" "}
            sur {filteredUsers.length} utilisateurs
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
                  Math.min(totalPages, page + 1)
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