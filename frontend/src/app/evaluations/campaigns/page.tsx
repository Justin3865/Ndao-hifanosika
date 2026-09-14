"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarRange,
  Plus,
  Eye,
  Grid3X3,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  EvaluationCampaign,
  getEvaluationCampaigns,
} from "@/lib/evaluations";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] =
    useState<EvaluationCampaign[]>([]);

  useEffect(() => {
    setCampaigns(
      getEvaluationCampaigns()
    );
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-3">

            <Link
              href="/evaluations"
              className="rounded-lg border bg-white p-2"
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <h1 className="text-2xl font-bold">
                Campagnes d'évaluation
              </h1>

              <p className="text-sm text-gray-500">
                Planifier et suivre les campagnes
                périodiques.
              </p>
            </div>

          </div>

          <Link
            href="/evaluations/create"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white"
          >
            <Plus size={18} />
            Nouvelle campagne
          </Link>

        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

          {campaigns.map(
            (campaign) => {

              const completion =
                campaign.expectedCount > 0
                  ? Math.round(
                      (campaign.completedCount /
                        campaign.expectedCount) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={campaign.id}
                  className="rounded-xl border bg-white p-5 shadow-sm"
                >

                  <div className="flex items-start justify-between">

                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <CalendarRange />
                    </div>

                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">
                      {campaign.status}
                    </span>

                  </div>

                  <h2 className="mt-4 font-semibold">
                    {campaign.name}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {campaign.description}
                  </p>

                  <div className="mt-4 space-y-2 text-sm">

                    <p>
                      <strong>Cible :</strong>{" "}
                      {campaign.target}
                    </p>

                    <p>
                      <strong>Période :</strong>{" "}
                      {campaign.period}
                    </p>

                    <p>
                      <strong>Grille :</strong>{" "}
                      {campaign.gridName}
                    </p>

                  </div>

                  <div className="mt-5">

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>
                        Complétion
                      </span>

                      <span>
                        {completion}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{
                          width: `${completion}%`,
                        }}
                      />
                    </div>

                  </div>

                  <div className="mt-5 flex gap-2">

                    <Link
                      href="/evaluations"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <Eye size={16} />
                      Évaluations
                    </Link>

                    <Link
                      href="/evaluations/grids"
                      className="inline-flex items-center justify-center rounded-lg border px-3 py-2"
                    >
                      <Grid3X3 size={16} />
                    </Link>

                  </div>

                </div>
              );
            }
          )}

        </div>

      </div>
    </main>
  );
}