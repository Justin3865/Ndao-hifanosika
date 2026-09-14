"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Pencil,
  Trash2,
  User,
} from "lucide-react";

import {
  Internship,
  deleteInternship,
  formatInternshipDate,
  getInternshipById,
  getStatusClass,
} from "@/lib/internships";

export default function InternshipDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [internship, setInternship] =
    useState<Internship | null>(null);

  useEffect(() => {
    const data = getInternshipById(id);

    setInternship(data ?? null);
  }, [id]);

  function handleDelete() {
    if (!internship) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer le stage de ${internship.internName} ?`
    );

    if (!confirmed) {
      return;
    }

    deleteInternship(internship.id);

    router.push("/internships");
  }

  if (!internship) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <Briefcase className="mx-auto h-12 w-12 text-gray-300" />

          <h1 className="mt-4 text-xl font-bold text-gray-900">
            Stage introuvable
          </h1>

          <Link
            href="/internships"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux stages
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/internships"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux stages
        </Link>

        {/* Header */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <GraduationIcon />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      internship.status
                    )}`}
                  >
                    {internship.status}
                  </span>

                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    {internship.type}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl font-bold text-gray-900">
                  {internship.internName}
                </h1>

                <p className="text-sm text-gray-500">
                  {internship.reference}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/internships/${internship.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </Link>

              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </div>
          </div>
        </section>

        {/* Informations */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <User className="h-5 w-5 text-blue-600" />
              Informations du stagiaire
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <InfoItem
                label="Nom complet"
                value={internship.internName}
              />

              <InfoItem
                label="Email"
                value={internship.internEmail || "—"}
              />

              <InfoItem
                label="Téléphone"
                value={internship.phone || "—"}
              />

              <InfoItem
                label="Établissement"
                value={internship.institution}
              />

              <InfoItem
                label="Niveau"
                value={internship.level}
              />

              <InfoItem
                label="Domaine"
                value={internship.field}
              />
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Période
            </h2>

            <div className="mt-5 space-y-5">
              <InfoItem
                label="Début"
                value={formatInternshipDate(
                  internship.startDate
                )}
              />

              <InfoItem
                label="Fin"
                value={formatInternshipDate(
                  internship.endDate
                )}
              />

              <InfoItem
                label="Département"
                value={internship.department}
              />

              <InfoItem
                label="Superviseur"
                value={internship.supervisor}
              />
            </div>
          </section>
        </div>

        {/* Projet */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Projet et missions
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
            <InfoBlock
              title="Projet"
              value={
                internship.projectName ??
                "Aucun projet associé"
              }
            />

            <InfoBlock
              title="Objectifs"
              value={internship.objectives}
            />

            <div className="md:col-span-2">
              <InfoBlock
                title="Missions / tâches"
                value={internship.tasks}
              />
            </div>
          </div>
        </section>

        {/* Evaluation */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <ClipboardCheck className="h-5 w-5 text-purple-600" />
                Évaluation
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Évaluation de performance du stagiaire.
              </p>
            </div>

            <Link
              href={`/internships/${internship.id}/evaluation`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
            >
              <ClipboardCheck className="h-4 w-4" />
              {internship.evaluation
                ? "Modifier l'évaluation"
                : "Évaluer le stagiaire"}
            </Link>
          </div>

          {internship.evaluation ? (
            <div className="mt-6">
              <div className="rounded-xl bg-purple-50 p-5 text-center">
                <p className="text-sm text-purple-700">
                  Score global
                </p>

                <p className="mt-2 text-4xl font-bold text-purple-700">
                  {internship.evaluation.overallScore}
                  <span className="text-lg">/10</span>
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-5">
                <Score
                  label="Technique"
                  value={
                    internship.evaluation
                      .technicalSkills
                  }
                />

                <Score
                  label="Communication"
                  value={
                    internship.evaluation
                      .communication
                  }
                />

                <Score
                  label="Équipe"
                  value={
                    internship.evaluation.teamwork
                  }
                />

                <Score
                  label="Ponctualité"
                  value={
                    internship.evaluation
                      .punctuality
                  }
                />

                <Score
                  label="Autonomie"
                  value={
                    internship.evaluation.autonomy
                  }
                />
              </div>

              <div className="mt-5 rounded-xl bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Commentaire
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {internship.evaluation.comments}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <ClipboardCheck className="mx-auto h-10 w-10 text-gray-300" />

              <p className="mt-3 text-sm text-gray-500">
                Aucune évaluation n'a encore été enregistrée.
              </p>
            </div>
          )}
        </section>

        {/* Certificat */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Award className="h-5 w-5 text-yellow-600" />
                Certificat de stage
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Génération et consultation du certificat.
              </p>
            </div>

            <Link
              href={`/internships/${internship.id}/certificate`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yellow-600"
            >
              <Award className="h-4 w-4" />
              {internship.certificateIssued
                ? "Voir le certificat"
                : "Générer le certificat"}
            </Link>
          </div>

          {internship.certificateIssued && (
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-green-50 p-4 text-green-700">
              <CheckCircle2 className="h-5 w-5" />

              <div>
                <p className="font-semibold">
                  Certificat délivré
                </p>

                <p className="text-sm">
                  Numéro :{" "}
                  {internship.certificateNumber}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function GraduationIcon() {
  return <GraduationCapIcon />;
}

function GraduationCapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-8 w-8"
    >
      <path d="M2 10l10-5 10 5-10 5L2 10z" />
      <path d="M6 12v5c3 2 9 2 12 0v-5" />
      <path d="M22 10v6" />
    </svg>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 font-medium text-gray-900">
        {value}
      </p>
    </div>
  );
}

function InfoBlock({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-5">
      <p className="text-xs font-semibold uppercase text-gray-400">
        {title}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
        {value || "—"}
      </p>
    </div>
  );
}

function Score({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 text-center">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-gray-900">
        {value}/10
      </p>
    </div>
  );
}