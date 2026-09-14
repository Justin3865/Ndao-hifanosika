"use client";

import Link from "next/link";
import {
  Briefcase,
  Heart,
  Users,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  FileText,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";

import { AppLayout } from "@/components/layout";

export default function DashboardPage() {
  const statistics = [
    {
      title: "Projets actifs",
      value: "12",
      change: "+8.2%",
      trend: "up",
      icon: Briefcase,
      bg: "bg-blue-100",
      color: "text-blue-600",
    },
    {
      title: "Bénéficiaires",
      value: "1 248",
      change: "+12.5%",
      trend: "up",
      icon: Heart,
      bg: "bg-red-100",
      color: "text-red-600",
    },
    {
      title: "Membres",
      value: "86",
      change: "+4.3%",
      trend: "up",
      icon: Users,
      bg: "bg-green-100",
      color: "text-green-600",
    },
    {
      title: "Évaluations",
      value: "324",
      change: "-2.4%",
      trend: "down",
      icon: ClipboardList,
      bg: "bg-purple-100",
      color: "text-purple-600",
    },
  ];

  const projects = [
    {
      name: "Maison Digitale",
      organization: "Orange Madagascar",
      progress: 78,
      status: "En cours",
      statusClass: "bg-green-100 text-green-700",
    },
    {
      name: "Kids Preneur",
      organization: "Ndao Hifanosika",
      progress: 62,
      status: "En cours",
      statusClass: "bg-green-100 text-green-700",
    },
    {
      name: "Ankizy Innov",
      organization: "Ndao Hifanosika",
      progress: 45,
      status: "En cours",
      statusClass: "bg-blue-100 text-blue-700",
    },
    {
      name: "Otrikasa",
      organization: "Ndao Hifanosika",
      progress: 91,
      status: "Presque terminé",
      statusClass: "bg-yellow-100 text-yellow-700",
    },
  ];

  const activities = [
    {
      title: "Nouvelle évaluation créée",
      description: "Évaluation trimestrielle des bénéficiaires",
      time: "Il y a 15 min",
      icon: ClipboardList,
      iconClass: "bg-purple-100 text-purple-600",
    },
    {
      title: "Nouveau bénéficiaire ajouté",
      description: "Profil bénéficiaire enregistré",
      time: "Il y a 1 h",
      icon: Users,
      iconClass: "bg-blue-100 text-blue-600",
    },
    {
      title: "Projet mis à jour",
      description: "Progression du projet Maison Digitale",
      time: "Il y a 2 h",
      icon: Briefcase,
      iconClass: "bg-green-100 text-green-600",
    },
    {
      title: "Rapport disponible",
      description: "Rapport mensuel septembre 2026",
      time: "Il y a 4 h",
      icon: FileText,
      iconClass: "bg-orange-100 text-orange-600",
    },
    {
      title: "Stage ajouté",
      description: "Nouvelle offre de stage enregistrée",
      time: "Il y a 5 h",
      icon: GraduationCap,
      iconClass: "bg-indigo-100 text-indigo-600",
    },
  ];

  return (
    <AppLayout>
      {/* TITRE */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Tableau de bord
          </h2>

          <p className="mt-1 text-gray-500">
            Bienvenue sur votre espace de suivi et d'évaluation.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CalendarDays className="h-4 w-4" />

          <span>02 septembre 2026</span>
        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statistics.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}
                >
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>

                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stat.trend === "up"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}

                  {stat.change}
                </div>
              </div>

              <p className="mt-5 text-sm text-gray-500">
                {stat.title}
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* PROJETS */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <div>
              <h3 className="font-semibold text-gray-900">
                Projets en cours
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Progression des principaux projets
              </p>
            </div>

            <Link
              href="/projects"
              className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              Voir tout

              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-5 p-5">
            {projects.map((project) => (
              <div key={project.name}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-800">
                      {project.name}
                    </h4>

                    <p className="mt-1 text-xs text-gray-500">
                      {project.organization}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${project.statusClass}`}
                  >
                    {project.status}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${project.progress}%`,
                      }}
                    />
                  </div>

                  <span className="w-10 text-right text-sm font-semibold text-gray-700">
                    {project.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVITÉS */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <div>
              <h3 className="font-semibold text-gray-900">
                Activités récentes
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Dernières actions
              </p>
            </div>

            <Link
              href="/activities"
              className="text-purple-600 hover:text-purple-700"
              aria-label="Voir les activités"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="space-y-5 p-5">
            {activities.map((activity) => {
              const Icon = activity.icon;

              return (
                <div
                  key={activity.title}
                  className="flex gap-3"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activity.iconClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {activity.title}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {activity.description}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* INDICATEURS */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Activités terminées
              </p>

              <p className="text-xl font-bold text-gray-900">
                87
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100">
              <Clock3 className="h-5 w-5 text-yellow-600" />
            </div>

            <div>
              <p className="text-xs text-gray-500">
                En attente
              </p>

              <p className="text-xl font-bold text-gray-900">
                24
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Alertes
              </p>

              <p className="text-xl font-bold text-gray-900">
                7
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ACCÈS RAPIDE */}
      <div className="mt-8">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Accès rapide
        </h3>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Link
            href="/projects/create"
            className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-purple-300 hover:shadow-md"
          >
            <Briefcase className="mb-3 h-6 w-6 text-purple-600" />

            <p className="text-sm font-medium text-gray-800 group-hover:text-purple-600">
              Nouveau projet
            </p>
          </Link>

          <Link
            href="/beneficiaries/create"
            className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-purple-300 hover:shadow-md"
          >
            <Heart className="mb-3 h-6 w-6 text-red-600" />

            <p className="text-sm font-medium text-gray-800 group-hover:text-purple-600">
              Ajouter bénéficiaire
            </p>
          </Link>

          <Link
            href="/evaluations/create"
            className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-purple-300 hover:shadow-md"
          >
            <ClipboardList className="mb-3 h-6 w-6 text-blue-600" />

            <p className="text-sm font-medium text-gray-800 group-hover:text-purple-600">
              Nouvelle évaluation
            </p>
          </Link>

          <Link
            href="/internships/create"
            className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md"
          >
            <GraduationCap className="mb-3 h-6 w-6 text-indigo-600" />

            <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-600">
              Nouveau stage
            </p>
          </Link>

          <Link
            href="/reports/create"
            className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-green-300 hover:shadow-md"
          >
            <FileText className="mb-3 h-6 w-6 text-green-600" />

            <p className="text-sm font-medium text-gray-800 group-hover:text-green-600">
              Générer rapport
            </p>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}