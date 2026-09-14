"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  FileText,
  Sparkles,
} from "lucide-react";

export default function AISummaryPage() {
  const [project, setProject] = useState("Maison Digitale");
  const [period, setPeriod] = useState("Trimestre 1");
  const [summary, setSummary] = useState("");

  const generateSummary = () => {
    setSummary(
      `Synthèse automatique du projet ${project} pour la période ${period}.

Les activités prévues ont été suivies à travers les indicateurs de performance, les activités réalisées et les résultats obtenus.

Les données disponibles montrent une progression globale des activités. Certains indicateurs nécessitent toutefois un suivi renforcé afin d'améliorer l'atteinte des objectifs.

Les principaux points d'attention concernent la participation des bénéficiaires, le suivi des activités et la réalisation des jalons.

Des actions correctives et un suivi régulier sont recommandés pour maintenir la progression du projet.`
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/ai"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Retour à l'IA
        </Link>

        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-purple-100 p-4 text-purple-600">
              <FileText size={30} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Synthèse automatique
              </h1>

              <p className="mt-1 text-gray-600">
                Génération d'une synthèse à partir des données S&E.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Projet
              </label>

              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              >
                <option>Maison Digitale</option>
                <option>Kids Preneur</option>
                <option>Ankizy Innov</option>
                <option>Otrikasa</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Période
              </label>

              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              >
                <option>Trimestre 1</option>
                <option>Trimestre 2</option>
                <option>Trimestre 3</option>
                <option>Trimestre 4</option>
                <option>Année complète</option>
              </select>
            </div>
          </div>

          <button
            onClick={generateSummary}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700"
          >
            <Sparkles size={18} />
            Générer la synthèse
          </button>
        </section>

        {summary && (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Brain className="text-purple-600" />

              <div>
                <h2 className="font-bold">
                  Synthèse générée
                </h2>

                <p className="text-sm text-gray-500">
                  Projet : {project} — {period}
                </p>
              </div>
            </div>

            <div className="whitespace-pre-line rounded-lg bg-gray-50 p-6 leading-7 text-gray-700">
              {summary}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}