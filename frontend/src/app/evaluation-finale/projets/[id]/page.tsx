"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Lightbulb, Plus, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { FeedbackForm } from "@/components/final-evaluation/FeedbackForm";
import { PercentBar, PhaseTag, VerdictTag, card, th } from "@/components/final-evaluation/parts";
import { getStoredRole } from "@/lib/access";
import { errorMessage, fmtDate } from "@/lib/crud";
import {
  FeedbackKind,
  ProjectEvaluationDetail,
  SatisfactionSummary,
  WRITE_ROLES,
  fetchProjectEvaluation,
  fmt20,
  removeFeedback,
} from "@/lib/finalEvaluation";
import { confirmDialog, toast } from "@/lib/toast";

const TITLES: Record<FeedbackKind, string> = {
  PARTNER: "Satisfaction des partenaires (méthode de travail de l'ONG)",
  BENEFICIARY: "Satisfaction des bénéficiaires",
};

function SatisfactionCard({
  kind,
  summary,
  canWrite,
  onAdd,
}: {
  kind: FeedbackKind;
  summary: SatisfactionSummary;
  canWrite: boolean;
  onAdd: () => void;
}) {
  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">{TITLES[kind]}</h2>
          {summary.count > 0 ? (
            <p className="mt-1 text-sm text-gray-600">
              <strong className="text-2xl text-gray-900">{summary.average}</strong>/5 · {summary.count} avis · {summary.satisfiedPct}% de satisfaits
            </p>
          ) : (
            <p className="mt-1 text-sm text-amber-700">Aucun avis : composante non comptée dans la note.</p>
          )}
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-600 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" /> Ajouter un avis
          </button>
        )}
      </div>

      {summary.count > 0 && (
        <div className="mt-4 space-y-2">
          {summary.byCriterion.map((criterion) => (
            <div key={criterion.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-gray-700">{criterion.label}</span>
              <div className="flex items-center gap-2">
                <PercentBar value={criterion.average === null ? null : (criterion.average / 5) * 100} />
                <span className="w-12 text-right font-medium text-gray-900">{criterion.average ?? "—"}/5</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bullets({ title, items, tone, icon }: { title: string; items: string[]; tone: string; icon: ReactNode }) {
  if (items.length === 0) return null;

  return (
    <div className={card}>
      <h2 className={`flex items-center gap-2 font-semibold ${tone}`}>
        {icon} {title}
      </h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ProjectFinalEvaluationPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);

  const [role, setRole] = useState("");
  const [data, setData] = useState<ProjectEvaluationDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<FeedbackKind | null>(null);

  const canWrite = WRITE_ROLES.includes(role);

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) return;

    try {
      setData(await fetchProjectEvaluation(id));
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger l'évaluation du projet."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setRole(getStoredRole());
    void load();
  }, [load]);

  // Arrivée depuis « Avis des partenaires / bénéficiaires » : descend jusqu'aux avis une fois chargés
  useEffect(() => {
    if (data && typeof window !== "undefined" && window.location.hash === "#avis") {
      document.getElementById("avis")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [data]);

  const remove = async (feedbackId: number) => {
    if (!(await confirmDialog("Supprimer cet avis ? La note du projet sera recalculée."))) return;

    try {
      await removeFeedback(feedbackId);
      toast.success("Avis supprimé.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Suppression impossible."));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <Link href="/evaluation-finale" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;évaluation finale
        </Link>

        {loading && <p className="text-sm text-gray-500">Calcul en cours...</p>}
        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>}

        {data && (
          <>
            {/* ----- En-tête : note finale ----- */}
            <div className={`${card} flex flex-wrap items-center justify-between gap-6`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
                  <PhaseTag phase={data.phase} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {data.code} · {fmtDate(data.startDate)} → {fmtDate(data.endDate)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-5xl font-bold text-gray-900">{data.score === null ? "—" : fmt20(data.score)}</p>
                <div className="mt-2 flex items-center justify-end gap-2 text-sm text-gray-600">
                  <VerdictTag verdict={data.verdict} />
                  {data.rank > 0 && (
                    <span>
                      {data.rank}
                      {data.rank === 1 ? "er" : "e"} sur {data.projectsCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {data.missing.length > 0 && (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Note calculée sur <strong>{data.coverage}%</strong> des données. Manque : {data.missing.join(" ; ")}.
                </p>
              </div>
            )}

            {/* ----- Composantes ----- */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className={th}>Critère</th>
                    <th className={th}>Poids</th>
                    <th className={th}>Résultat</th>
                    <th className={th}>Note</th>
                    <th className={th}>Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.components.map((component) => (
                    <tr key={component.key}>
                      <td className="px-4 py-3 font-medium text-gray-900">{component.label}</td>
                      <td className="px-4 py-3 text-gray-700">{component.weight}%</td>
                      <td className="px-4 py-3">
                        <PercentBar value={component.percent} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{fmt20(component.on20)}</td>
                      <td className="px-4 py-3 text-gray-600">{component.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ----- Satisfaction ----- */}
            <SatisfactionCard kind="PARTNER" summary={data.satisfaction.partners} canWrite={canWrite} onAdd={() => setAdding("PARTNER")} />
            {adding === "PARTNER" && (
              <FeedbackForm
                projectId={data.projectId}
                kind="PARTNER"
                criteria={data.criteria.PARTNER}
                partners={data.partners}
                beneficiaries={data.beneficiaries}
                onCancel={() => setAdding(null)}
                onSaved={() => {
                  setAdding(null);
                  void load();
                }}
              />
            )}
            {canWrite && data.partners.length === 0 && (
              <p className="text-sm text-gray-500">Aucun partenaire rattaché : ajoutez-en depuis la fiche du projet.</p>
            )}

            <SatisfactionCard kind="BENEFICIARY" summary={data.satisfaction.beneficiaries} canWrite={canWrite} onAdd={() => setAdding("BENEFICIARY")} />
            {adding === "BENEFICIARY" && (
              <FeedbackForm
                projectId={data.projectId}
                kind="BENEFICIARY"
                criteria={data.criteria.BENEFICIARY}
                partners={data.partners}
                beneficiaries={data.beneficiaries}
                onCancel={() => setAdding(null)}
                onSaved={() => {
                  setAdding(null);
                  void load();
                }}
              />
            )}

            {/* ----- Lecture automatique ----- */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Bullets title="Points forts" items={data.strengths} tone="text-green-700" icon={<ThumbsUp className="h-4 w-4" />} />
              <Bullets title="Points à améliorer" items={data.weaknesses} tone="text-amber-700" icon={<ThumbsDown className="h-4 w-4" />} />
              <Bullets title="Recommandations" items={data.recommendations} tone="text-blue-700" icon={<Lightbulb className="h-4 w-4" />} />
            </div>

            {/* ----- Avis recueillis ----- */}
            {data.feedback.length > 0 && (
              <div id="avis" className="scroll-mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-900">Avis recueillis</div>
                <ul className="divide-y divide-gray-100">
                  {data.feedback.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.kind === "PARTNER" ? "Partenaire" : "Bénéficiaire"} — {item.who}
                          {item.kind === "PARTNER" && item.partnerName && item.partnerName !== item.who ? ` (${item.partnerName})` : ""}
                        </p>
                        <p className="text-xs text-gray-500">{fmtDate(item.collectedAt)}</p>
                        {item.comment && <p className="mt-1 text-gray-700">« {item.comment} »</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{item.score}/5</span>
                        {canWrite && (
                          <button type="button" onClick={() => remove(item.id)} aria-label="Supprimer l'avis" className="rounded-lg p-2 text-amber-600 hover:bg-amber-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
