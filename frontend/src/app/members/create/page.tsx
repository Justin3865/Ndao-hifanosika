
"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createMember,
  MemberRole,
  MemberStatus,
} from "@/lib/members";

export default function CreateMemberPage() {
  const [form, setForm] = useState({
    matricule: "",
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    role: "Assistant" as MemberRole,
    departement: "DSI",
    fonction: "",
    projectIds: "",
    projectNames: "",
    dateEntree: "",
    dateSortie: "",
    statut: "Actif" as MemberStatus,
    localisation: "",
    responsable: "",
    competences: "",
    commentaires: "",
  });

  const [error, setError] = useState("");

  const handleChange = (
    field: string,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !form.nom.trim() ||
      !form.prenom.trim() ||
      !form.email.trim() ||
      !form.fonction.trim()
    ) {
      setError(
        "Veuillez remplir les champs obligatoires."
      );

      return;
    }

    createMember({
      matricule:
        form.matricule ||
        `NH-${Date.now()}`,
      nom: form.nom,
      prenom: form.prenom,
      email: form.email,
      telephone: form.telephone,
      role: form.role,
      departement: form.departement,
      fonction: form.fonction,

      projectIds: form.projectIds
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),

      projectNames: form.projectNames
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),

      dateEntree: form.dateEntree,
      dateSortie: form.dateSortie,

      statut: form.statut,

      localisation:
        form.localisation,

      responsable:
        form.responsable,

      competences:
        form.competences
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),

      commentaires:
        form.commentaires,
    });

    window.location.href = "/members";
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6">
          <Link
            href="/members"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Retour aux membres
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Ajouter un membre
          </h1>

          <p className="mt-1 text-gray-600">
            Enregistrer un nouveau membre de
            l&apos;équipe.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

            <h2 className="mb-5 text-xl font-semibold">
              Informations personnelles
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <Field
                label="Prénom"
                required
                value={form.prenom}
                onChange={(value) =>
                  handleChange(
                    "prenom",
                    value
                  )
                }
              />

              <Field
                label="Nom"
                required
                value={form.nom}
                onChange={(value) =>
                  handleChange(
                    "nom",
                    value
                  )
                }
              />

              <Field
                label="Matricule"
                value={form.matricule}
                onChange={(value) =>
                  handleChange(
                    "matricule",
                    value
                  )
                }
              />

              <Field
                label="Email"
                required
                type="email"
                value={form.email}
                onChange={(value) =>
                  handleChange(
                    "email",
                    value
                  )
                }
              />

              <Field
                label="Téléphone"
                value={form.telephone}
                onChange={(value) =>
                  handleChange(
                    "telephone",
                    value
                  )
                }
              />

              <Field
                label="Localisation"
                value={form.localisation}
                onChange={(value) =>
                  handleChange(
                    "localisation",
                    value
                  )
                }
              />

            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

            <h2 className="mb-5 text-xl font-semibold">
              Fonction et affectation
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <SelectField
                label="Rôle"
                value={form.role}
                onChange={(value) =>
                  handleChange(
                    "role",
                    value
                  )
                }
                options={[
                  "Administrateur",
                  "Coordinateur",
                  "Responsable S&E",
                  "Chef de projet",
                  "Chargé de projet",
                  "Assistant",
                  "Stagiaire",
                ]}
              />

              <Field
                label="Fonction"
                required
                value={form.fonction}
                onChange={(value) =>
                  handleChange(
                    "fonction",
                    value
                  )
                }
              />

              <Field
                label="Département"
                value={form.departement}
                onChange={(value) =>
                  handleChange(
                    "departement",
                    value
                  )
                }
              />

              <Field
                label="Responsable"
                value={form.responsable}
                onChange={(value) =>
                  handleChange(
                    "responsable",
                    value
                  )
                }
              />

              <Field
                label="Projets"
                value={form.projectNames}
                placeholder="Maison Digitale, Kids Preneur"
                onChange={(value) =>
                  handleChange(
                    "projectNames",
                    value
                  )
                }
              />

              <Field
                label="IDs projets"
                value={form.projectIds}
                placeholder="PRJ-001, PRJ-002"
                onChange={(value) =>
                  handleChange(
                    "projectIds",
                    value
                  )
                }
              />

            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

            <h2 className="mb-5 text-xl font-semibold">
              Suivi administratif
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              <Field
                label="Date d'entrée"
                type="date"
                value={form.dateEntree}
                onChange={(value) =>
                  handleChange(
                    "dateEntree",
                    value
                  )
                }
              />

              <Field
                label="Date de sortie"
                type="date"
                value={form.dateSortie}
                onChange={(value) =>
                  handleChange(
                    "dateSortie",
                    value
                  )
                }
              />

              <SelectField
                label="Statut"
                value={form.statut}
                onChange={(value) =>
                  handleChange(
                    "statut",
                    value
                  )
                }
                options={[
                  "Actif",
                  "Inactif",
                  "En congé",
                  "Terminé",
                ]}
              />

            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

            <h2 className="mb-5 text-xl font-semibold">
              Compétences et commentaires
            </h2>

            <div className="space-y-5">

              <Field
                label="Compétences"
                value={form.competences}
                placeholder="Gestion de projet, Analyse de données"
                onChange={(value) =>
                  handleChange(
                    "competences",
                    value
                  )
                }
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Commentaires
                </label>

                <textarea
                  value={form.commentaires}
                  onChange={(event) =>
                    handleChange(
                      "commentaires",
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

            </div>
          </section>

          <div className="flex justify-end gap-3">

            <Link
              href="/members"
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Enregistrer le membre
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-red-500">
            {" "}*
          </span>
        )}
      </label>

      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function SelectField({
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
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

