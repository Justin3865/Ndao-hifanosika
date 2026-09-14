"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Briefcase,
  UserRound,
  Users,
  Wallet,
  Plus,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import ProjectTable from "@/components/projects/ProjectTable";

import { AppLayout } from "@/components/layout";

import type { Project } from "@/components/projects/ProjectTable";

/* =========================================================
   DONNÉES DES PROJETS
========================================================= */

const initialProjects: Project[] = [
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
    createdAt: "2026-01-10",
    updatedAt: "2026-09-01",
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
    milestones: [
      {
        id: "kp-1",
        title: "Identification des bénéficiaires",
        date: "2026-02-15",
        status: "done",
      },
      {
        id: "kp-2",
        title: "Formation entrepreneuriale",
        date: "2026-05-30",
        status: "done",
      },
      {
        id: "kp-3",
        title: "Accompagnement des projets",
        date: "2026-09-30",
        status: "pending",
      },
    ],
    createdAt: "2026-01-20",
    updatedAt: "2026-09-01",
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
    milestones: [
      {
        id: "ai-1",
        title: "Appel à projets",
        date: "2026-03-15",
        status: "done",
      },
      {
        id: "ai-2",
        title: "Sélection des projets",
        date: "2026-04-30",
        status: "done",
      },
      {
        id: "ai-3",
        title: "Incubation",
        date: "2026-08-30",
        status: "done",
      },
      {
        id: "ai-4",
        title: "Présentation finale",
        date: "2026-10-15",
        status: "pending",
      },
    ],
    createdAt: "2026-02-15",
    updatedAt: "2026-09-01",
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
    milestones: [
      {
        id: "ot-1",
        title: "Préparation du programme",
        date: "2026-04-15",
        status: "done",
      },
      {
        id: "ot-2",
        title: "Sélection des initiatives",
        date: "2026-09-30",
        status: "pending",
      },
      {
        id: "ot-3",
        title: "Évaluation finale",
        date: "2026-12-01",
        status: "pending",
      },
    ],
    createdAt: "2026-03-15",
    updatedAt: "2026-09-01",
  },
];

/* =========================================================
   PAGE
========================================================= */

export default function ProjectsPage() {
  const [projects, setProjects] =
    useState<Project[]>(initialProjects);

  /* =======================================================
     CALCULS
  ======================================================= */

  const totalBudget = projects.reduce(
    (sum, project) => sum + project.budget,
    0
  );

  const totalBeneficiaries = projects.reduce(
    (sum, project) => sum + project.beneficiaries,
    0
  );

  const totalMembers = projects.reduce(
    (sum, project) => sum + project.members,
    0
  );

  /* =======================================================
     SUPPRESSION
  ======================================================= */

  function handleDelete(project: Project) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le projet "${project.name}" ?`
    );

    if (!confirmed) return;

    setProjects((current) =>
      current.filter(
        (item) => item.id !== project.id
      )
    );
  }

  /* =======================================================
     FORMATAGE BUDGET
  ======================================================= */

  const formattedBudget = new Intl.NumberFormat(
    "fr-MG",
    {
      style: "currency",
      currency: "MGA",
      maximumFractionDigits: 0,
    }
  ).format(totalBudget);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* =============================================
            BREADCRUMB
        ============================================== */}

        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/dashboard"
            className="transition hover:text-purple-600"
          >
            Tableau de bord
          </Link>

          <span>/</span>

          <span>Projets</span>
        </div>

        {/* =============================================
            TITRE + UN SEUL BOUTON
        ============================================== */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Projets et programmes
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Gestion, suivi et évaluation des projets de
              Ndao Hifanosika.
            </p>
          </div>

          <Link
            href="/projects/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Nouveau projet
          </Link>
        </div>

        {/* =============================================
            STATISTIQUES
        ============================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* PROJETS */}

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-blue-100 p-3">
                <Briefcase className="h-5 w-5 text-blue-700" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Projets
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {projects.length}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* BÉNÉFICIAIRES */}

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-green-100 p-3">
                <UserRound className="h-5 w-5 text-green-700" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Bénéficiaires
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {totalBeneficiaries}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* MEMBRES */}

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-purple-100 p-3">
                <Users className="h-5 w-5 text-purple-700" />
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Membres
                </p>

                <p className="text-2xl font-bold text-gray-900">
                  {totalMembers}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* BUDGET */}

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-orange-100 p-3">
                <Wallet className="h-5 w-5 text-orange-700" />
              </div>

              <div className="min-w-0">
                <p className="text-sm text-gray-500">
                  Budget total
                </p>

                <p className="text-lg font-bold text-gray-900">
                  {formattedBudget}
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* =============================================
            TABLEAU DES PROJETS
        ============================================== */}

        <ProjectTable
          projects={projects}
          onDelete={handleDelete}
        />

      </div>
    </AppLayout>
  );
}