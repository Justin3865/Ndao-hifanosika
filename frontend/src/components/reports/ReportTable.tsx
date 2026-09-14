"use client";

import {
  Eye,
  Pencil,
  Trash2,
  FileText,
  CalendarDays,
} from "lucide-react";

export type ReportStatus =
  | "draft"
  | "generated"
  | "validated"
  | "archived";

export interface Report {
  id: string;
  title: string;
  project: string;
  period: string;
  type: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt?: string;
  author?: string;
  description?: string;
  totalBeneficiaries?: number;
  completionRate?: number;
}

interface ReportTableProps {
  reports: Report[];
  loading?: boolean;
  onView?: (report: Report) => void;
  onEdit?: (report: Report) => void;
  onDelete?: (report: Report) => void;
}

const statusConfig: Record<
  ReportStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Brouillon",
    className: "bg-gray-100 text-gray-700",
  },
  generated: {
    label: "Généré",
    className: "bg-blue-100 text-blue-700",
  },
  validated: {
    label: "Validé",
    className: "bg-green-100 text-green-700",
  },
  archived: {
    label: "Archivé",
    className: "bg-purple-100 text-purple-700",
  },
};

export default function ReportTable({
  reports,
  loading = false,
  onView,
  onEdit,
  onDelete,
}: ReportTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        <p className="mt-3 text-sm text-gray-500">
          Chargement des rapports...
        </p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 font-semibold text-gray-800">
          Aucun rapport
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Aucun rapport ne correspond aux critères.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-semibold">
                Rapport
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                Projet
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                Période
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                Type
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                Statut
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                Créé le
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {reports.map((report) => {
              const status = statusConfig[report.status];

              return (
                <tr
                  key={report.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-50 p-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>

                      <div>
                        <p className="font-medium text-gray-900">
                          {report.title}
                        </p>

                        {report.author && (
                          <p className="text-xs text-gray-500">
                            Par {report.author}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-gray-700">
                    {report.project}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <CalendarDays className="h-4 w-4" />
                      {report.period}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {report.type}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-gray-500">
                    {report.createdAt}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onView?.(report)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit?.(report)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-yellow-50 hover:text-yellow-600"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete?.(report)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}