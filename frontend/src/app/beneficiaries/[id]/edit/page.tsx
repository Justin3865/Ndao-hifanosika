"use client";

import Link from "next/link";
import { ArrowLeft, Save, ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  Beneficiary,
  getBeneficiaryById,
  updateBeneficiary,
} from "@/lib/beneficiaries";

const projects = [
  {
    id: "PRJ-001",
    name: "Maison Digitale",
  },
  {
    id: "PRJ-002",
    name: "Kids Preneur",
  },
  {
    id: "PRJ-003",
    name: "Ankizy Innov",
  },
  {
    id: "PRJ-004",
    name: "Otrikasa",
  },
];

export default function EditBeneficiaryPage() {
  const params = useParams();

  const id = String(params.id);

  const [beneficiary, setBeneficiary] =
    useState<Beneficiary | null>(null);

  useEffect(() => {
    const data =
      getBeneficiaryById(id);

    if (data) {
      setBeneficiary(data);
    }
  }, [id]);

  if (!beneficiary) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-10 text-center">
          <h1 className="text-xl font-bold">
            Bénéficiaire introuvable
          </h1>

          <Link
            href="/beneficiaries"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            <ArrowLeft size={18} />
            Retour
          </Link>
        </div>
      </main>
    );
  }

  function updateField(
    field: keyof Beneficiary,
    value: unknown
  ) {
    setBeneficiary((previous) =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    updateBeneficiary(
      beneficiary.id,
      beneficiary
    );

    window.location.href =
      `/beneficiaries/${beneficiary.id}`;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/beneficiaries/${beneficiary.id}`}
            className="rounded-lg border bg-white p-2 hover:bg-gray-50"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold">
              Modifier le bénéficiaire
            </h1>

            <p className="text-sm text-gray-500">
              {beneficiary.code}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* Protection */}
          <section className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex gap-3">
              <ShieldAlert
                className="text-red-600"
                size={22}
              />

              <div>
                <h2 className="font-semibold text-red-800">
                  Confidentialité
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  Les informations concernant les mineurs
                  et les personnes vulnérables doivent être
                  protégées.
                </p>

                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={beneficiary.anonymise}
                    onChange={(e) =>
                      updateField(
                        "anonymise",
                        e.target.checked
                      )
                    }
                  />

                  Afficher le bénéficiaire sous forme
                  anonymisée
                </label>
              </div>
            </div>
          </section>

          {/* Identité */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Identité
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Input
                label="Nom"
                value={beneficiary.nom}
                onChange={(v) =>
                  updateField("nom", v)
                }
              />

              <Input
                label="Prénom"
                value={beneficiary.prenom}
                onChange={(v) =>
                  updateField("prenom", v)
                }
              />

              <Input
                label="Date de naissance"
                type="date"
                value={
                  beneficiary.dateNaissance
                }
                onChange={(v) =>
                  updateField(
                    "dateNaissance",
                    v
                  )
                }
              />

              <Select
                label="Genre"
                value={beneficiary.genre}
                onChange={(v) =>
                  updateField(
                    "genre",
                    v
                  )
                }
                options={[
                  "Femme",
                  "Homme",
                  "Autre",
                  "Non précisé",
                ]}
              />

              <Input
                label="Téléphone"
                value={
                  beneficiary.telephone
                }
                onChange={(v) =>
                  updateField(
                    "telephone",
                    v
                  )
                }
              />

              <Input
                label="Email"
                type="email"
                value={
                  beneficiary.email
                }
                onChange={(v) =>
                  updateField(
                    "email",
                    v
                  )
                }
              />

              <Input
                label="Commune"
                value={
                  beneficiary.commune
                }
                onChange={(v) =>
                  updateField(
                    "commune",
                    v
                  )
                }
              />

              <Input
                label="Région"
                value={
                  beneficiary.region
                }
                onChange={(v) =>
                  updateField(
                    "region",
                    v
                  )
                }
              />

            </div>
          </section>

          {/* Profil */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Profil socio-économique
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Select
                label="Catégorie"
                value={
                  beneficiary.categorie
                }
                onChange={(v) =>
                  updateField(
                    "categorie",
                    v
                  )
                }
                options={[
                  "Femme",
                  "Jeune",
                  "Enfant",
                  "Porteur de projet",
                  "Autre",
                ]}
              />

              <Select
                label="Vulnérabilité"
                value={
                  beneficiary.categorieVulnerabilite
                }
                onChange={(v) =>
                  updateField(
                    "categorieVulnerabilite",
                    v
                  )
                }
                options={[
                  "Aucune",
                  "Mineur",
                  "Femme vulnérable",
                  "Jeune vulnérable",
                  "Situation économique difficile",
                  "Handicap",
                  "Autre",
                ]}
              />

              <Select
                label="Situation socio-économique"
                value={
                  beneficiary.situationSocioEconomique
                }
                onChange={(v) =>
                  updateField(
                    "situationSocioEconomique",
                    v
                  )
                }
                options={[
                  "Très faible",
                  "Faible",
                  "Moyen",
                  "Stable",
                  "Non renseigné",
                ]}
              />

              <Input
                label="Niveau d'étude"
                value={
                  beneficiary.niveauEtude
                }
                onChange={(v) =>
                  updateField(
                    "niveauEtude",
                    v
                  )
                }
              />

              <Input
                label="Profession / activité"
                value={
                  beneficiary.profession
                }
                onChange={(v) =>
                  updateField(
                    "profession",
                    v
                  )
                }
              />

            </div>
          </section>

          {/* Programme */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Programme et parcours
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Select
                label="Programme principal"
                value={
                  beneficiary.programmePrincipal
                }
                onChange={(v) => {
                  const project =
                    projects.find(
                      (p) =>
                        p.name === v
                    );

                  updateField(
                    "programmePrincipal",
                    v
                  );

                  if (project) {
                    updateField(
                      "projectIds",
                      [project.id]
                    );

                    updateField(
                      "projectNames",
                      [project.name]
                    );
                  }
                }}
                options={projects.map(
                  (p) => p.name
                )}
              />

              <Input
                label="Date d'inscription"
                type="date"
                value={
                  beneficiary.dateInscription
                }
                onChange={(v) =>
                  updateField(
                    "dateInscription",
                    v
                  )
                }
              />

              <Select
                label="Statut du parcours"
                value={
                  beneficiary.statutParcours
                }
                onChange={(v) =>
                  updateField(
                    "statutParcours",
                    v
                  )
                }
                options={[
                  "Inscrit",
                  "Actif",
                  "En pause",
                  "Terminé",
                  "Abandonné",
                ]}
              />

              <Input
                label="Étape actuelle"
                value={
                  beneficiary.etapeParcours
                }
                onChange={(v) =>
                  updateField(
                    "etapeParcours",
                    v
                  )
                }
              />

            </div>
          </section>

          {/* Suivi */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Suivi et indicateurs
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <Input
                label="Progression (%)"
                type="number"
                min="0"
                max="100"
                value={String(
                  beneficiary.progression
                )}
                onChange={(v) =>
                  updateField(
                    "progression",
                    Number(v)
                  )
                }
              />

              <Input
                label="Sessions prévues"
                type="number"
                min="0"
                value={String(
                  beneficiary.sessionsPrevues
                )}
                onChange={(v) =>
                  updateField(
                    "sessionsPrevues",
                    Number(v)
                  )
                }
              />

              <Input
                label="Sessions présentes"
                type="number"
                min="0"
                value={String(
                  beneficiary.sessionsPresentes
                )}
                onChange={(v) =>
                  updateField(
                    "sessionsPresentes",
                    Number(v)
                  )
                }
              />

              <Input
                label="Jalons franchis"
                type="number"
                min="0"
                value={String(
                  beneficiary.jalonsFranchis
                )}
                onChange={(v) =>
                  updateField(
                    "jalonsFranchis",
                    Number(v)
                  )
                }
              />

              <Input
                label="Jalons total"
                type="number"
                min="0"
                value={String(
                  beneficiary.jalonsTotal
                )}
                onChange={(v) =>
                  updateField(
                    "jalonsTotal",
                    Number(v)
                  )
                }
              />

              <Input
                label="Score d'évaluation"
                type="number"
                min="0"
                max="100"
                value={
                  beneficiary.scoreEvaluation ===
                  null
                    ? ""
                    : String(
                        beneficiary.scoreEvaluation
                      )
                }
                onChange={(v) =>
                  updateField(
                    "scoreEvaluation",
                    v === ""
                      ? null
                      : Number(v)
                  )
                }
              />

            </div>
          </section>

          {/* Impact */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Résultats et impact
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Select
                label="Insertion professionnelle"
                value={
                  beneficiary.insertionProfessionnelle ===
                  null
                    ? "Non renseigné"
                    : beneficiary.insertionProfessionnelle
                    ? "Oui"
                    : "Non"
                }
                onChange={(v) =>
                  updateField(
                    "insertionProfessionnelle",
                    v ===
                      "Non renseigné"
                      ? null
                      : v === "Oui"
                  )
                }
                options={[
                  "Non renseigné",
                  "Oui",
                  "Non",
                ]}
              />

              <Select
                label="Création d'activité"
                value={
                  beneficiary.creationActivite ===
                  null
                    ? "Non renseigné"
                    : beneficiary.creationActivite
                    ? "Oui"
                    : "Non"
                }
                onChange={(v) =>
                  updateField(
                    "creationActivite",
                    v ===
                      "Non renseigné"
                      ? null
                      : v === "Oui"
                  )
                }
                options={[
                  "Non renseigné",
                  "Oui",
                  "Non",
                ]}
              />

              <Input
                label="Évolution des revenus"
                value={
                  beneficiary.evolutionRevenus
                }
                onChange={(v) =>
                  updateField(
                    "evolutionRevenus",
                    v
                  )
                }
              />

            </div>
          </section>

          {/* Post programme */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-semibold">
              Suivi post-programme
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <Select
                label="3 mois"
                value={
                  beneficiary.suivi3Mois
                }
                onChange={(v) =>
                  updateField(
                    "suivi3Mois",
                    v
                  )
                }
                options={[
                  "À suivre",
                  "En cours",
                  "Terminé",
                  "Non disponible",
                ]}
              />

              <Select
                label="6 mois"
                value={
                  beneficiary.suivi6Mois
                }
                onChange={(v) =>
                  updateField(
                    "suivi6Mois",
                    v
                  )
                }
                options={[
                  "À suivre",
                  "En cours",
                  "Terminé",
                  "Non disponible",
                ]}
              />

              <Select
                label="12 mois"
                value={
                  beneficiary.suivi12Mois
                }
                onChange={(v) =>
                  updateField(
                    "suivi12Mois",
                    v
                  )
                }
                options={[
                  "À suivre",
                  "En cours",
                  "Terminé",
                  "Non disponible",
                ]}
              />

            </div>
          </section>

          {/* Commentaires */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <label className="mb-2 block text-sm font-medium">
              Commentaires
            </label>

            <textarea
              value={
                beneficiary.commentaires
              }
              onChange={(e) =>
                updateField(
                  "commentaires",
                  e.target.value
                )
              }
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            />

          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <Link
              href={`/beneficiaries/${beneficiary.id}`}
              className="rounded-lg border bg-white px-5 py-2.5 text-center font-medium hover:bg-gray-50"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              <Save size={18} />
              Enregistrer les modifications
            </button>

          </div>

        </form>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}