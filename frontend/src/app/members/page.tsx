"use client";

import Link from "next/link";
import {
  Eye,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  deleteMember,
  formatMemberDate,
  getMembers,
  type Member,
  type MemberStatus,
} from "@/lib/members";

import { AppLayout } from "@/components/layout";

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"Tous" | MemberStatus>("Tous");

  /* =======================================================
     CHARGEMENT DES MEMBRES
  ======================================================= */

  useEffect(() => {
    setMembers(getMembers());
  }, []);

  /* =======================================================
     FILTRAGE
  ======================================================= */

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        !query ||
        member.nom.toLowerCase().includes(query) ||
        member.prenom.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.matricule.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query) ||
        member.departement.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "Tous" ||
        member.statut === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

  /* =======================================================
     STATISTIQUES
  ======================================================= */

  const total = members.length;

  const actifs = members.filter(
    (member) => member.statut === "Actif"
  ).length;

  const inactifs = members.filter(
    (member) => member.statut === "Inactif"
  ).length;

  const conges = members.filter(
    (member) => member.statut === "En congé"
  ).length;

  /* =======================================================
     SUPPRESSION
  ======================================================= */

  const handleDelete = (member: Member) => {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer ${member.prenom} ${member.nom} ?`
    );

    if (!confirmed) {
      return;
    }

    deleteMember(member.id);

    setMembers(getMembers());
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppLayout>
      <div className="space-y-6">

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

          <span>Membres</span>
        </div>

        {/* =================================================
            TITRE + BOUTON
        ================================================= */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Membres
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Gestion et suivi des membres de l&apos;équipe.
            </p>
          </div>

          <Link
            href="/members/create"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un membre
          </Link>

        </div>

        {/* =================================================
            STATISTIQUES
        ================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* TOTAL */}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Total membres
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {total}
            </p>

          </div>

          {/* ACTIFS */}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Membres actifs
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {actifs}
            </p>

          </div>

          {/* CONGÉS */}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              En congé
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-600">
              {conges}
            </p>

          </div>

          {/* INACTIFS */}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Inactifs
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-600">
              {inactifs}
            </p>

          </div>

        </div>

        {/* =================================================
            FILTRES
        ================================================= */}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

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
                placeholder="Nom, prénom, email, matricule, fonction..."
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
                      | MemberStatus
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Tous">
                  Tous
                </option>

                <option value="Actif">
                  Actif
                </option>

                <option value="Inactif">
                  Inactif
                </option>

                <option value="En congé">
                  En congé
                </option>

                <option value="Terminé">
                  Terminé
                </option>

              </select>

            </div>

          </div>

        </div>

        {/* =================================================
            TABLEAU
        ================================================= */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          {/* TITRE TABLEAU */}

          <div className="border-b border-gray-200 px-5 py-4">

            <h2 className="text-lg font-semibold text-gray-900">
              Liste des membres
            </h2>

            <p className="text-sm text-gray-500">
              {filteredMembers.length} membre(s) trouvé(s)
            </p>

          </div>

          {/* SCROLL HORIZONTAL */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px] divide-y divide-gray-200">

              {/* HEADER */}

              <thead className="bg-gray-50">

                <tr>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Membre
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Fonction
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Département
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Projets
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Entrée
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Statut
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>

                </tr>

              </thead>

              {/* BODY */}

              <tbody className="divide-y divide-gray-200 bg-white">

                {filteredMembers.length === 0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-gray-500"
                    >
                      Aucun membre trouvé.
                    </td>

                  </tr>

                ) : (

                  filteredMembers.map((member) => (

                    <tr
                      key={member.id}
                      className="transition hover:bg-gray-50"
                    >

                      {/* MEMBRE */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                            {member.prenom.charAt(0)}
                            {member.nom.charAt(0)}
                          </div>

                          <div className="min-w-0">

                            <Link
                              href={`/members/${member.id}`}
                              className="font-semibold text-gray-900 transition hover:text-blue-600"
                            >
                              {member.prenom}{" "}
                              {member.nom}
                            </Link>

                            <p className="text-xs text-gray-500">
                              {member.matricule}
                            </p>

                            <p className="max-w-[250px] truncate text-xs text-gray-500">
                              {member.email}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* FONCTION */}

                      <td className="px-5 py-4">

                        <p className="font-medium text-gray-900">
                          {member.fonction}
                        </p>

                        <p className="text-xs text-gray-500">
                          {member.role}
                        </p>

                      </td>

                      {/* DÉPARTEMENT */}

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {member.departement}
                      </td>

                      {/* PROJETS */}

                      <td className="px-5 py-4">

                        <div className="flex max-w-[220px] flex-wrap gap-1">

                          {member.projectNames.length === 0 ? (

                            <span className="text-sm text-gray-400">
                              Aucun
                            </span>

                          ) : (

                            member.projectNames.map((project) => (

                              <span
                                key={project}
                                className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                              >
                                {project}
                              </span>

                            ))

                          )}

                        </div>

                      </td>

                      {/* DATE ENTRÉE */}

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {formatMemberDate(member.dateEntree)}
                      </td>

                      {/* STATUT */}

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            member.statut === "Actif"
                              ? "bg-green-100 text-green-700"
                              : member.statut === "En congé"
                              ? "bg-orange-100 text-orange-700"
                              : member.statut === "Terminé"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {member.statut}
                        </span>

                      </td>

                      {/* ACTIONS */}

                      <td className="px-5 py-4">

                        <div className="flex justify-end gap-1">

                          {/* VOIR */}

                          <Link
                            href={`/members/${member.id}`}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                            title="Voir"
                          >
                            <Eye size={17} />
                          </Link>

                          {/* MODIFIER */}

                          <Link
                            href={`/members/${member.id}/edit`}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-yellow-50 hover:text-yellow-600"
                            title="Modifier"
                          >
                            <Pencil size={17} />
                          </Link>

                          {/* SUPPRIMER */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(member)
                            }
                            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                            title="Supprimer"
                          >
                            <Trash2 size={17} />
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}