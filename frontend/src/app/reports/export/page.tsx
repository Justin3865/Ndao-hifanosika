"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getReports,
  Report,
} from "@/lib/reports";

export default function ExportReportsPage() {
  const [reports, setReports] =
    useState<Report[]>([]);

  const [project, setProject] =
    useState("all");

  const [bailleur, setBailleur] =
    useState("all");

  const [format, setFormat] =
    useState("PDF");

  const [dateDebut, setDateDebut] =
    useState("");

  const [dateFin, setDateFin] =
    useState("");

  useEffect(() => {
    setReports(
      getReports()
    );
  }, []);

  const projects = useMemo(
    () =>
      Array.from(
        new Map(
          reports.map((r) => [
            r.projectId,
            r.projectName,
          ])
        ).entries()
      ),
    [reports]
  );

  const bailleurs = useMemo(
    () =>
      Array.from(
        new Set(
          reports
            .map(
              (r) =>
                r.bailleur
            )
            .filter(
              (b) =>
                b !== "Tous"
            )
        )
      ),
    [reports]
  );

  const filteredReports =
    useMemo(() => {
      return reports.filter(
        (report) => {
          const projectMatch =
            project === "all" ||
            report.projectId ===
              project;

          const bailleurMatch =
            bailleur === "all" ||
            report.bailleur ===
              bailleur;

          const startMatch =
            !dateDebut ||
            report.periodeDebut >=
              dateDebut;

          const endMatch =
            !dateFin ||
            report.periodeFin <=
              dateFin;

          return (
            projectMatch &&
            bailleurMatch &&
            startMatch &&
            endMatch
          );
        }
      );
    }, [
      reports,
      project,
      bailleur,
      dateDebut,
      dateFin,
    ]);

  function handleExport() {
    if (
      filteredReports.length ===
      0
    ) {
      window.alert(
        "Aucun rapport ne correspond aux critères."
      );

      return;
    }

    /*
     * Prototype frontend.
     *
     * Dans la version finale :
     * Next.js -> Express -> génération PDF/Excel.
     */

    window.alert(
      `Export ${format} demandé pour ${filteredReports.length} rapport(s).`
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">

      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center gap-3">

          <Link
            href="/reports"
            className="rounded-lg border bg-white p-2"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold">
              Export des rapports
            </h1>

            <p className="text-sm text-gray-500">
              PDF / Excel avec filtres personnalisés.
            </p>
          </div>

        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <h2 className="mb-6 text-lg font-semibold">
            Paramètres d'export
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-medium">
                Projet
              </label>

              <select
                value={project}
                onChange={(e) =>
                  setProject(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2.5"
              >
                <option value="all">
                  Tous les projets
                </option>

                {projects.map(
                  ([id, name]) => (
                    <option
                      key={id}
                      value={id}
                    >
                      {name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Bailleur
              </label>

              <select
                value={bailleur}
                onChange={(e) =>
                  setBailleur(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2.5"
              >
                <option value="all">
                  Tous les bailleurs
                </option>

                {bailleurs.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Date de début
              </label>

              <input
                type="date"
                value={dateDebut}
                onChange={(e) =>
                  setDateDebut(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2.5"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Date de fin
              </label>

              <input
                type="date"
                value={dateFin}
                onChange={(e) =>
                  setDateFin(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2.5"
              />
            </div>

          </div>

          <div className="mt-6">

            <label className="mb-2 block text-sm font-medium">
              Format
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

              <FormatCard
                active={
                  format ===
                  "PDF"
                }
                icon={
                  <FileText
                    size={24}
                  />
                }
                title="PDF"
                onClick={() =>
                  setFormat(
                    "PDF"
                  )
                }
              />

              <FormatCard
                active={
                  format ===
                  "Excel"
                }
                icon={
                  <FileSpreadsheet
                    size={24}
                  />
                }
                title="Excel"
                onClick={() =>
                  setFormat(
                    "Excel"
                  )
                }
              />

              <FormatCard
                active={
                  format ===
                  "PDF + Excel"
                }
                icon={
                  <Download
                    size={24}
                  />
                }
                title="PDF + Excel"
                onClick={() =>
                  setFormat(
                    "PDF + Excel"
                  )
                }
              />

            </div>

          </div>

          <div className="mt-8 rounded-lg bg-gray-50 p-4">

            <p className="text-sm text-gray-600">
              Rapports correspondant aux critères :
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                filteredReports.length
              }
            </p>

          </div>

          <button
            onClick={handleExport}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            <Download size={18} />
            Générer l'export
          </button>

        </div>

      </div>

    </main>
  );
}

function FormatCard({
  active,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-5 text-left transition ${
        active
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "bg-white hover:bg-gray-50"
      }`}
    >
      <div className="mb-3">
        {icon}
      </div>

      <p className="font-semibold">
        {title}
      </p>

    </button>
  );
}