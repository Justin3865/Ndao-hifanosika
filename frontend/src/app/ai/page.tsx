"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Brain,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AppLayout } from "@/components/layout";

const modules = [
  {
    title: "Risque d'abandon",
    description:
      "Analyser les indicateurs des bénéficiaires et identifier les profils présentant un risque d'abandon.",
    href: "/ai/dropout-risk",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-100",
  },
  {
    title: "Performance",
    description:
      "Évaluer automatiquement la performance des membres et bénéficiaires à partir des indicateurs disponibles.",
    href: "/ai/performance",
    icon: Award,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  {
    title: "Synthèse automatique",
    description:
      "Générer une synthèse intelligente des activités, résultats, indicateurs et observations.",
    href: "/ai/summary",
    icon: FileText,
    color: "text-purple-600",
    bg: "bg-purple-100",
  },
  {
    title: "Détection d'anomalies",
    description:
      "Identifier les valeurs inhabituelles ou incohérentes dans les données de suivi et d'évaluation.",
    href: "/ai/anomaly",
    icon: Activity,
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
];

export default function AIPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* =================================================
            BREADCRUMB
        ================================================= */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/dashboard"
            className="transition hover:text-purple-600"
          >
            Tableau de bord
          </Link>

          <span>/</span>

          <span className="font-medium text-gray-900">
            IA & Analytics
          </span>
        </div>

        {/* =================================================
            AI HERO
        ================================================= */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 to-purple-700 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-xl bg-white/20 p-3">
                  <Brain className="h-8 w-8" />
                </div>

                <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                  Module IA
                </span>
              </div>

              <h1 className="text-3xl font-bold md:text-4xl">
                Intelligence Artificielle
              </h1>

              <p className="mt-3 max-w-2xl text-indigo-100">
                Utiliser l&apos;intelligence artificielle
                pour améliorer le suivi, l&apos;évaluation
                et la prise de décision de Ndao Hifanosika.
              </p>
            </div>

            <Sparkles
              className="hidden md:block"
              size={80}
            />
          </div>
        </section>

        {/* =================================================
            INFORMATIONS
        ================================================= */}
        <section className="grid gap-5 md:grid-cols-3">
          <InfoCard
            icon={
              <ShieldCheck className="h-6 w-6 text-green-600" />
            }
            title="Aide à la décision"
            description="L'IA fournit des indicateurs et analyses pour faciliter les décisions des responsables S&E."
          />

          <InfoCard
            icon={
              <BarChart3 className="h-6 w-6 text-blue-600" />
            }
            title="Analyse des données"
            description="Analyse automatique des données issues des projets, membres et bénéficiaires."
          />

          <InfoCard
            icon={
              <Brain className="h-6 w-6 text-purple-600" />
            }
            title="FastAPI IA"
            description="Les traitements IA sont prévus pour être connectés au microservice FastAPI."
          />
        </section>

        {/* =================================================
            MODULES
        ================================================= */}
        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-gray-900">
              Fonctionnalités IA
            </h2>

            <p className="mt-1 text-gray-600">
              Sélectionnez une fonctionnalité pour commencer
              une analyse.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className="group rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`rounded-xl ${module.bg} p-4 ${module.color}`}
                    >
                      <Icon size={30} />
                    </div>

                    <ArrowRight
                      className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-gray-700"
                      size={22}
                    />
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-gray-900">
                    {module.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {module.description}
                  </p>

                  <div className="mt-5 text-sm font-semibold text-indigo-600">
                    Ouvrir l&apos;analyse →
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

/* =========================================================
   INFO CARD
========================================================= */

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-center gap-3">
        {icon}

        <h2 className="font-semibold text-gray-900">
          {title}
        </h2>
      </div>

      <p className="text-sm leading-6 text-gray-600">
        {description}
      </p>
    </div>
  );
}