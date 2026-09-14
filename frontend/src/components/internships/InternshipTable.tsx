"use client";

import InternshipStatus, {
  InternshipStatusType,
} from "./InternshipStatus";

export interface Internship {
  id: string;
  reference: string;
  internName: string;
  institution: string;
  project: string;
  department: string;
  supervisor: string;
  startDate: string;
  endDate: string;
  status: InternshipStatusType;
}

interface InternshipTableProps {
  internships?: Internship[];
  onView?: (internship: Internship) => void;
  onEdit?: (internship: Internship) => void;
  onDelete?: (id: string) => void;
}

const defaultInternships: Internship[] = [
  {
    id: "1",
    reference: "STG-2026-001",
    internName: "Stagiaire 01",
    institution: "Université de Fianarantsoa",
    project: "Maison Digitale",
    department: "DSI",
    supervisor: "Responsable DSI",
    startDate: "01/09/2026",
    endDate: "30/11/2026",
    status: "active",
  },
  {
    id: "2",
    reference: "STG-2026-002",
    internName: "Stagiaire 02",
    institution: "ENI Fianarantsoa",
    project: "Kids Preneur",
    department: "S&E",
    supervisor: "Responsable S&E",
    startDate: "15/08/2026",
    endDate: "15/10/2026",
    status: "active",
  },
  {
    id: "3",
    reference: "STG-2026-003",
    internName: "Stagiaire 03",
    institution: "Université d'Antananarivo",
    project: "Otrikasa",
    department: "Communication",
    supervisor: "Responsable Communication",
    startDate: "01/07/2026",
    endDate: "31/08/2026",
    status: "completed",
  },
];

export default function InternshipTable({
  internships = defaultInternships,
  onView,
  onEdit,
  onDelete,
}: InternshipTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Gestion des stages
          </h2>

          <p className="text-sm text-gray-500">
            Suivi des stagiaires et de leurs périodes de stage
          </p>
        </div>

        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nouveau stage
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Référence</th>
              <th className="px-5 py-3">Stagiaire</th>
              <th className="px-5 py-3">Institution</th>
              <th className="px-5 py-3">Projet</th>
              <th className="px-5 py-3">Encadrant</th>
              <th className="px-5 py-3">Période</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {internships.map((internship) => (
              <tr
                key={internship.id}
                className="hover:bg-gray-50"
              >
                <td className="px-5 py-4 font-medium">
                  {internship.reference}
                </td>

                <td className="px-5 py-4">
                  {internship.internName}
                </td>

                <td className="px-5 py-4">
                  {internship.institution}
                </td>

                <td className="px-5 py-4">
                  {internship.project}
                </td>

                <td className="px-5 py-4">
                  {internship.supervisor}
                </td>

                <td className="px-5 py-4 text-gray-600">
                  {internship.startDate} - {internship.endDate}
                </td>

                <td className="px-5 py-4">
                  <InternshipStatus
                    status={internship.status}
                  />
                </td>

                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onView?.(internship)}
                      className="rounded-md px-2 py-1 text-blue-600 hover:bg-blue-50"
                    >
                      Voir
                    </button>

                    <button
                      onClick={() => onEdit?.(internship)}
                      className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      Modifier
                    </button>

                    <button
                      onClick={() => onDelete?.(internship.id)}
                      className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}