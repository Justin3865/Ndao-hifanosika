"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Save,
  ClipboardCheck,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  createEvaluation,
  EvaluationGrid,
  EvaluationCampaign,
  EvaluationScore,
  getEvaluationCampaigns,
  getEvaluationGrids,
} from "@/lib/evaluations";

export default function CreateEvaluationPage() {
  const [grids, setGrids] =
    useState<EvaluationGrid[]>([]);

  const [campaigns, setCampaigns] =
    useState<EvaluationCampaign[]>([]);

  const [grid, setGrid] =
    useState<EvaluationGrid | null>(null);

  const [form, setForm] = useState({
    target: "Membre",
    subjectName: "",
    subjectId: "",
    evaluatorName: "Responsable RH",
    evaluatorId: "USR-001",
    evaluatorRole: "RH",
    campaignId: "",
    type: "Évaluation responsable",
    dateEvaluation:
      new Date()
        .toISOString()
        .split("T")[0],
    appreciation: "",
  });

  const [scores, setScores] =
    useState<EvaluationScore[]>([]);

  useEffect(() => {
    const loadedGrids =
      getEvaluationGrids();

    const loadedCampaigns =
      getEvaluationCampaigns();

    setGrids(loadedGrids);
    setCampaigns(
      loadedCampaigns
    );

    if (loadedGrids[0]) {
      selectGrid(
        loadedGrids[0],
        loadedCampaigns
      );
    }
  }, []);

  function selectGrid(
    selected: EvaluationGrid,
    loadedCampaigns = campaigns
  ) {
    setGrid(selected);

    const campaign =
      loadedCampaigns.find(
        (item) =>
          item.gridId ===
          selected.id
      );

    setForm((previous) => ({
      ...previous,
      campaignId:
        campaign?.id ?? "",
    }));

    setScores(
      selected.criteria.map(
        (criterion) => ({
          criterionId:
            criterion.id,
          criterionLabel:
            criterion.label,
          score: 0,
          maxScore:
            criterion.maxScore,
          comment: "",
        })
      )
    );
  }

  function updateScore(
    criterionId: string,
    score: number
  ) {
    setScores((previous) =>
      previous.map((item) =>
        item.criterionId ===
        criterionId
          ? {
              ...item,
              score,
            }
          : item
      )
    );
  }

  function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!grid) {
      return;
    }

    const campaign =
      campaigns.find(
        (item) =>
          item.id ===
          form.campaignId
      );

    const totalScore =
      scores.reduce(
        (sum, item) =>
          sum + item.score,
        0
      );

    const maxScore =
      scores.reduce(
        (sum, item) =>
          sum + item.maxScore,
        0
      );

    const percentage =
      maxScore > 0
        ? Math.round(
            (totalScore /
              maxScore) *
              100
          )
        : 0;

    createEvaluation({
      target:
        form.target as
          | "Membre"
          | "Stagiaire"
          | "Bénéficiaire",

      subjectId:
        form.subjectId,

      subjectName:
        form.subjectName,

      evaluatorId:
        form.evaluatorId,

      evaluatorName:
        form.evaluatorName,

      evaluatorRole:
        form.evaluatorRole,

      campaignId:
        form.campaignId,

      campaignName:
        campaign?.name ??
        "Évaluation ponctuelle",

      gridId:
        grid.id,

      gridName:
        grid.name,

      type:
        form.type as any,

      dateEvaluation:
        form.dateEvaluation,

      status:
        "Évalué",

      scores,

      totalScore,

      maxScore,

      percentage,

      appreciation:
        form.appreciation,

      strengths: [],

      improvementAreas: [],
    });

    window.location.href =
      "/evaluations";
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center gap-3">

          <Link
            href="/evaluations"
            className="rounded-lg border bg-white p-2"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold">
              Nouvelle évaluation
            </h1>

            <p className="text-sm text-gray-500">
              Saisir une évaluation selon une grille.
            </p>
          </div>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* GENERAL */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center gap-2">
              <ClipboardCheck
                className="text-indigo-600"
              />

              <h2 className="text-lg font-semibold">
                Informations générales
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Field
                label="Cible"
              >
                <select
                  value={
                    form.target
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      target:
                        e.target.value,
                    })
                  }
                  className="input"
                >
                  <option>
                    Membre
                  </option>

                  <option>
                    Stagiaire
                  </option>

                  <option>
                    Bénéficiaire
                  </option>
                </select>
              </Field>

              <Field
                label="Nom de la personne évaluée"
              >
                <input
                  required
                  value={
                    form.subjectName
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      subjectName:
                        e.target.value,
                    })
                  }
                  className="input"
                  placeholder="Nom complet"
                />
              </Field>

              <Field
                label="Identifiant"
              >
                <input
                  value={
                    form.subjectId
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      subjectId:
                        e.target.value,
                    })
                  }
                  className="input"
                  placeholder="MEM-001 / BEN-001..."
                />
              </Field>

              <Field
                label="Grille"
              >
                <select
                  value={
                    grid?.id ?? ""
                  }
                  onChange={(e) => {
                    const selected =
                      grids.find(
                        (item) =>
                          item.id ===
                          e.target.value
                      );

                    if (
                      selected
                    ) {
                      selectGrid(
                        selected
                      );
                    }
                  }}
                  className="input"
                >
                  {grids.map(
                    (item) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {item.name}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Campagne"
              >
                <select
                  value={
                    form.campaignId
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      campaignId:
                        e.target.value,
                    })
                  }
                  className="input"
                >
                  <option value="">
                    Évaluation ponctuelle
                  </option>

                  {campaigns.map(
                    (campaign) => (
                      <option
                        key={
                          campaign.id
                        }
                        value={
                          campaign.id
                        }
                      >
                        {campaign.name}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Date"
              >
                <input
                  type="date"
                  value={
                    form.dateEvaluation
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dateEvaluation:
                        e.target.value,
                    })
                  }
                  className="input"
                />
              </Field>

            </div>

          </section>

          {/* CRITERES */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-5 text-lg font-semibold">
              Grille d'évaluation
            </h2>

            {grid && (
              <div className="space-y-4">

                {grid.criteria.map(
                  (criterion) => {
                    const current =
                      scores.find(
                        (item) =>
                          item.criterionId ===
                          criterion.id
                      );

                    return (
                      <div
                        key={
                          criterion.id
                        }
                        className="rounded-lg border p-4"
                      >

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                          <div>
                            <p className="font-semibold">
                              {criterion.label}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {
                                criterion.description
                              }
                            </p>

                            <p className="mt-1 text-xs text-indigo-600">
                              Pondération :{" "}
                              {
                                criterion.weight
                              }
                              %
                            </p>
                          </div>

                          <div className="flex items-center gap-2">

                            <label className="text-sm">
                              Note
                            </label>

                            <input
                              type="number"
                              min="0"
                              max={
                                criterion.maxScore
                              }
                              step="0.5"
                              value={
                                current?.score ??
                                0
                              }
                              onChange={(
                                e
                              ) =>
                                updateScore(
                                  criterion.id,
                                  Number(
                                    e.target
                                      .value
                                  )
                                )
                              }
                              className="w-24 rounded-lg border px-3 py-2"
                            />

                            <span className="text-sm text-gray-500">
                              /{" "}
                              {
                                criterion.maxScore
                              }
                            </span>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </section>

          {/* APPRECIATION */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <label className="mb-2 block font-medium">
              Appréciation générale
            </label>

            <textarea
              value={
                form.appreciation
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  appreciation:
                    e.target.value,
                })
              }
              rows={5}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Saisir l'appréciation..."
            />

          </section>

          <div className="flex justify-end gap-3">

            <Link
              href="/evaluations"
              className="rounded-lg border bg-white px-5 py-2.5"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white"
            >
              <Save size={18} />
              Enregistrer
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}