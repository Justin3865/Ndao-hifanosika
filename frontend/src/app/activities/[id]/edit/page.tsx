"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  getActivityById,
  updateActivity,
  ActivityStatus,
} from "@/lib/activities";

export default function EditActivityPage() {
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [form, setForm] = useState({
    code: "",
    nom: "",
    description: "",

    projectId: "",
    projectName: "",

    responsable: "",

    dateDebut: "",
    dateFin: "",

    statut:
      "Planifiée" as ActivityStatus,

    progression: "0",

    indicateur: "",
    cible: "0",
    unite: "personnes",
    valeurActuelle: "0",

    budget: "0",
    devise: "MGA",

    nombreBeneficiaires: "0",
  });

  useEffect(() => {
    const id = params.id;

    if (typeof id !== "string") {
      setLoading(false);
      return;
    }

    const activity =
      getActivityById(id);

    if (!activity) {
      setError(
        "Activité introuvable."
      );

      setLoading(false);
      return;
    }

    setForm({
      code: activity.code,
      nom: activity.nom,
      description:
        activity.description,

      projectId:
        activity.projectId,

      projectName:
        activity.projectName,

      responsable:
        activity.responsable,

      dateDebut:
        activity.dateDebut,

      dateFin:
        activity.dateFin,

      statut:
        activity.statut,

      progression:
        String(
          activity.progression
        ),

      indicateur:
        activity.indicateur,

      cible:
        String(activity.cible),

      unite:
        activity.unite,

      valeurActuelle:
        String(
          activity.valeurActuelle
        ),

      budget:
        String(activity.budget),

      devise:
        activity.devise,

      nombreBeneficiaires:
        String(
          activity.nombreBeneficiaires
        ),
    });

    setLoading(false);
  }, [params.id]);

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
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    const id = params.id;

    if (typeof id !== "string") {
      setError(
        "Identifiant invalide."
      );
      return;
    }

    if (!form.code.trim()) {
      setError(
        "Le code est obligatoire."
      );
      return;
    }

    if (!form.nom.trim()) {
      setError(
        "Le nom est obligatoire."
      );
      return;
    }

    if (
      !form.dateDebut ||
      !form.dateFin
    ) {
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

    const updated =
      updateActivity(id, {
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

    if (!updated) {
      setError(
        "Impossible de modifier l'activité."
      );
      return;
    }

    router.push(
      `/activities/${id}`
    );
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">
          Chargement...
        </p>
      </main>
    );
  }

  if (
    error &&
    !form.nom
  ) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">

        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-10 text-center shadow-sm">

          <h1 className="text-2xl font-bold">
            Activité introuvable
          </h1>

          <p className="mt-3 text-gray-600">
            {error}
          </p>

          <Link
            href="/activities"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Retour aux activités
          </Link>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-5xl">

        <div className="mb-8">

          <Link
            href={`/activities/${params.id}`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Retour à l'activité
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Modifier l'activité
          </h1>

          <p className="mt-2 text-gray-600">
            Mettre à jour les informations
            et les indicateurs de l'activité.
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

          {/* INFORMATIONS */}

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
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Nom *
                </label>

                <input
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

            </div>

          </section>

          {/* PROJET */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Projet et responsabilité
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Projet
                </label>

                <select
                  name="projectId"
                  value={
                    form.projectId
                  }
                  onChange={(event) => {

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

                    setForm(
                      (previous) => ({
                        ...previous,
                        projectId:
                          event.target.value,
                        projectName:
                          projects[
                            event.target.value
                          ] ?? "",
                      })
                    );
                  }}
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
                  value={
                    form.responsable
                  }
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

            </div>

          </section>

          {/* PLANNING */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Planning et état
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Date de début
                </label>

                <input
                  type="date"
                  name="dateDebut"
                  value={
                    form.dateDebut
                  }
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Date de fin
                </label>

                <input
                  type="date"
                  name="dateFin"
                  value={
                    form.dateFin
                  }
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
                  value={
                    form.statut
                  }
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
                  value={
                    form.progression
                  }
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

            </div>

          </section>

          {/* INDICATEURS */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Indicateurs
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Indicateur
                </label>

                <input
                  name="indicateur"
                  value={
                    form.indicateur
                  }
                  onChange={handleChange}
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
                  value={
                    form.valeurActuelle
                  }
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-3"
                />

              </div>

            </div>

          </section>

          {/* BUDGET */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Budget
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium">
                  Budget
                </label>

                <input
                  type="number"
                  min="0"
                  name="budget"
                  value={
                    form.budget
                  }
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
                  value={
                    form.devise
                  }
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

            </div>

          </section>

          {/* BENEFICIAIRES */}

          <section className="rounded-xl border bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Bénéficiaires
            </h2>

            <input
              type="number"
              min="0"
              name="nombreBeneficiaires"
              value={
                form.nombreBeneficiaires
              }
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 md:w-1/3"
            />

          </section>

          {/* BOUTONS */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <Link
              href={`/activities/${params.id}`}
              className="rounded-lg border bg-white px-6 py-3 text-center font-semibold"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Enregistrer les modifications
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}