"use client";

import { useParams, useRouter } from "next/navigation";

import ProjectForm, {
  type ProjectFormData,
} from "@/components/projects/ProjectForm";

import type {
  Project,
} from "@/components/projects/ProjectTable";

const projects: Project[] = [
  {
    id: "maison-digitale",
    name: "Maison Digitale",
    description:
      "Programme d'accompagnement et de développement des compétences numériques des jeunes.",
    donor: "Orange Madagascar",
    startDate: "2026-01-15",
    endDate: "2026-12-31",
    status: "en_cours",
    progress: 68,
    budget: 85000000,
    spent: 54000000,
    currency: "MGA",
    members: 12,
    beneficiaries: 350,
    responsible: "Coordinateur Maison Digitale",
    objectives: [
      "Renforcer les compétences numériques des jeunes.",
      "Accompagner les bénéficiaires vers l'emploi et l'entrepreneuriat.",
      "Développer les activités numériques locales.",
    ],
  },

  {
    id: "kids-preneur",
    name: "Kids Preneur",
    description:
      "Programme d'initiation des enfants et adolescents à l'entrepreneuriat.",
    donor: "Ndao Hifanosika",
    startDate: "2026-02-01",
    endDate: "2026-11-30",
    status: "en_cours",
    progress: 55,
    budget: 45000000,
    spent: 23000000,
    currency: "MGA",
    members: 8,
    beneficiaries: 180,
    responsible: "Responsable Kids Preneur",
    objectives: [
      "Initier les jeunes à l'entrepreneuriat.",
      "Développer leur créativité et leur autonomie.",
      "Encourager la réalisation de projets innovants.",
    ],
  },

  {
    id: "ankizy-innov",
    name: "Ankizy Innov",
    description:
      "Programme destiné à stimuler l'innovation et la créativité des jeunes.",
    donor: "Ndao Hifanosika",
    startDate: "2026-03-01",
    endDate: "2026-10-31",
    status: "en_cours",
    progress: 72,
    budget: 60000000,
    spent: 42000000,
    currency: "MGA",
    members: 10,
    beneficiaries: 220,
    responsible: "Responsable Ankizy Innov",
    objectives: [
      "Développer la créativité des jeunes.",
      "Identifier des solutions innovantes aux problèmes locaux.",
      "Accompagner les projets à potentiel.",
    ],
  },

  {
    id: "otrikasa",
    name: "Otrikasa",
    description:
      "Programme d'accompagnement et de valorisation des initiatives communautaires.",
    donor: "Ndao Hifanosika",
    startDate: "2026-04-01",
    endDate: "2026-12-15",
    status: "planifie",
    progress: 20,
    budget: 70000000,
    spent: 10000000,
    currency: "MGA",
    members: 9,
    beneficiaries: 260,
    responsible: "Responsable Otrikasa",
    objectives: [
      "Identifier les initiatives communautaires.",
      "Accompagner les porteurs de projets.",
      "Mesurer les résultats et les impacts.",
    ],
  },
];

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const project = projects.find(
    (item) => item.id === id
  );

  if (!project) {
    return (
      <main className="p-6">
        <div className="rounded-xl border p-8 text-center">
          <h1 className="text-xl font-bold">
            Projet introuvable
          </h1>

          <button
            type="button"
            onClick={() => router.push("/projects")}
            className="mt-4 rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            Retour aux projets
          </button>
        </div>
      </main>
    );
  }

  async function handleSubmit(
    data: ProjectFormData
  ) {
    console.log(
      "Modification du projet :",
      id,
      data
    );

    /*
     * Plus tard :
     *
     * await fetch(`/api/projects/${id}`, {
     *   method: "PUT",
     *   headers: {
     *     "Content-Type": "application/json",
     *   },
     *   body: JSON.stringify(data),
     * });
     */

    router.push(`/projects/${id}`);
  }

  function handleCancel() {
    router.push(`/projects/${id}`);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Modifier le projet
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Mise à jour des informations du projet{" "}
          <strong>{project.name}</strong>.
        </p>
      </div>

      <ProjectForm
        mode="edit"
        initialData={project}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </main>
  );
}