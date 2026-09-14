"use client";

export interface Evaluation {
  id: string;
  campaign: string;
  evaluator: string;
  target: string;
  date: string;
  score: number;
  status: "pending" | "completed";
}

interface EvaluationTableProps {
  evaluations?: Evaluation[];
}

const defaultEvaluations: Evaluation[] = [
  {
    id: "EVAL-001",
    campaign: "Évaluation annuelle 2026",
    evaluator: "Responsable S&E",
    target: "Équipe Maison Digitale",
    date: "05/09/2026",
    score: 86,
    status: "completed",
  },
  {
    id: "EVAL-002",
    campaign: "Évaluation annuelle 2026",
    evaluator: "Responsable S&E",
    target: "Équipe Kids Preneur",
    date: "06/09/2026",
    score: 74,
    status: "completed",
  },
];

export default function EvaluationTable({
  evaluations = defaultEvaluations,
}: EvaluationTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <h2 className="font-semibold">Évaluations</h2>
        <p className="text-sm text-gray-500">
          Historique des évaluations réalisées.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Référence</th>
              <th className="px-5 py-3">Campagne</th>
              <th className="px-5 py-3">Évaluateur</th>
              <th className="px-5 py-3">Cible</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Statut</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {evaluations.map((evaluation) => (
              <tr
                key={evaluation.id}
                className="hover:bg-gray-50"
              >
                <td className="px-5 py-4 font-medium">
                  {evaluation.id}
                </td>

                <td className="px-5 py-4">
                  {evaluation.campaign}
                </td>

                <td className="px-5 py-4">
                  {evaluation.evaluator}
                </td>

                <td className="px-5 py-4">
                  {evaluation.target}
                </td>

                <td className="px-5 py-4">
                  {evaluation.date}
                </td>

                <td className="px-5 py-4">
                  <span className="font-semibold">
                    {evaluation.score}/100
                  </span>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      evaluation.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {evaluation.status === "completed"
                      ? "Terminée"
                      : "En attente"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}