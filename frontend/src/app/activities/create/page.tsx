"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createActivity,
  ActivityStatus,
} from "@/lib/activities";

export default function CreateActivityPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    code: "",
    nom: "",
    description: "",

    projectId: "project-001",
    projectName: "Maison Digitale",

    responsable: "",

    dateDebut: "",
    dateFin: "",

    statut: "Planifiée" as ActivityStatus,

    progression: "0",

    indicateur: "",
    cible: "0",
    unite: "personnes",
    valeurActuelle: "0",

    budget: "0",
    devise: "MGA",

    nombreBeneficiaires: "0",
  });

  const [error, setError] =
    useState("");

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement |
        HTMLTextAreaElement |
        HTMLSelectElement
    >
  ) => {
    const { name, value } =
      event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (
      name === "projectId"
    ) {
      const projects: Record<
        string,
        string
      > = {
        "project-001":
          "Maison Digitale",
        "project-002":
          "Kids Preneur",
        "project-003":
          "Ankizy Innov",
        "project-004":
          "Otrikasa",
      };

      setForm((previous) => ({
        ...previous,
        [name]: value,
        projectName:
          projects[value] ??
          "",
      }));
    }
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!form.code.trim()) {
      setError(
        "Le code de l'activité est obligatoire."
      );
      return;
    }

    if (!form.nom.trim()) {
      setError(
        "Le nom de l'activité est obligatoire."
      );
      return;
    }

    if (!form.dateDebut || !form.dateFin) {
      setError(
        "Les dates sont obligatoires."
      );
      return;
    }

    if (
      form.dateFin <
      form.dateDebut
    ) {
      setError(
        "La date de fin doit être postérieure à la date de début."
      );
      return;
    }

    const activity =
      createActivity({
        code: form.code.trim(),

        nom: form.nom.trim(),

        description:
          form.description.trim(),

        projectId:
          form.projectId,

        projectName:
          form.projectName,

        responsable:
          form.responsable.trim(),

        dateDebut:
          form.dateDebut,

        dateFin:
          form.dateFin,

        statut:
          form.statut,

        progression:
          Math.min(
            100,
            Math.max(
              0,
              Number(
                form.progression
              ) || 0
            )
          ),

        indicateur:
          form.indicateur.trim(),

        cible:
          Number(form.cible) || 0,

        unite:
          form.unite,

        valeurActuelle:
          Number(
            form.valeurActuelle
          ) || 0,

        budget:
          Number(form.budget) || 0,

        devise:
          form.devise,

        nombreBeneficiaires:
          Number(
            form.nombreBeneficiaires
          ) || 0,
      });

    router.push(
      `/activities/${activity.id}`
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-5xl">

        <div className="mb-8">

          <Link
            href="/activities"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Retour aux activités
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Nouvelle activité
          </h1>

          <p className="mt-2 text-gray-600">
            Ajouter une activité à un projet
            de Ndao Hifanosika.
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Informations */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Informations générales
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Code *
                </label>

                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Ex. MD-ACT-001"
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Nom de l'activité *
                </label>

                <input
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  placeholder="Nom de l'activité"
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

            </div>

          </section>

          {/* Projet */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Projet et responsabilité
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Projet *
                </label>

                <select
                  name="projectId"
                  value={form.projectId}
                  onChange={handleChange}
                  className="w-full rounded-lg border bg-white px-4 py-3"
                >

                  <option value="project-001">
                    Maison Digitale
                  </option>

                  <option value="project-002">
                    Kids Preneur
                  </option>

                  <option value="project-003">
                    Ankizy Innov
                  </option>

                  <option value="project-004">
                    Otrikasa
                  </option>

                </select>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Responsable
                </label>

                <input
                  name="responsable"
                  value={form.responsable}
                  onChange={handleChange}
                  placeholder="Responsable de l'activité"
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

            </div>

          </section>

          {/* Planning */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Planning et état
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Date de début *
                </label>

                <input
                  type="date"
                  name="dateDebut"
                  value={form.dateDebut}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Date de fin *
                </label>

                <input
                  type="date"
                  name="dateFin"
                  value={form.dateFin}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Statut
                </label>

                <select
                  name="statut"
                  value={form.statut}
                  onChange={handleChange}
                  className="w-full rounded-lg border bg-white px-4 py-3"
                >

                  <option value="Planifiée">
                    Planifiée
                  </option>

                  <option value="En cours">
                    En cours
                  </option>

                  <option value="Terminée">
                    Terminée
                  </option>

                  <option value="Suspendue">
                    Suspendue
                  </option>

                </select>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Progression (%)
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  name="progression"
                  value={form.progression}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

            </div>

          </section>

          {/* Indicateurs */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Indicateurs de suivi
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Indicateur
                </label>

                <input
                  name="indicateur"
                  value={form.indicateur}
                  onChange={handleChange}
                  placeholder="Ex. Nombre de jeunes formés"
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Unité
                </label>

                <input
                  name="unite"
                  value={form.unite}
                  onChange={handleChange}
                  placeholder="personnes"
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Cible
                </label>

                <input
                  type="number"
                  min="0"
                  name="cible"
                  value={form.cible}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Valeur actuelle
                </label>

                <input
                  type="number"
                  min="0"
                  name="valeurActuelle"
                  value={form.valeurActuelle}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

            </div>

          </section>

          {/* Budget */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Budget et bénéficiaires
            </h2>

            <div className="grid gap-5 md:grid-cols-3">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Budget
                </label>

                <input
                  type="number"
                  min="0"
                  name="budget"
                  value={form.budget}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Devise
                </label>

                <select
                  name="devise"
                  value={form.devise}
                  onChange={handleChange}
                  className="w-full rounded-lg border bg-white px-4 py-3"
                >

                  <option value="MGA">
                    MGA
                  </option>

                  <option value="EUR">
                    EUR
                  </option>

                  <option value="USD">
                    USD
                  </option>

                </select>

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Bénéficiaires prévus
                </label>

                <input
                  type="number"
                  min="0"
                  name="nombreBeneficiaires"
                  value={
                    form.nombreBeneficiaires
                  }
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

            </div>

          </section>

          {/* Boutons */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <Link
              href="/activities"
              className="rounded-lg border bg-white px-6 py-3 text-center font-semibold text-gray-700"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Créer l'activité
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}