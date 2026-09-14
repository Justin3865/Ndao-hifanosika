"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarRange,
  ClipboardCheck,
  Eye,
  Grid3X3,
  GraduationCap,
  Pencil,
  Plus,
  Target,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  deleteEvaluation,
  formatDate,
  getEvaluationCampaigns,
  getEvaluations,
  Evaluation,
  EvaluationTarget,
} from "@/lib/evaluations";

import { AppLayout } from "@/components/layout";

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);

  const [target, setTarget] =
    useState<"all" | EvaluationTarget>("all");

  const [status, setStatus] =
    useState<"all" | Evaluation["status"]>("all");

  useEffect(() => {
    setEvaluations(getEvaluations());
  }, []);

  const campaigns = getEvaluationCampaigns();

  const filtered = useMemo(() => {
    return evaluations.filter((evaluation) => {
      const matchTarget =
        target === "all" ||
        evaluation.target === target;

      const matchStatus =
        status === "all" ||
        evaluation.status === status;

      return matchTarget && matchStatus;
    });
  }, [evaluations, target, status]);

  const stats = useMemo(() => {
    return {
      total: evaluations.length,

      members: evaluations.filter(
        (e) => e.target === "Membre"
      ).length,

      beneficiaries: evaluations.filter(
        (e) => e.target === "Bénéficiaire"
      ).length,

      trainees: evaluations.filter(
        (e) => e.target === "Stagiaire"
      ).length,

      validated: evaluations.filter(
        (e) => e.status === "Validé"
      ).length,
    };
  }, [evaluations]);

  function remove(evaluation: Evaluation) {
    const confirmed = window.confirm(
      `Supprimer ${evaluation.code} ?`
    );

    if (!confirmed) {
      return;
    }

    deleteEvaluation(evaluation.id);

    setEvaluations(getEvaluations());
  }

  function statusClass(
    evaluationStatus: Evaluation["status"]
  ) {
    switch (evaluationStatus) {
      case "Non évalué":
        return "bg-gray-100 text-gray-700";

      case "En cours":
        return "bg-yellow-100 text-yellow-700";

      case "Évalué":
        return "bg-blue-100 text-blue-700";

      case "Validé":
        return "bg-green-100 text-green-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* PAGE HEADER */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Link
                href="/dashboard"
                className="hover:text-purple-600"
              >
                Tableau de bord
              </Link>

              <span>/</span>

              <span>Évaluations</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Évaluations
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Suivi des évaluations des membres,
              stagiaires et bénéficiaires.
            </p>
          </div>

          {/* NOUVELLE ÉVALUATION */}

          <Link
            href="/evaluations/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Nouvelle évaluation
          </Link>
        </div>

        {/* STATS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <Stat
            icon={<ClipboardCheck size={22} />}
            label="Total"
            value={stats.total}
          />

          <Stat
            icon={<Users size={22} />}
            label="Membres"
            value={stats.members}
          />

          <Stat
            icon={<UserCheck size={22} />}
            label="Bénéficiaires"
            value={stats.beneficiaries}
          />

          <Stat
            icon={<GraduationCap size={22} />}
            label="Stagiaires"
            value={stats.trainees}
          />

          <Stat
            icon={<Target size={22} />}
            label="Validées"
            value={stats.validated}
          />

        </div>

        {/* NAVIGATION RAPIDE */}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

          <QuickLink
            href="/evaluations"
            icon={<ClipboardCheck size={20} />}
            title="Évaluations"
            active
          />

          <QuickLink
            href="/evaluations/campaigns"
            icon={<CalendarRange size={20} />}
            title="Campagnes"
          />

          <QuickLink
            href="/evaluations/grids"
            icon={<Grid3X3 size={20} />}
            title="Grilles"
          />

          <QuickLink
            href="/evaluations/results"
            icon={<BarChart3 size={20} />}
            title="Résultats"
          />

        </div>

        {/* FILTERS */}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

            {/* TARGET */}

            <select
              value={target}
              onChange={(e) =>
                setTarget(
                  e.target.value as
                    | "all"
                    | EvaluationTarget
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="all">
                Toutes les cibles
              </option>

              <option value="Membre">
                Membres
              </option>

              <option value="Stagiaire">
                Stagiaires
              </option>

              <option value="Bénéficiaire">
                Bénéficiaires
              </option>
            </select>

            {/* STATUS */}

            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as
                    | "all"
                    | Evaluation["status"]
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="all">
                Tous les statuts
              </option>

              <option value="Non évalué">
                Non évalué
              </option>

              <option value="En cours">
                En cours
              </option>

              <option value="Évalué">
                Évalué
              </option>

              <option value="Validé">
                Validé
              </option>
            </select>

          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px]">

              <thead className="bg-gray-50">

                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase text-gray-500">

                  <th className="px-4 py-3">
                    Évaluation
                  </th>

                  <th className="px-4 py-3">
                    Cible
                  </th>

                  <th className="px-4 py-3">
                    Campagne
                  </th>

                  <th className="px-4 py-3">
                    Évaluateur
                  </th>

                  <th className="px-4 py-3">
                    Score
                  </th>

                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Statut
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100">

                {filtered.map((evaluation) => (

                  <tr
                    key={evaluation.id}
                    className="transition hover:bg-gray-50"
                  >

                    {/* ÉVALUATION */}

                    <td className="px-4 py-4">

                      <Link
                        href={`/evaluations/${evaluation.id}`}
                        className="font-semibold text-gray-900 hover:text-purple-600"
                      >
                        {evaluation.code}
                      </Link>

                      <p className="text-xs text-gray-500">
                        {evaluation.gridName}
                      </p>

                    </td>

                    {/* CIBLE */}

                    <td className="px-4 py-4">

                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                        {evaluation.target}
                      </span>

                      <p className="mt-1 text-sm text-gray-700">
                        {evaluation.subjectName}
                      </p>

                    </td>

                    {/* CAMPAGNE */}

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {evaluation.campaignName}
                    </td>

                    {/* ÉVALUATEUR */}

                    <td className="px-4 py-4">

                      <p className="text-sm font-medium text-gray-900">
                        {evaluation.evaluatorName}
                      </p>

                      <p className="text-xs text-gray-500">
                        {evaluation.evaluatorRole}
                      </p>

                    </td>

                    {/* SCORE */}

                    <td className="px-4 py-4">

                      <p className="font-bold text-gray-900">
                        {evaluation.percentage}%
                      </p>

                      <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">

                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${Math.min(
                              Math.max(
                                evaluation.percentage,
                                0
                              ),
                              100
                            )}%`,
                          }}
                        />

                      </div>

                    </td>

                    {/* DATE */}

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {formatDate(
                        evaluation.dateEvaluation
                      )}
                    </td>

                    {/* STATUT */}

                    <td className="px-4 py-4">

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                          evaluation.status
                        )}`}
                      >
                        {evaluation.status}
                      </span>

                    </td>

                    {/* ACTIONS */}

                    <td className="px-4 py-4">

                      <div className="flex justify-end gap-1">

                        <Link
                          href={`/evaluations/${evaluation.id}`}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                          title="Voir"
                        >
                          <Eye size={17} />
                        </Link>

                        <Link
                          href={`/evaluations/${evaluation.id}/edit`}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-yellow-50 hover:text-yellow-600"
                          title="Modifier"
                        >
                          <Pencil size={17} />
                        </Link>

                        {/* CORBEILLE ROUGE */}

                        <button
                          type="button"
                          onClick={() =>
                            remove(evaluation)
                          }
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                          title="Supprimer"
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          {/* AUCUN RÉSULTAT */}

          {filtered.length === 0 && (

            <div className="p-12 text-center">

              <ClipboardCheck
                size={40}
                className="mx-auto text-gray-300"
              />

              <h3 className="mt-3 font-semibold text-gray-900">
                Aucune évaluation trouvée
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Modifiez vos critères de recherche
                ou créez une nouvelle évaluation.
              </p>

              {/* NOUVELLE ÉVALUATION - BLEU */}

              <Link
                href="/evaluations/create"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <Plus size={17} />
                Nouvelle évaluation
              </Link>

            </div>

          )}

        </div>

        {/* CAMPAIGNS SUMMARY */}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

          <div className="mb-4 flex items-center justify-between">

            <div>

              <h2 className="text-lg font-semibold text-gray-900">
                Campagnes en cours
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Progression des campagnes d'évaluation
              </p>

            </div>

            <Link
              href="/evaluations/campaigns"
              className="text-sm font-medium text-purple-600 hover:underline"
            >
              Voir toutes
            </Link>

          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {campaigns
              .filter(
                (campaign) =>
                  campaign.status === "En cours"
              )
              .map((campaign) => {

                const progress =
                  campaign.expectedCount
                    ? Math.round(
                        (campaign.completedCount /
                          campaign.expectedCount) *
                          100
                      )
                    : 0;

                return (

                  <div
                    key={campaign.id}
                    className="rounded-lg border border-gray-200 p-4 transition hover:border-purple-200 hover:shadow-sm"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <p className="font-semibold text-gray-900">
                          {campaign.name}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {campaign.target}
                        </p>

                      </div>

                      <CalendarRange
                        size={18}
                        className="shrink-0 text-purple-600"
                      />

                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">

                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{
                          width: `${Math.min(
                            Math.max(progress, 0),
                            100
                          )}%`,
                        }}
                      />

                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">

                      <span>
                        {campaign.completedCount}/
                        {campaign.expectedCount}{" "}
                        complétées
                      </span>

                      <span className="font-medium text-blue-600">
                        {progress}%
                      </span>

                    </div>

                  </div>

                );
              })}

          </div>

          {campaigns.filter(
            (campaign) =>
              campaign.status === "En cours"
          ).length === 0 && (

            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">

              <CalendarRange
                size={32}
                className="mx-auto text-gray-300"
              />

              <p className="mt-2 text-sm font-medium text-gray-700">
                Aucune campagne en cours
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Les campagnes actives apparaîtront ici.
              </p>

            </div>

          )}

        </div>

      </div>
    </AppLayout>
  );
}

/* =========================================================
   STAT COMPONENT
========================================================= */

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-gray-500">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {value}
          </p>

        </div>

        <div className="text-purple-600">
          {icon}
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   QUICK LINK COMPONENT
========================================================= */

function QuickLink({
  href,
  icon,
  title,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 shadow-sm transition ${
        active
          ? "border-purple-200 bg-purple-50"
          : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-md"
      }`}
    >

      <div
        className={`mb-2 ${
          active
            ? "text-purple-700"
            : "text-purple-600"
        }`}
      >
        {icon}
      </div>

      <p
        className={`font-medium ${
          active
            ? "text-purple-800"
            : "text-gray-900"
        }`}
      >
        {title}
      </p>

    </Link>
  );
}