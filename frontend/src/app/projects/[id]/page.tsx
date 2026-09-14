"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/Button";

import ProjectDetails from "@/components/projects/ProjectDetails";
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
    milestones: [
      {
        id: "md-1",
        title: "Lancement du programme",
        date: "2026-01-15",
        status: "done",
      },
      {
        id: "md-2",
        title: "Première cohorte",
        date: "2026-03-30",
        status: "done",
      },
      {
        id: "md-3",
        title: "Évaluation intermédiaire",
        date: "2026-07-30",
        status: "done",
      },
      {
        id: "md-4",
        title: "Évaluation finale",
        date: "2026-12-15",
        status: "pending",
      },
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
    milestones: [],
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
    milestones: [],
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
    milestones: [],
  },
];

export default function ProjectDetailsPage() {
  const params = useParams();

  const id = String(params.id);

  const project = projects.find(
    (item) => item.id === id
  );

  if (!project) {
    return (
      <main className="p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-dashed p-10 text-center">
          <h1 className="text-xl font-bold text-gray-900">
            Projet introuvable
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Le projet demandé n'existe pas ou a été
            supprimé.
          </p>

          <Link
            href="/projects"
            className="mt-6 inline-block"
          >
            <Button type="button">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux projets
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <ProjectDetails project={project} />
    </main>
  );
}