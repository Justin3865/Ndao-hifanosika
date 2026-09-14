"use client";

import { Building2, Download, FileText } from "lucide-react";
import type { Report } from "./ReportTable";

interface BailleurReportProps {
  report: Report;
  bailleurName: string;
  fundingAmount?: number;
  objectives?: string[];
  indicators?: {
    name: string;
    target: number;
    actual: number;
  }[];
  onExport?: () => void;
}

export default function BailleurReport({
  report,
  bailleurName,
  fundingAmount,
  objectives = [],
  indicators = [],
  onExport,
}: BailleurReportProps) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b bg-gray-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-100 p-3">
              <Building2 className="h-7 w-7 text-blue-600" />
            </div>

            <div>
              <p className="text-sm font-medium text-blue-600">
                Rapport bailleur
              </p>

              <h2 className="text-xl font-bold">
                {bailleurName}
              </h2>

              <p className="text-sm text-gray-500">
                {report.title}
              </p>
            </div>
          </div>

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Exporter
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Projet</p>
            <p className="mt-1 font-semibold">{report.project}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Période</p>
            <p className="mt-1 font-semibold">{report.period}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">
              Financement
            </p>
            <p className="mt-1 font-semibold">
              {fundingAmount !== undefined
                ? `${fundingAmount.toLocaleString()} Ar`
                : "Non renseigné"}
            </p>
          </div>
        </div>

        {objectives.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold">
              Objectifs financés
            </h3>

            <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">
              {objectives.map((objective, index) => (
                <li key={index}>{objective}</li>
              ))}
            </ul>
          </section>
        )}

        {indicators.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold">
              Indicateurs de performance
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      Indicateur
                    </th>
                    <th className="px-4 py-3 text-right">
                      Cible
                    </th>
                    <th className="px-4 py-3 text-right">
                      Réalisé
                    </th>
                    <th className="px-4 py-3 text-right">
                      Progression
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {indicators.map((indicator) => {
                    const progress =
                      indicator.target > 0
                        ? Math.round(
                            (indicator.actual /
                              indicator.target) *
                              100
                          )
                        : 0;

                    return (
                      <tr
                        key={indicator.name}
                        className="border-t"
                      >
                        <td className="px-4 py-3">
                          {indicator.name}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {indicator.target}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {indicator.actual}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold">
                          {progress}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="flex items-center gap-2 border-t pt-5 text-sm text-gray-500">
          <FileText className="h-4 w-4" />
          Rapport destiné au suivi du financement et des résultats.
        </div>
      </div>
    </div>
  );
}