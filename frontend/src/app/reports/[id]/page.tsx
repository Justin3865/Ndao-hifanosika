"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Download,
  FileText,
  Target,
  Users,
  Activity,
  Wallet,
  Brain,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  calculateBudgetRate,
  formatCurrency,
  formatDate,
  getReportById,
  Report,
} from "@/lib/reports";

import { useParams } from "next/navigation";

export default function ReportDetailPage() {
  const params = useParams();

  const id = String(
    params.id
  );

  const [report, setReport] =
    useState<Report | null>(
      null
    );

  useEffect(() => {
    const data =
      getReportById(id);

    if (data) {
      setReport(data);
    }
  }, [id]);

  if (!report) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">

        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-10 text-center">

          <h1 className="text-xl font-bold">
            Rapport introuvable
          </h1>

          <p className="mt-2 text-gray-500">
            Le rapport demandé n'existe pas.
          </p>

          <Link
            href="/reports"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            <ArrowLeft size={18} />
            Retour aux rapports
          </Link>

        </div>

      </main>
    );
  }

  const budgetRate =
    calculateBudgetRate(
      report
    );

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-3">

            <Link
              href="/reports"
              className="rounded-lg border bg-white p-2"
            >
              <ArrowLeft size={20} />
            </Link>

            <div>

              <p className="text-sm text-gray-500">
                {report.reference}
              </p>

              <h1 className="text-2xl font-bold text-gray-900">
                {report.titre}
              </h1>

            </div>

          </div>

          <div className="flex gap-2">

            <Link
              href={`/reports/${report.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 font-medium"
            >
              <Pencil size={18} />
              Modifier
            </Link>

            <Link
              href="/reports/export"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white"
            >
              <Download size={18} />
              Exporter
            </Link>

          </div>

        </div>

        {/* INFORMATIONS */}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">

          <InfoCard
            label="Projet"
            value={
              report.projectName
            }
            icon={
              <Target size={20} />
            }
          />

          <InfoCard
            label="Bailleur"
            value={
              report.bailleur
            }
            icon={
              <FileText
                size={20}
              />
            }
          />

          <InfoCard
            label="Période"
            value={`${formatDate(
              report.periodeDebut
            )} → ${formatDate(
              report.periodeFin
            )}`}
            icon={
              <Activity
                size={20}
              />
            }
          />

          <InfoCard
            label="Format"
            value={
              report.format
            }
            icon={
              <Download
                size={20}
              />
            }
          />

        </div>

        {/* KPI */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <Kpi
            label="Bénéficiaires"
            value={
              report.nombreBeneficiaires
            }
            icon={
              <Users size={20} />
            }
          />

          <Kpi
            label="Actifs"
            value={
              report.nombreBeneficiairesActifs
            }
            icon={
              <Users size={20} />
            }
          />

          <Kpi
            label="Complétion"
            value={`${report.tauxCompletion}%`}
            icon={
              <Target size={20} />
            }
          />

          <Kpi
            label="Réussite"
            value={`${report.tauxReussite}%`}
            icon={
              <Activity size={20} />
            }
          />

          <Kpi
            label="Satisfaction"
            value={`${report.satisfaction}%`}
            icon={
              <Brain size={20} />
            }
          />

        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* INDICATEURS */}

          <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">

            <h2 className="mb-5 text-lg font-semibold">
              Indicateurs de performance
            </h2>

            <div className="space-y-5">

              {report.indicateurs.map(
                (indicator) => (
                  <div
                    key={
                      indicator.id
                    }
                  >

                    <div className="mb-1 flex justify-between text-sm">

                      <span className="font-medium">
                        {
                          indicator.label
                        }
                      </span>

                      <span>
                        {
                          indicator.value
                        }{" "}
                        {
                          indicator.unit
                        }{" "}
                        / cible{" "}
                        {
                          indicator.target
                        }
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">

                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{
                          width: `${Math.min(
                            indicator.percentage,
                            100
                          )}%`,
                        }}
                      />

                    </div>

                  </div>
                )
              )}

            </div>

          </section>

          {/* BUDGET */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
              <Wallet size={20} />
              Budget indicatif
            </h2>

            <p className="text-sm text-gray-500">
              Prévisionnel
            </p>

            <p className="text-xl font-bold">
              {formatCurrency(
                report.budgetPrevisionnel
              )}
            </p>

            <p className="mt-4 text-sm text-gray-500">
              Utilisé
            </p>

            <p className="text-xl font-bold">
              {formatCurrency(
                report.budgetUtilise
              )}
            </p>

            <div className="mt-5">

              <div className="mb-1 flex justify-between text-sm">
                <span>
                  Exécution
                </span>

                <span>
                  {budgetRate}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-200">

                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${Math.min(
                      budgetRate,
                      100
                    )}%`,
                  }}
                />

              </div>

            </div>

          </section>

          {/* ACTIVITES */}

          <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-3">

            <h2 className="mb-5 text-lg font-semibold">
              Activités
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <Mini
                label="Activités prévues"
                value={
                  report.nombreActivites
                }
              />

              <Mini
                label="Activités réalisées"
                value={
                  report.nombreActivitesRealisees
                }
              />

              <Mini
                label="Performance équipe"
                value={`${report.performanceEquipe}%`}
              />

            </div>

          </section>

          {/* SYNTHESE */}

          <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-3">

            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Brain size={20} />
              Synthèse narrative
            </h2>

            <p className="whitespace-pre-line text-sm leading-7 text-gray-700">
              {
                report.resumeNarratif
              }
            </p>

          </section>

          {/* OBSERVATIONS */}

          <section className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-3">

            <h2 className="mb-4 text-lg font-semibold">
              Observations et recommandations
            </h2>

            <p className="whitespace-pre-line text-sm leading-7 text-gray-700">
              {
                report.observations
              }
            </p>

          </section>

        </div>

      </div>

    </main>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">

      <div className="flex items-center gap-2 text-blue-600">
        {icon}

        <span className="text-xs font-medium uppercase text-gray-500">
          {label}
        </span>
      </div>

      <p className="mt-2 font-semibold">
        {value}
      </p>

    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">

      <div className="flex justify-between">

        <span className="text-sm text-gray-500">
          {label}
        </span>

        <span className="text-blue-600">
          {icon}
        </span>

      </div>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">

      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>

    </div>
  );
}