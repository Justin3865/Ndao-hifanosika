"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Landmark,
  FileText,
  Download,
  Eye,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  formatDate,
  getReports,
  Report,
} from "@/lib/reports";

export default function BailleurReportsPage() {
  const [reports, setReports] =
    useState<Report[]>([]);

  const [selectedBailleur, setSelectedBailleur] =
    useState("all");

  useEffect(() => {
    setReports(
      getReports()
    );
  }, []);

  const bailleurs = useMemo(
    () =>
      Array.from(
        new Set(
          reports
            .map(
              (report) =>
                report.bailleur
            )
            .filter(
              (item) =>
                item !==
                "Tous"
            )
        )
      ),
    [reports]
  );

  const filteredReports =
    reports.filter(
      (report) => {
        if (
          selectedBailleur ===
          "all"
        ) {
          return (
            report.type ===
              "Bailleur" ||
            report.bailleur !==
              "Tous"
          );
        }

        return (
          report.bailleur ===
          selectedBailleur
        );
      }
    );

  const totalBeneficiaries =
    filteredReports.reduce(
      (sum, report) =>
        sum +
        report.nombreBeneficiaires,
      0
    );

  const averageSuccess =
    filteredReports.length >
    0
      ? Math.round(
          filteredReports.reduce(
            (sum, report) =>
              sum +
              report.tauxReussite,
            0
          ) /
            filteredReports.length
        )
      : 0;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">

      <div className="mx-auto max-w-6xl">

        <div className="mb-6 flex items-center gap-3">

          <Link
            href="/reports"
            className="rounded-lg border bg-white p-2"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold">
              Reporting bailleurs
            </h1>

            <p className="text-sm text-gray-500">
              Rapports destinés aux partenaires et bailleurs.
            </p>
          </div>

        </div>

        {/* SELECTEUR */}

        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">

          <label className="mb-2 block text-sm font-medium">
            Sélectionner un bailleur
          </label>

          <select
            value={
              selectedBailleur
            }
            onChange={(e) =>
              setSelectedBailleur(
                e.target.value
              )
            }
            className="w-full max-w-md rounded-lg border px-3 py-2.5"
          >
            <option value="all">
              Tous les bailleurs
            </option>

            {bailleurs.map(
              (bailleur) => (
                <option
                  key={bailleur}
                  value={
                    bailleur
                  }
                >
                  {bailleur}
                </option>
              )
            )}

          </select>

        </div>

        {/* STATS */}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-xl border bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Rapports
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {
                    filteredReports.length
                  }
                </p>
              </div>

              <FileText className="text-blue-600" />

            </div>

          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Bénéficiaires
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {
                    totalBeneficiaries
                  }
                </p>
              </div>

              <Landmark className="text-purple-600" />

            </div>

          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Réussite moyenne
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {averageSuccess}%
                </p>
              </div>

              <Download className="text-green-600" />

            </div>

          </div>

        </div>

        {/* LISTE */}

        <div className="space-y-4">

          {filteredReports.map(
            (report) => (
              <div
                key={
                  report.id
                }
                className="rounded-xl border bg-white p-5 shadow-sm"
              >

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                  <div>

                    <div className="flex items-center gap-2">

                      <Landmark
                        size={20}
                        className="text-purple-600"
                      />

                      <h2 className="font-semibold text-gray-900">
                        {
                          report.titre
                        }
                      </h2>

                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {
                        report.reference
                      }{" "}
                      ·{" "}
                      {
                        report.bailleur
                      }
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      {
                        report.projectName
                      }{" "}
                      ·{" "}
                      {formatDate(
                        report.periodeDebut
                      )}{" "}
                      au{" "}
                      {formatDate(
                        report.periodeFin
                      )}
                    </p>

                  </div>

                  <div className="flex gap-2">

                    <Link
                      href={`/reports/${report.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <Eye size={16} />
                      Voir
                    </Link>

                    <Link
                      href="/reports/export"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      <Download
                        size={16}
                      />
                      Exporter
                    </Link>

                  </div>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">

                  <Metric
                    label="Bénéficiaires"
                    value={
                      report.nombreBeneficiaires
                    }
                  />

                  <Metric
                    label="Actifs"
                    value={
                      report.nombreBeneficiairesActifs
                    }
                  />

                  <Metric
                    label="Complétion"
                    value={`${report.tauxCompletion}%`}
                  />

                  <Metric
                    label="Réussite"
                    value={`${report.tauxReussite}%`}
                  />

                </div>

              </div>
            )
          )}

        </div>

      </div>

    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">

      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-bold">
        {value}
      </p>

    </div>
  );
}