"use client";

import Link from "next/link";
import {
  Activity,
  ClipboardCheck,
  Eye,
  Heart,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  calculateAttendanceRate,
  deleteBeneficiary,
  getBeneficiaries,
  type Beneficiary,
  type BeneficiaryStatus,
  type VulnerabilityCategory,
} from "@/lib/beneficiaries";

import { AppLayout } from "@/components/layout";

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<
    Beneficiary[]
  >([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | BeneficiaryStatus>("all");

  const [vulnerabilityFilter, setVulnerabilityFilter] =
    useState<"all" | VulnerabilityCategory>("all");

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  /* =========================================================
     CHARGEMENT DES BENEFICIAIRES
  ========================================================= */

  useEffect(() => {
    setBeneficiaries(getBeneficiaries());
  }, []);

  /* =========================================================
     RECHERCHE + FILTRES
  ========================================================= */

  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((beneficiary) => {
      const searchText =
        `${beneficiary.nom} ${beneficiary.prenom} ${beneficiary.code} ${beneficiary.programmePrincipal} ${beneficiary.commune} ${beneficiary.email}`.toLowerCase();

      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        searchText.includes(searchValue);

      const matchesStatus =
        statusFilter === "all" ||
        beneficiary.statutParcours === statusFilter;

      const matchesVulnerability =
        vulnerabilityFilter === "all" ||
        beneficiary.categorieVulnerabilite ===
          vulnerabilityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesVulnerability
      );
    });
  }, [
    beneficiaries,
    search,
    statusFilter,
    vulnerabilityFilter,
  ]);

  /* =========================================================
     PAGINATION
  ========================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredBeneficiaries.length / itemsPerPage
    )
  );

  const safePage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedBeneficiaries =
    filteredBeneficiaries.slice(
      (safePage - 1) * itemsPerPage,
      safePage * itemsPerPage
    );

  /* =========================================================
     STATISTIQUES
  ========================================================= */

  const stats = useMemo(() => {
    const active = beneficiaries.filter(
      (beneficiary) =>
        beneficiary.statutParcours === "Actif"
    ).length;

    const completed = beneficiaries.filter(
      (beneficiary) =>
        beneficiary.statutParcours === "Terminé"
    ).length;

    const vulnerable = beneficiaries.filter(
      (beneficiary) =>
        beneficiary.categorieVulnerabilite !==
        "Aucune"
    ).length;

    const minors = beneficiaries.filter(
      (beneficiary) =>
        beneficiary.categorieVulnerabilite === "Mineur"
    ).length;

    const averageProgress =
      beneficiaries.length > 0
        ? Math.round(
            beneficiaries.reduce(
              (sum, beneficiary) =>
                sum + beneficiary.progression,
              0
            ) / beneficiaries.length
          )
        : 0;

    return {
      total: beneficiaries.length,
      active,
      completed,
      vulnerable,
      minors,
      averageProgress,
    };
  }, [beneficiaries]);

  /* =========================================================
     RECHERCHE
  ========================================================= */

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  /* =========================================================
     FILTRE STATUT
  ========================================================= */

  const handleStatusChange = (
    value: "all" | BeneficiaryStatus
  ) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  /* =========================================================
     FILTRE VULNERABILITE
  ========================================================= */

  const handleVulnerabilityChange = (
    value: "all" | VulnerabilityCategory
  ) => {
    setVulnerabilityFilter(value);
    setCurrentPage(1);
  };

  /* =========================================================
     SUPPRESSION
  ========================================================= */

  const handleDelete = (
    beneficiary: Beneficiary
  ) => {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le bénéficiaire "${beneficiary.code}" ?`
    );

    if (!confirmed) {
      return;
    }

    deleteBeneficiary(beneficiary.id);

    setBeneficiaries(getBeneficiaries());

    const newFilteredLength =
      filteredBeneficiaries.length - 1;

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

  /* =========================================================
     STATUT
  ========================================================= */

  function statusClass(
    status: BeneficiaryStatus
  ) {
    switch (status) {
      case "Actif":
        return "bg-green-100 text-green-700";

      case "Inscrit":
        return "bg-blue-100 text-blue-700";

      case "En pause":
        return "bg-yellow-100 text-yellow-700";

      case "Terminé":
        return "bg-gray-100 text-gray-700";

      case "Abandonné":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  /* =========================================================
     VULNERABILITE
  ========================================================= */

  function vulnerabilityClass(
    category: VulnerabilityCategory
  ) {
    if (category === "Aucune") {
      return "text-gray-500";
    }

    return "text-red-600";
  }

  /* =========================================================
     PAGE SUIVANTE
  ========================================================= */

  const handleNextPage = () => {
    setCurrentPage((page) =>
      Math.min(totalPages, page + 1)
    );
  };

  /* =========================================================
     PAGE PRECEDENTE
  ========================================================= */

  const handlePreviousPage = () => {
    setCurrentPage((page) =>
      Math.max(1, page - 1)
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

              <span>Bénéficiaires</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Bénéficiaires
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Gestion, suivi du parcours et évaluation
              des bénéficiaires.
            </p>
          </div>

          {/* BOUTON AJOUTER */}

          <Link
            href="/beneficiaries/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Nouveau bénéficiaire
          </Link>
        </div>

        {/* =================================================
            STATISTIQUES
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

          {/* TOTAL */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Total
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
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
                  Actifs
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {stats.active}
                </p>
              </div>
            </div>
          </div>

          {/* TERMINES */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                <ClipboardCheck className="h-6 w-6 text-gray-600" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Terminés
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {stats.completed}
                </p>
              </div>
            </div>
          </div>

          {/* VULNERABLES */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                <ShieldAlert className="h-6 w-6 text-red-600" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Vulnérables
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {stats.vulnerable}
                </p>
              </div>
            </div>
          </div>

          {/* PROGRESSION */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Progression moyenne
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageProgress}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            FILTRES
        ================================================= */}

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* RECHERCHE */}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  handleSearch(event.target.value)
                }
                placeholder="Rechercher un bénéficiaire..."
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* STATUT */}

            <select
              value={statusFilter}
              onChange={(event) =>
                handleStatusChange(
                  event.target.value as
                    | "all"
                    | BeneficiaryStatus
                )
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                Tous les statuts
              </option>

              <option value="Actif">
                Actif
              </option>

              <option value="Inscrit">
                Inscrit
              </option>

              <option value="En pause">
                En pause
              </option>

              <option value="Terminé">
                Terminé
              </option>

              <option value="Abandonné">
                Abandonné
              </option>
            </select>

            {/* VULNERABILITE */}

            <select
              value={vulnerabilityFilter}
              onChange={(event) =>
                handleVulnerabilityChange(
                  event.target.value as
                    | "all"
                    | VulnerabilityCategory
                )
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                Toutes les vulnérabilités
              </option>

              <option value="Aucune">
                Aucune
              </option>

              <option value="Mineur">
                Mineur
              </option>

              <option value="Handicap">
                Handicap
              </option>

              <option value="Déplacé">
                Déplacé
              </option>

              <option value="Autre">
                Autre
              </option>
            </select>
          </div>
        </div>

        {/* =================================================
            TABLEAU
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">

              {/* HEADER */}

              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Bénéficiaire
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Code
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Programme
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Commune
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Statut
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Vulnérabilité
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Progression
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Présence
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>

                </tr>
              </thead>

              {/* BODY */}

              <tbody className="divide-y divide-gray-100">

                {paginatedBeneficiaries.length > 0 ? (
                  paginatedBeneficiaries.map(
                    (beneficiary) => (
                      <tr
                        key={beneficiary.id}
                        className="transition hover:bg-gray-50"
                      >

                        {/* BENEFICIAIRE */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                              {beneficiary.prenom
                                .charAt(0)
                                .toUpperCase()}

                              {beneficiary.nom
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">
                                {beneficiary.prenom}{" "}
                                {beneficiary.nom}
                              </p>

                              <p className="max-w-[220px] truncate text-sm text-gray-500">
                                {beneficiary.email || "—"}
                              </p>
                            </div>

                          </div>
                        </td>

                        {/* CODE */}

                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-gray-700">
                            {beneficiary.code}
                          </span>
                        </td>

                        {/* PROGRAMME */}

                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-700">
                            {beneficiary.programmePrincipal}
                          </span>
                        </td>

                        {/* COMMUNE */}

                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-700">
                            {beneficiary.commune}
                          </span>
                        </td>

                        {/* STATUT */}

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                              beneficiary.statutParcours
                            )}`}
                          >
                            {beneficiary.statutParcours}
                          </span>
                        </td>

                        {/* VULNERABILITE */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">

                            {beneficiary.categorieVulnerabilite !==
                              "Aucune" && (
                              <ShieldAlert className="h-4 w-4 text-red-500" />
                            )}

                            <span
                              className={`text-sm font-medium ${vulnerabilityClass(
                                beneficiary.categorieVulnerabilite
                              )}`}
                            >
                              {
                                beneficiary.categorieVulnerabilite
                              }
                            </span>

                          </div>
                        </td>

                        {/* PROGRESSION */}

                        <td className="px-5 py-4">
                          <div className="w-28">

                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-600">
                                {beneficiary.progression}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{
                                  width: `${Math.min(
                                    Math.max(
                                      beneficiary.progression,
                                      0
                                    ),
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                          </div>
                        </td>

                        {/* PRESENCE */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">

                            <Heart className="h-4 w-4 text-pink-500" />

                            <span className="text-sm font-medium text-gray-700">
                              {calculateAttendanceRate(
                                beneficiary
                              )}
                              %
                            </span>

                          </div>
                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">

                            {/* VOIR */}

                            <Link
                              href={`/beneficiaries/${beneficiary.id}`}
                              className="rounded-lg p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600"
                              title="Voir"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>

                            {/* MODIFIER */}

                            <Link
                              href={`/beneficiaries/${beneficiary.id}/edit`}
                              className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>

                            {/* SUPPRIMER */}

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  beneficiary
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

                  /* ETAT VIDE */

                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center"
                    >
                      <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />

                      <p className="font-medium text-gray-700">
                        Aucun bénéficiaire trouvé
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Modifiez vos critères de
                        recherche ou de filtrage.
                      </p>

                      <Link
                        href="/beneficiaries/create"
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter un bénéficiaire
                      </Link>
                    </td>
                  </tr>

                )}

              </tbody>
            </table>
          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row">

            <p className="text-sm text-gray-500">
              Affichage de{" "}
              {filteredBeneficiaries.length === 0
                ? 0
                : (safePage - 1) *
                    itemsPerPage +
                  1}{" "}
              à{" "}
              {Math.min(
                safePage * itemsPerPage,
                filteredBeneficiaries.length
              )}{" "}
              sur{" "}
              {filteredBeneficiaries.length}{" "}
              bénéficiaire
              {filteredBeneficiaries.length > 1
                ? "s"
                : ""}
            </p>

            <div className="flex items-center gap-2">

              {/* PRECEDENT */}

              <button
                type="button"
                disabled={safePage <= 1}
                onClick={handlePreviousPage}
                className="rounded-lg border border-gray-300 p-2 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* PAGE */}

              <span className="px-4 py-2 text-sm font-medium text-gray-700">
                Page {safePage} / {totalPages}
              </span>

              {/* SUIVANT */}

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

        {/* =================================================
            INFORMATION
        ================================================= */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">
                Gestion des bénéficiaires
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Cette section permet de gérer les
                bénéficiaires, suivre leur parcours,
                consulter leur progression, leur présence
                et identifier les situations de
                vulnérabilité.
              </p>
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}