"use client";

import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Landmark,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  deleteReport,
  formatDate,
  getReports,
  Report,
  ReportStatus,
  ReportType,
} from "@/lib/reports";

import { AppLayout } from "@/components/layout";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<"all" | ReportType>("all");
  const [statusFilter, setStatusFilter] =
    useState<"all" | ReportStatus>("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setReports(getReports());
    setLoaded(true);
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const text =
        `${report.reference} ${report.titre} ${report.projectName} ${report.bailleur} ${report.auteur}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesType =
        typeFilter === "all" || report.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" || report.statut === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, search, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: reports.length,

      validated: reports.filter(
        (r) => r.statut === "Validé"
      ).length,

      generated: reports.filter(
        (r) =>
          r.statut === "Généré" ||
          r.statut === "Validé"
      ).length,

      projects: new Set(
        reports.map((r) => r.projectId)
      ).size,

      bailleurs: new Set(
        reports
          .filter(
            (r) =>
              r.bailleur !== "Tous" &&
              r.bailleur !== ""
          )
          .map((r) => r.bailleur)
      ).size,
    };
  }, [reports]);

  function handleDelete(report: Report) {
    const confirmed = window.confirm(
      `Supprimer le rapport ${report.reference} ?`
    );

    if (!confirmed) {
      return;
    }

    deleteReport(report.id);
    setReports(getReports());
  }

  function statusClass(status: ReportStatus) {
    switch (status) {
      case "Brouillon":
        return "bg-gray-100 text-gray-700";

      case "En préparation":
        return "bg-yellow-100 text-yellow-700";

      case "Généré":
        return "bg-blue-100 text-blue-700";

      case "Validé":
        return "bg-green-100 text-green-700";

      case "Envoyé":
        return "bg-purple-100 text-purple-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  if (!loaded) {
    return (
      <AppLayout>
        <div className="min-h-[calc(100vh-8rem)]">
          <div className="mx-auto max-w-7xl rounded-2xl bg-white p-10 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 animate-pulse text-blue-600" />

            <p className="mt-4 text-gray-600">
              Chargement des rapports...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* EN-TÊTE */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            {/* BREADCRUMB */}
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Link
                href="/dashboard"
                className="transition hover:text-blue-600"
              >
                Tableau de bord
              </Link>

              <span>/</span>

              <span>Rapports</span>
            </div>

            {/* TITRE SANS LOGO */}
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Rapports & Reporting
            </h2>

            <p className="mt-1 text-gray-500">
              Reporting des projets, départements, Direction et bailleurs.
            </p>
          </div>

          {/* ACTIONS PRINCIPALES */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/reports/export"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Exporter
            </Link>

            <Link
              href="/reports/create"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Nouveau rapport
            </Link>
          </div>
        </div>

        {/* STATISTIQUES */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Rapports"
            value={stats.total}
            icon={<FileText size={22} />}
          />

          <StatCard
            title="Validés"
            value={stats.validated}
            icon={<CheckCircle2 size={22} />}
          />

          <StatCard
            title="Générés"
            value={stats.generated}
            icon={<BarChart3 size={22} />}
          />

          <StatCard
            title="Projets"
            value={stats.projects}
            icon={<Target size={22} />}
          />

          <StatCard
            title="Bailleurs"
            value={stats.bailleurs}
            icon={<Landmark size={22} />}
          />
        </div>

        {/* BAILLEURS / REPORTING PARTENAIRES */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">
              Bailleurs / Reporting partenaires
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Préparez et consultez les reportings destinés aux bailleurs et
              partenaires.
            </p>
          </div>

          <Link
            href="/reports/bailleur"
            className="group flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-5 transition hover:border-blue-200 hover:bg-blue-100"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-600 p-3 text-white">
                <Landmark className="h-6 w-6" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  Bailleurs
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  Reporting partenaires
                </p>
              </div>
            </div>

            <span className="text-sm font-semibold text-blue-600 transition group-hover:text-blue-800">
              Accéder →
            </span>
          </Link>
        </section>

        {/* FILTRES */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* RECHERCHE */}
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un rapport..."
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* TYPE */}
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value as "all" | ReportType
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tous les types</option>
              <option value="Projet">Projet</option>
              <option value="Direction">Direction</option>
              <option value="Département">Département</option>
              <option value="Bailleur">Bailleur</option>
              <option value="Bénéficiaires">Bénéficiaires</option>
              <option value="Équipes">Équipes</option>
              <option value="Évaluation">Évaluation</option>
              <option value="Impact">Impact</option>
            </select>

            {/* STATUT */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | ReportStatus
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tous les statuts</option>
              <option value="Brouillon">Brouillon</option>
              <option value="En préparation">En préparation</option>
              <option value="Généré">Généré</option>
              <option value="Validé">Validé</option>
              <option value="Envoyé">Envoyé</option>
            </select>
          </div>

          {/* RÉINITIALISATION */}
          {(search ||
            typeFilter !== "all" ||
            statusFilter !== "all") && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                {filteredReports.length} résultat
                {filteredReports.length > 1 ? "s" : ""}
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:text-blue-800"
              >
                <X className="h-4 w-4" />
                Réinitialiser
              </button>
            </div>
          )}
        </section>

        {/* LISTE DES RAPPORTS */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Liste des rapports
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                {filteredReports.length} rapport
                {filteredReports.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />

              <h3 className="mt-4 font-semibold text-gray-900">
                Aucun rapport trouvé
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Modifiez vos critères ou créez un nouveau rapport.
              </p>

              <Link
                href="/reports/create"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nouveau rapport
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Rapport
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Type
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Projet
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Bailleur
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Période
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Résultats
                    </th>

                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase text-gray-500">
                      Statut
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className="transition hover:bg-gray-50"
                    >
                      {/* RAPPORT */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/reports/${report.id}`}
                          className="font-semibold text-gray-900 transition hover:text-blue-600"
                        >
                          {report.titre}
                        </Link>

                        <p className="mt-1 text-xs text-gray-500">
                          {report.reference}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {report.auteur}
                        </p>
                      </td>

                      {/* TYPE */}
                      <td className="px-5 py-4">
                        <span className="whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {report.type}
                        </span>
                      </td>

                      {/* PROJET */}
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {report.projectName}
                      </td>

                      {/* BAILLEUR */}
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {report.bailleur}
                      </td>

                      {/* PÉRIODE */}
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div>
                          {formatDate(report.periodeDebut)}
                        </div>

                        <div className="mt-1">
                          au {formatDate(report.periodeFin)}
                        </div>
                      </td>

                      {/* RÉSULTATS */}
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>
                            Complétion :{" "}
                            <strong className="text-gray-900">
                              {report.tauxCompletion}%
                            </strong>
                          </div>

                          <div>
                            Réussite :{" "}
                            <strong className="text-gray-900">
                              {report.tauxReussite}%
                            </strong>
                          </div>
                        </div>
                      </td>

                      {/* STATUT */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                            report.statut
                          )}`}
                        >
                          {report.statut}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/reports/${report.id}`}
                            title="Voir"
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/reports/${report.id}/edit`}
                            title="Modifier"
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(report)}
                            title="Supprimer"
                            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm text-gray-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}