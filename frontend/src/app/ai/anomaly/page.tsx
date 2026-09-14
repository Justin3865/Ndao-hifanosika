"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Brain,
} from "lucide-react";

type AnomalyStatus = "Normale" | "À vérifier" | "Anomalie";

interface Anomaly {
  id: string;
  indicator: string;
  project: string;
  value: string;
  expected: string;
  status: AnomalyStatus;
}

const anomalies: Anomaly[] = [
  {
    id: "AN-001",
    indicator: "Taux de participation",
    project: "Maison Digitale",
    value: "92%",
    expected: "70-95%",
    status: "Normale",
  },
  {
    id: "AN-002",
    indicator: "Bénéficiaires actifs",
    project: "Kids Preneur",
    value: "18%",
    expected: "50-90%",
    status: "Anomalie",
  },
  {
    id: "AN-003",
    indicator: "Activités réalisées",
    project: "Ankizy Innov",
    value: "68%",
    expected: "60-100%",
    status: "Normale",
  },
  {
    id: "AN-004",
    indicator: "Performance moyenne",
    project: "Otrikasa",
    value: "43%",
    expected: "60-100%",
    status: "À vérifier",
  },
];

function statusClass(status: AnomalyStatus) {
  if (status === "Anomalie") {
    return "bg-red-100 text-red-700";
  }

  if (status === "À vérifier") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-green-100 text-green-700";
}

export default function AnomalyPage() {
  const detected = anomalies.filter(
    (item) => item.status === "Anomalie"
  ).length;

  const toCheck = anomalies.filter(
    (item) => item.status === "À vérifier"
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/ai"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Retour à l'IA
        </Link>

        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-orange-100 p-4 text-orange-600">
              <Activity size={30} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Détection d'anomalies
              </h1>

              <p className="mt-1 text-gray-600">
                Identification automatique des données inhabituelles
                dans le système S&E.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Données analysées
            </p>

            <p className="mt-2 text-3xl font-bold">
              {anomalies.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <AlertTriangle className="text-red-600" />

            <p className="mt-3 text-sm text-gray-500">
              Anomalies
            </p>

            <p className="text-3xl font-bold text-red-600">
              {detected}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <Activity className="text-yellow-600" />

            <p className="mt-3 text-sm text-gray-500">
              À vérifier
            </p>

            <p className="text-3xl font-bold text-yellow-600">
              {toCheck}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <Brain className="text-purple-600" />

            <p className="mt-3 text-sm text-gray-500">
              Moteur
            </p>

            <p className="text-lg font-bold text-purple-600">
              FastAPI IA
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="font-bold">
              Résultats de détection
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-600">
                  <th className="px-6 py-4">Indicateur</th>
                  <th className="px-6 py-4">Projet</th>
                  <th className="px-6 py-4">Valeur</th>
                  <th className="px-6 py-4">Plage attendue</th>
                  <th className="px-6 py-4">État</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {anomalies.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold">
                        {item.indicator}
                      </p>

                      <p className="text-xs text-gray-500">
                        {item.id}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      {item.project}
                    </td>

                    <td className="px-6 py-4 font-semibold">
                      {item.value}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {item.expected}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                          item.status
                        )}`}
                      >
                        {item.status === "Normale" ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <AlertTriangle size={14} />
                        )}

                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}