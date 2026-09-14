
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  formatMemberDate,
  getMemberById,
  Member,
} from "@/lib/members";

export default function MemberDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [member, setMember] =
    useState<Member | undefined>();

  useEffect(() => {
    setMember(getMemberById(id));
  }, [id]);

  if (!member) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Membre introuvable
          </h1>

          <p className="mt-2 text-gray-500">
            Aucun membre ne correspond à cet identifiant.
          </p>

          <Link
            href="/members"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Retour aux membres
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <Link
              href="/members"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Retour aux membres
            </Link>

            <div className="mt-4 flex items-center gap-4">

              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                {member.prenom.charAt(0)}
                {member.nom.charAt(0)}
              </div>

              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {member.prenom}{" "}
                  {member.nom}
                </h1>

                <p className="text-gray-500">
                  {member.matricule} ·{" "}
                  {member.fonction}
                </p>
              </div>

            </div>
          </div>

          <Link
            href={`/members/${member.id}/edit`}
            className="rounded-lg bg-yellow-500 px-5 py-3 text-center font-semibold text-white hover:bg-yellow-600"
          >
            Modifier
          </Link>

        </div>

        {/* Statut */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

          <div className="flex flex-wrap items-center gap-4">

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                member.statut === "Actif"
                  ? "bg-green-100 text-green-700"
                  : member.statut ===
                    "En congé"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {member.statut}
            </span>

            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              {member.role}
            </span>

            <span className="rounded-full bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700">
              {member.departement}
            </span>

          </div>

        </div>

        {/* Informations */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Informations personnelles
            </h2>

            <Info
              label="Nom complet"
              value={`${member.prenom} ${member.nom}`}
            />

            <Info
              label="Matricule"
              value={member.matricule}
            />

            <Info
              label="Email"
              value={member.email}
            />

            <Info
              label="Téléphone"
              value={member.telephone}
            />

            <Info
              label="Localisation"
              value={member.localisation}
            />

          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Fonction
            </h2>

            <Info
              label="Rôle"
              value={member.role}
            />

            <Info
              label="Fonction"
              value={member.fonction}
            />

            <Info
              label="Département"
              value={member.departement}
            />

            <Info
              label="Responsable"
              value={member.responsable}
            />

          </section>

        </div>

        {/* Projets */}
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Projets affectés
          </h2>

          {member.projectNames.length === 0 ? (
            <p className="text-gray-500">
              Aucun projet affecté.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {member.projectNames.map(
                (project) => (
                  <span
                    key={project}
                    className="rounded-lg bg-blue-50 px-4 py-3 font-medium text-blue-700"
                  >
                    {project}
                  </span>
                )
              )}
            </div>
          )}

        </section>

        {/* Compétences */}
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Compétences
          </h2>

          <div className="flex flex-wrap gap-2">

            {member.competences.map(
              (competence) => (
                <span
                  key={competence}
                  className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700"
                >
                  {competence}
                </span>
              )
            )}

          </div>

        </section>

        {/* Dates */}
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Informations administratives
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <Info
              label="Date d'entrée"
              value={formatMemberDate(
                member.dateEntree
              )}
            />

            <Info
              label="Date de sortie"
              value={formatMemberDate(
                member.dateSortie
              )}
            />

            <Info
              label="Dernière mise à jour"
              value={formatMemberDate(
                member.updatedAt
              )}
            />

          </div>

        </section>

        {/* Commentaires */}
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Commentaires
          </h2>

          <p className="whitespace-pre-wrap text-gray-600">
            {member.commentaires ||
              "Aucun commentaire."}
          </p>

        </section>

      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-4 border-b border-gray-100 pb-3 last:border-0">
      <p className="text-xs font-medium uppercase text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-gray-800">
        {value || "—"}
      </p>
    </div>
  );
}

