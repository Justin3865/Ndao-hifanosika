"use client";

import Link from "next/link";
import { ArrowLeft, Save, ShieldAlert } from "lucide-react";
import { FormEvent, useState } from "react";

import {
  createBeneficiary,
  Beneficiary,
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

export default function CreateBeneficiaryPage() {
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    anonymise: false,
    dateNaissance: "",
    genre: "Non précisé" as Beneficiary["genre"],
    telephone: "",
    email: "",
    adresse: "",
    commune: "",
    region: "",

    categorie: "Jeune" as Beneficiary["categorie"],
    categorieVulnerabilite:
      "Aucune" as Beneficiary["categorieVulnerabilite"],

    situationSocioEconomique:
      "Non renseigné" as Beneficiary["situationSocioEconomique"],

    niveauEtude: "",
    profession: "",

    projectId: "PRJ-001",
    programmePrincipal: "Maison Digitale",

    dateInscription: new Date()
      .toISOString()
      .split("T")[0],

    statutParcours:
      "Inscrit" as Beneficiary["statutParcours"],

    etapeParcours: "Inscription",
    progression: 0,

    sessionsPrevues: 0,
    sessionsPresentes: 0,
    jalonsFranchis: 0,
    jalonsTotal: 0,

    derniereEvaluation: "",
    scoreEvaluation: null,
    satisfaction: null,

    insertionProfessionnelle: null,
    creationActivite: null,
    evolutionRevenus: "",
    impactCommentaire: "",

    suivi3Mois: "À suivre" as Beneficiary["suivi3Mois"],
    suivi6Mois: "À suivre" as Beneficiary["suivi6Mois"],
    suivi12Mois: "À suivre" as Beneficiary["suivi12Mois"],

    commentaires: "",
  });

  function updateField(
    field: string,
    value: string | number | boolean | null
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleProjectChange(
    projectId: string
  ) {
    const project = projects.find(
      (item) => item.id === projectId
    );

    setForm((previous) => ({
      ...previous,
      projectId,
      programmePrincipal:
        project?.name ?? "",
    }));
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const project = projects.find(
      (item) => item.id === form.projectId
    );

    createBeneficiary({
      nom: form.nom,
      prenom: form.prenom,
      anonymise: form.anonymise,

      dateNaissance: form.dateNaissance,
      genre: form.genre,
      telephone: form.telephone,
      email: form.email,
      adresse: form.adresse,
      commune: form.commune,
      region: form.region,

      categorie: form.categorie,
      categorieVulnerabilite:
        form.categorieVulnerabilite,

      situationSocioEconomique:
        form.situationSocioEconomique,

      niveauEtude: form.niveauEtude,
      profession: form.profession,

      projectIds: project
        ? [project.id]
        : [],

      projectNames: project
        ? [project.name]
        : [],

      programmePrincipal:
        form.programmePrincipal,

      dateInscription:
        form.dateInscription,

      statutParcours:
        form.statutParcours,

      etapeParcours:
        form.etapeParcours,

      progression:
        Number(form.progression),

      sessionsPrevues:
        Number(form.sessionsPrevues),

      sessionsPresentes:
        Number(form.sessionsPresentes),

      jalonsFranchis:
        Number(form.jalonsFranchis),

      jalonsTotal:
        Number(form.jalonsTotal),

      derniereEvaluation:
        form.derniereEvaluation,

      scoreEvaluation:
        form.scoreEvaluation,

      satisfaction:
        form.satisfaction,

      insertionProfessionnelle:
        form.insertionProfessionnelle,

      creationActivite:
        form.creationActivite,

      evolutionRevenus:
        form.evolutionRevenus,

      impactCommentaire:
        form.impactCommentaire,

      suivi3Mois:
        form.suivi3Mois,

      suivi6Mois:
        form.suivi6Mois,

      suivi12Mois:
        form.suivi12Mois,

      commentaires:
        form.commentaires,
    });

    window.location.href =
      "/beneficiaries";
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/beneficiaries"
            className="rounded-lg border bg-white p-2 hover:bg-gray-50"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Nouveau bénéficiaire
            </h1>

            <p className="text-sm text-gray-600">
              Inscription et création de la fiche de suivi.
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
                className="mt-0.5 text-red-600"
                size={22}
              />

              <div className="flex-1">
                <h2 className="font-semibold text-red-800">
                  Protection des données sensibles
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  Les données des enfants et des personnes
                  vulnérables doivent bénéficier d'une
                  protection renforcée.
                </p>

                <label className="mt-4 flex items-center gap-2 text-sm font-medium text-red-800">
                  <input
                    type="checkbox"
                    checked={form.anonymise}
                    onChange={(e) =>
                      updateField(
                        "anonymise",
                        e.target.checked
                      )
                    }
                  />

                  Anonymiser l'identité dans les affichages
                  autorisés
                </label>
              </div>
            </div>
          </section>

          {/* Identité */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              1. Identité du bénéficiaire
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Input
                label="Nom"
                required
                value={form.nom}
                onChange={(value) =>
                  updateField("nom", value)
                }
              />

              <Input
                label="Prénom"
                required
                value={form.prenom}
                onChange={(value) =>
                  updateField("prenom", value)
                }
              />

              <Input
                label="Date de naissance"
                type="date"
                value={form.dateNaissance}
                onChange={(value) =>
                  updateField(
                    "dateNaissance",
                    value
                  )
                }
              />

              <Select
                label="Genre"
                value={form.genre}
                onChange={(value) =>
                  updateField("genre", value)
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
                value={form.telephone}
                onChange={(value) =>
                  updateField(
                    "telephone",
                    value
                  )
                }
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) =>
                  updateField("email", value)
                }
              />

              <Input
                label="Commune"
                value={form.commune}
                onChange={(value) =>
                  updateField("commune", value)
                }
              />

              <Input
                label="Région"
                value={form.region}
                onChange={(value) =>
                  updateField("region", value)
                }
              />

              <div className="md:col-span-2">
                <Input
                  label="Adresse"
                  value={form.adresse}
                  onChange={(value) =>
                    updateField(
                      "adresse",
                      value
                    )
                  }
                />
              </div>

            </div>
          </section>

          {/* Profil */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              2. Profil socio-économique
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Select
                label="Catégorie"
                value={form.categorie}
                onChange={(value) =>
                  updateField(
                    "categorie",
                    value
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
                label="Catégorie de vulnérabilité"
                value={
                  form.categorieVulnerabilite
                }
                onChange={(value) =>
                  updateField(
                    "categorieVulnerabilite",
                    value
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
                  form.situationSocioEconomique
                }
                onChange={(value) =>
                  updateField(
                    "situationSocioEconomique",
                    value
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
                value={form.niveauEtude}
                onChange={(value) =>
                  updateField(
                    "niveauEtude",
                    value
                  )
                }
              />

              <Input
                label="Profession / activité"
                value={form.profession}
                onChange={(value) =>
                  updateField(
                    "profession",
                    value
                  )
                }
              />

            </div>
          </section>

          {/* Programme */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              3. Programme et inscription
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Select
                label="Programme / projet"
                value={form.projectId}
                onChange={handleProjectChange}
                options={projects.map(
                  (project) =>
                    project.id
                )}
                labels={projects.map(
                  (project) =>
                    project.name
                )}
              />

              <Input
                label="Date d'inscription"
                type="date"
                value={form.dateInscription}
                onChange={(value) =>
                  updateField(
                    "dateInscription",
                    value
                  )
                }
              />

              <Select
                label="Statut du parcours"
                value={form.statutParcours}
                onChange={(value) =>
                  updateField(
                    "statutParcours",
                    value
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
                value={form.etapeParcours}
                onChange={(value) =>
                  updateField(
                    "etapeParcours",
                    value
                  )
                }
              />

            </div>
          </section>

          {/* Suivi */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              4. Suivi du parcours
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Input
                label="Progression (%)"
                type="number"
                min="0"
                max="100"
                value={String(
                  form.progression
                )}
                onChange={(value) =>
                  updateField(
                    "progression",
                    Number(value)
                  )
                }
              />

              <Input
                label="Sessions prévues"
                type="number"
                min="0"
                value={String(
                  form.sessionsPrevues
                )}
                onChange={(value) =>
                  updateField(
                    "sessionsPrevues",
                    Number(value)
                  )
                }
              />

              <Input
                label="Sessions présentes"
                type="number"
                min="0"
                value={String(
                  form.sessionsPresentes
                )}
                onChange={(value) =>
                  updateField(
                    "sessionsPresentes",
                    Number(value)
                  )
                }
              />

              <Input
                label="Jalons franchis"
                type="number"
                min="0"
                value={String(
                  form.jalonsFranchis
                )}
                onChange={(value) =>
                  updateField(
                    "jalonsFranchis",
                    Number(value)
                  )
                }
              />

              <Input
                label="Nombre total de jalons"
                type="number"
                min="0"
                value={String(
                  form.jalonsTotal
                )}
                onChange={(value) =>
                  updateField(
                    "jalonsTotal",
                    Number(value)
                  )
                }
              />

            </div>
          </section>

          {/* Impact */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              5. Résultats et impact
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Select
                label="Insertion professionnelle"
                value={
                  form.insertionProfessionnelle ===
                  null
                    ? "Non renseigné"
                    : form.insertionProfessionnelle
                    ? "Oui"
                    : "Non"
                }
                onChange={(value) =>
                  updateField(
                    "insertionProfessionnelle",
                    value ===
                      "Non renseigné"
                      ? null
                      : value === "Oui"
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
                  form.creationActivite ===
                  null
                    ? "Non renseigné"
                    : form.creationActivite
                    ? "Oui"
                    : "Non"
                }
                onChange={(value) =>
                  updateField(
                    "creationActivite",
                    value ===
                      "Non renseigné"
                      ? null
                      : value === "Oui"
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
                value={form.evolutionRevenus}
                onChange={(value) =>
                  updateField(
                    "evolutionRevenus",
                    value
                  )
                }
              />

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Commentaire d'impact
                </label>

                <textarea
                  value={
                    form.impactCommentaire
                  }
                  onChange={(e) =>
                    updateField(
                      "impactCommentaire",
                      e.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

            </div>
          </section>

          {/* Post programme */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              6. Suivi post-programme
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <Select
                label="Suivi à 3 mois"
                value={form.suivi3Mois}
                onChange={(value) =>
                  updateField(
                    "suivi3Mois",
                    value
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
                label="Suivi à 6 mois"
                value={form.suivi6Mois}
                onChange={(value) =>
                  updateField(
                    "suivi6Mois",
                    value
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
                label="Suivi à 12 mois"
                value={form.suivi12Mois}
                onChange={(value) =>
                  updateField(
                    "suivi12Mois",
                    value
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
              Commentaires / observations
            </label>

            <textarea
              value={form.commentaires}
              onChange={(e) =>
                updateField(
                  "commentaires",
                  e.target.value
                )
              }
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Observations du coordinateur..."
            />
          </section>

          {/* Buttons */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <Link
              href="/beneficiaries"
              className="rounded-lg border bg-white px-5 py-2.5 text-center font-medium hover:bg-gray-50"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              <Save size={18} />
              Enregistrer
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
  required = false,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-red-500">
            {" "}
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        required={required}
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
  labels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: string[];
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
        {options.map((option, index) => (
          <option
            key={option}
            value={option}
          >
            {labels?.[index] ?? option}
          </option>
        ))}
      </select>
    </div>
  );
}