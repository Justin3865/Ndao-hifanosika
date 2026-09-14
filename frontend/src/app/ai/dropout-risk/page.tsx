"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  AlertTriangle,
  Search,
  User,
} from "lucide-react";

type RiskLevel = "Faible" | "Moyen" | "Élevé";

interface Beneficiary {
  id: string;
  name: string;
  project: string;
  participation: number;
  attendance: number;
  performance: number;
  risk: RiskLevel;
}

const beneficiaries: Beneficiary[] = [
  {
    id: "BEN-001",
    name: "Bénéficiaire 001",
    project: "Maison Digitale",
    participation: 88,
    attendance: 92,
    performance: 85,
    risk: "Faible",
  },
  {
    id: "BEN-002",
    name: "Bénéficiaire 002",
    project: "Kids Preneur",
    participation: 61,
    attendance: 65,
    performance: 68,
    risk: "Moyen",
  },
  {
    id: "BEN-003",
    name: "Bénéficiaire 003",
    project: "Ankizy Innov",
    participation: 35,
    attendance: 42,
    performance: 45,
    risk: "Élevé",
  },
  {
    id: "BEN-004",
    name: "Bénéficiaire 004",
    project: "Otrikasa",
    participation: 74,
    attendance: 70,
    performance: 72,
    risk: "Moyen",
  },
];

function riskClass(risk: RiskLevel) {
  if (risk === "Élevé") {
    return "bg-red-100 text-red-700";
  }

  if (risk === "Moyen") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-green-100 text-green-700";
}

export default function DropoutRiskPage() {
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("Tous");

  const filtered = beneficiaries.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase());

    const matchesProject =
      project === "Tous" || item.project === project;

    return matchesSearch && matchesProject;
  });

  const highRisk = beneficiaries.filter(
    (item) => item.risk === "Élevé"
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/ai"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Retour à l'IA
        </Link>

        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-red-100 p-4 text-red-600">
              <AlertTriangle size={30} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Analyse du risque d'abandon
              </h1>

              <p className="mt-1 text-gray-600">
                Identification des bénéficiaires présentant un risque
                potentiel d'abandon.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Bénéficiaires analysés</p>
            <p className="mt-2 text-3xl font-bold">
              {beneficiaries.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Risque élevé</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {highRisk}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Moteur IA</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-bold text-indigo-600">
              <Brain size={22} />
              FastAPI
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3 text-gray-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un bénéficiaire..."
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2.5"
            >
              <option>Tous</option>
              <option>Maison Digitale</option>
              <option>Kids Preneur</option>
              <option>Ankizy Innov</option>
              <option>Otrikasa</option>
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-600">
                  <th className="px-5 py-4">Bénéficiaire</th>
                  <th className="px-5 py-4">Projet</th>
                  <th className="px-5 py-4">Participation</th>
                  <th className="px-5 py-4">Présence</th>
                  <th className="px-5 py-4">Performance</th>
                  <th className="px-5 py-4">Risque</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-gray-100 p-2">
                          <User size={18} />
                        </div>

                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">{item.project}</td>

                    <td className="px-5 py-4">{item.participation}%</td>

                    <td className="px-5 py-4">{item.attendance}%</td>

                    <td className="px-5 py-4">{item.performance}%</td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${riskClass(
                          item.risk
                        )}`}
                      >
                        {item.risk}
                      </span>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Aucun bénéficiaire trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}