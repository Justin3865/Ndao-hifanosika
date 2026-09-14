"use client";

import {
  CheckCircle2,
  FileText,
  Printer,
} from "lucide-react";
import type { Report } from "./ReportTable";
import ReportHeader from "./ReportHeader";
import ReportStatistics from "./ReportStatistics";
import ReportCharts from "./ReportCharts";

interface ReportPreviewProps {
  report: Report;
  objectives?: string[];
  results?: string[];
  onValidate?: () => void;
  onPrint?: () => void;
}

export default function ReportPreview({
  report,
  objectives = [],
  results = [],
  onValidate,
  onPrint,
}: ReportPreviewProps) {
  return (
    <div className="space-y-6 rounded-xl border bg-gray-50 p-4 md:p-8">
      <div className="flex flex-wrap justify-end gap-2 print:hidden">
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
        )}

        {onValidate && report.status !== "validated" && (
          <button
            type="button"
            onClick={onValidate}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm text-white hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Valider
          </button>
        )}
      </div>

      <article className="mx-auto max-w-5xl space-y-8 bg-white p-6 shadow-sm md:p-10">
        <ReportHeader
          title={report.title}
          project={report.project}
          period={report.period}
          subtitle={report.type}
        />

        {report.description && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              Présentation
            </h2>

            <p className="leading-7 text-gray-600">
              {report.description}
            </p>
          </section>
        )}

        {objectives.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              Objectifs
            </h2>

            <ul className="list-disc space-y-2 pl-5 text-gray-600">
              {objectives.map((objective, index) => (
                <li key={index}>{objective}</li>
              ))}
            </ul>
          </section>
        )}

        {results.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              Résultats obtenus
            </h2>

            <ul className="list-disc space-y-2 pl-5 text-gray-600">
              {results.map((result, index) => (
                <li key={index}>{result}</li>
              ))}
            </ul>
          </section>
        )}

        <ReportStatistics
          statistics={[
            {
              label: "Bénéficiaires",
              value: report.totalBeneficiaries ?? 0,
            },
            {
              label: "Taux de réalisation",
              value: report.completionRate ?? 0,
              target: 100,
              unit: "%",
            },
          ]}
        />

        <ReportCharts
          data={[
            {
              label: "Réalisation",
              value: report.completionRate ?? 0,
            },
            {
              label: "Bénéficiaires",
              value: report.totalBeneficiaries ?? 0,
            },
          ]}
        />

        <footer className="border-t pt-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Rapport généré par Ndao Hifanosika
          </div>
        </footer>
      </article>
    </div>
  );
}