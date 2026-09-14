"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Grid3X3,
  Plus,
  Eye,
  CheckCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  EvaluationGrid,
  getEvaluationGrids,
} from "@/lib/evaluations";

export default function GridsPage() {
  const [grids, setGrids] =
    useState<EvaluationGrid[]>([]);

  useEffect(() => {
    setGrids(
      getEvaluationGrids()
    );
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <Link
              href="/evaluations"
              className="rounded-lg border bg-white p-2"
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <h1 className="text-2xl font-bold">
                Grilles d'évaluation
              </h1>

              <p className="text-sm text-gray-500">
                Grilles paramétrables par cible et programme.
              </p>
            </div>

          </div>

          <Link
            href="/evaluations/create"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white"
          >
            <Plus size={18} />
            Nouvelle grille
          </Link>

        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

          {grids.map((grid) => (
            <div
              key={grid.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >

              <div className="flex items-start justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Grid3X3 />
                </div>

                {grid.active && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-700">
                    <CheckCircle size={13} />
                    Active
                  </span>
                )}

              </div>

              <p className="mt-4 text-xs font-medium text-gray-400">
                {grid.code}
              </p>

              <h2 className="mt-1 font-semibold">
                {grid.name}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {grid.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                  {grid.target}
                </span>

                {grid.programme && (
                  <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs text-purple-700">
                    {grid.programme}
                  </span>
                )}

              </div>

              <div className="mt-5">

                <p className="mb-2 text-sm font-medium">
                  Critères : {grid.criteria.length}
                </p>

                <div className="space-y-2">

                  {grid.criteria
                    .slice(0, 4)
                    .map((criterion) => (
                      <div
                        key={
                          criterion.id
                        }
                        className="flex justify-between rounded-lg bg-gray-50 p-2 text-xs"
                      >
                        <span>
                          {criterion.label}
                        </span>

                        <span className="font-semibold">
                          {criterion.weight}%
                        </span>
                      </div>
                    ))}

                </div>

              </div>

              <Link
                href="/evaluations"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              >
                <Eye size={16} />
                Utiliser cette grille
              </Link>

            </div>
          ))}

        </div>

      </div>
    </main>
  );
}