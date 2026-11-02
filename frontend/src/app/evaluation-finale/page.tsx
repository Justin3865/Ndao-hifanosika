"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Award, GraduationCap, Briefcase, Plus, X } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { ProgressModal } from "@/components/final-evaluation/ProgressModal";
import { PercentBar, PhaseTag, ScoreBar, Stat, VerdictTag, card, th } from "@/components/final-evaluation/parts";
import { getStoredRole } from "@/lib/access";
import { errorMessage } from "@/lib/crud";
import {
  FeedbackKind,
  InternshipsOverview,
  Level,
  PROJECT_READ_ROLES,
  ProjectsOverview,
  fetchInternshipEvaluations,
  fetchProjectEvaluations,
  fmt20,
  isOtherDuration,
} from "@/lib/finalEvaluation";

type Tab = "projects" | "internships";

export default function FinalEvaluationPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<Tab>("projects");
  const [level, setLevel] = useState<Level | "ALL" | "AUTRE">("ALL");
  const [projects, setProjects] = useState<ProjectsOverview | null>(null);
  const [internships, setInternships] = useState<InternshipsOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [avis, setAvis] = useState<FeedbackKind | null>(null);
  const [modal, setModal] = useState<{ mode: "project" | "internship"; id: number | null } | null>(null);

  const canSeeProjects = PROJECT_READ_ROLES.includes(role);
  // Mêmes rôles que les routes d'écriture existantes (monitoring WRITE / internships).
  const canAddProjectProgress = ["ADMIN", "DIRECTION", "COORDINATOR"].includes(role);
  const canAddStageProgress = ["ADMIN", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"].includes(role);
  const addClass =
    "inline-flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-500 transition hover:bg-green-500/20";

  useEffect(() => {
    const current = getStoredRole();
    setRole(current);
    if (!PROJECT_READ_ROLES.includes(current)) setTab("internships");
  }, []);

  useEffect(() => {
    if (!role) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        if (tab === "projects" && canSeeProjects) {
          const data = await fetchProjectEvaluations();
          if (!cancelled) setProjects(data);
        } else if (tab === "internships") {
          const data = await fetchInternshipEvaluations();
          if (!cancelled) setInternships(data);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Impossible de calculer l'évaluation."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, tab, canSeeProjects, reload]);

  const stages = useMemo(
    () => (internships?.internships ?? []).filter((item) =>
      level === "ALL" ? true : level === "AUTRE" ? isOtherDuration(item.level, item.durationMonths) : item.level === level,
    ),
    [internships, level],
  );

  /** Avis : un seul projet concerné → on va directement à ses avis ; sinon la liste par projet s'ouvre. */
  const openAvis = (kind: FeedbackKind) => {
    const withAvis = (projects?.projects ?? []).filter((p) => (kind === "PARTNER" ? p.satisfaction.partners.count : p.satisfaction.beneficiaries.count) > 0);
    if (withAvis.length === 1) router.push(`/evaluation-finale/projets/${withAvis[0].projectId}#avis`);
    else setAvis(kind);
  };

  const scrollToTable = () => document.getElementById("projects-table")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${active ? "bg-blue-700 text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Award className="h-6 w-6 text-amber-500" /> Évaluation finale
            </h1>
            <p className="text-sm text-gray-500">
              Note automatique sur 20 des projets (réalisation, satisfaction des partenaires et des bénéficiaires…) et des stages.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <div className="flex gap-2 [&>button]:flex-1 [&>button]:justify-center">
              {canSeeProjects && (
                <button type="button" className={tabClass(tab === "projects")} onClick={() => setTab("projects")}>
                  <Briefcase className="h-4 w-4" /> Projets
                </button>
              )}
              <button type="button" className={tabClass(tab === "internships")} onClick={() => setTab("internships")}>
                <GraduationCap className="h-4 w-4" /> Stages
              </button>
            </div>

            {tab === "projects" && canAddProjectProgress && (
              <button type="button" className={`${addClass} w-full justify-center`} onClick={() => setModal({ mode: "project", id: null })}>
                <Plus className="h-4 w-4" /> Ajouter avancement projet
              </button>
            )}
            {tab === "internships" && canAddStageProgress && (
              <button type="button" className={`${addClass} w-full justify-center`} onClick={() => setModal({ mode: "internship", id: null })}>
                <Plus className="h-4 w-4" /> Ajouter avancement stage
              </button>
            )}
          </div>
        </div>

        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>}
        {loading && <p className="text-sm text-gray-500">Calcul en cours...</p>}

        {/* ------------------------- PROJETS ------------------------- */}
        {tab === "projects" && projects && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Projets évalués" value={`${projects.summary.evaluated}/${projects.summary.count}`} hint={`${projects.summary.final} évaluation(s) finale(s)`} onClick={scrollToTable} />
              <Stat label="Moyenne générale" value={fmt20(projects.summary.average)} onClick={scrollToTable} />
              <Stat label="Avis des partenaires" value={String(projects.summary.satisfactionPartners)} hint="questionnaires pris en compte" onClick={() => openAvis("PARTNER")} />
              <Stat label="Avis des bénéficiaires" value={String(projects.summary.satisfactionBeneficiaries)} hint="questionnaires pris en compte" onClick={() => openAvis("BENEFICIARY")} />
            </div>

            <div id="projects-table" className="scroll-mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {projects.projects.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">Aucun projet à évaluer.</p>
              ) : (
                <div className="overflow-hidden">
                  <table className="w-full table-fixed text-center text-sm">
                    <colgroup>
                      {[5, 17, 10, 13, 9, 9, 10, 12, 6].map((w, i) => (
                        <col key={i} style={{ width: `${w}%` }} />
                      ))}
                      {canAddProjectProgress && <col style={{ width: "9%" }} />}
                    </colgroup>
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className={`${th} text-center`}>Rang</th>
                        <th className={`${th} text-center`}>Projet</th>
                        <th className={`${th} text-center`}>Phase</th>
                        <th className={`${th} text-center`}>Note</th>
                        <th className={`${th} text-center`}>Mention</th>
                        <th className={`${th} text-center`}>Partenaires</th>
                        <th className={`${th} text-center`}>Bénéficiaires</th>
                        <th className={`${th} text-center`}>Fiabilité</th>
                        <th className={th} />
                        {canAddProjectProgress && <th className={th} />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projects.projects.map((project) => (
                        <tr key={project.projectId} className="hover:bg-gray-50">
                          <td className="px-2 py-3 text-center font-semibold text-gray-700">{project.rank || "—"}</td>
                          <td className="px-2 py-3 text-center">
                            <p className="font-medium text-gray-900">{project.name}</p>
                            <p className="text-xs text-gray-500">{project.code}</p>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <PhaseTag phase={project.phase} />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <ScoreBar value={project.score} />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <VerdictTag verdict={project.verdict} />
                          </td>
                          <td className="px-2 py-3 text-center text-gray-700">
                            {project.satisfaction.partners.average !== null ? `${project.satisfaction.partners.average}/5 (${project.satisfaction.partners.count})` : "—"}
                          </td>
                          <td className="px-2 py-3 text-center text-gray-700">
                            {project.satisfaction.beneficiaries.average !== null ? `${project.satisfaction.beneficiaries.average}/5 (${project.satisfaction.beneficiaries.count})` : "—"}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <PercentBar value={project.coverage} />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <Link href={`/evaluation-finale/projets/${project.projectId}`} className="font-medium text-blue-700 hover:underline">
                              Détail
                            </Link>
                          </td>
                          {canAddProjectProgress && (
                            <td className="px-2 py-3 text-center">
                              <button type="button" onClick={() => setModal({ mode: "project", id: project.projectId })} className="whitespace-nowrap font-medium text-green-500 hover:underline">+ Avancement</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={`${card} text-sm text-gray-600`}>
              <p className="font-medium text-gray-900">Comment la note est calculée</p>
              <p className="mt-1">
                Réalisation {projects.weights.realisation}% · satisfaction des bénéficiaires {projects.weights.beneficiaries}% · satisfaction des partenaires {projects.weights.partners}% ·
                évaluations menées {projects.weights.evaluations}% · résultats des stages rattachés {projects.weights.interns}% · maîtrise du budget {projects.weights.budget}% · couverture des
                bénéficiaires {projects.weights.reach}%. Une donnée absente est ignorée : la colonne « Fiabilité » indique la part de la note qui repose sur des données réelles.
              </p>
            </div>
          </>
        )}

        {/* ------------------------- STAGES ------------------------- */}
        {tab === "internships" && internships && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Stages évalués" value={`${internships.summary.evaluated}/${internships.summary.count}`} />
              <Stat label="Stages terminés" value={String(internships.summary.final)} />
              <Stat label="Moyenne générale" value={fmt20(internships.summary.average)} />
            </div>

            <div className="inline-flex overflow-hidden rounded-xl border border-gray-300 bg-white">
              {(["ALL", "L3", "M2", "AUTRE"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLevel(value)}
                  className={`px-5 py-3 text-sm font-medium ${level === value ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  {value === "ALL" ? "Tous" : value === "AUTRE" ? "Autre" : value}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {stages.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">Aucun stage à évaluer.</p>
              ) : (
                <div className="overflow-hidden">
                  <table className="w-full table-fixed text-center text-sm">
                    <colgroup>
                      {[6, 15, 17, 10, 13, 9, 11, 11].map((w, i) => (
                        <col key={i} style={{ width: `${w}%` }} />
                      ))}
                      {canAddStageProgress && <col style={{ width: "8%" }} />}
                    </colgroup>
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className={`${th} text-center`}>Rang</th>
                        <th className={`${th} text-center`}>Stagiaire</th>
                        <th className={`${th} text-center`}>Stage</th>
                        <th className={`${th} text-center`}>Phase</th>
                        <th className={`${th} text-center`}>Note</th>
                        <th className={`${th} text-center`}>Mention</th>
                        <th className={`${th} text-center`}>Avancement</th>
                        <th className={`${th} text-center`}>Achèvement</th>
                        {canAddStageProgress && <th className={th} />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stages.map((stage) => (
                        <tr key={stage.id} className="hover:bg-gray-50">
                          <td className="px-2 py-3 text-center font-semibold text-gray-700">{stage.rank ? `${stage.rank}/${stage.cohortSize}` : "—"}</td>
                          <td className="px-2 py-3 text-center">
                            <p className="font-medium text-gray-900">
                              {stage.student.firstName} {stage.student.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{stage.level}</p>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <p className="text-gray-900">{stage.title}</p>
                            {stage.project && <p className="text-xs text-gray-500">{stage.project.name}</p>}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <PhaseTag phase={stage.phase} />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <ScoreBar value={stage.score} />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <VerdictTag verdict={stage.verdict} />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <PercentBar value={stage.components.progress} />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <PercentBar value={stage.components.completion} />
                          </td>
                          {canAddStageProgress && (
                            <td className="px-2 py-3 text-center">
                              <button type="button" onClick={() => setModal({ mode: "internship", id: stage.id })} className="whitespace-nowrap font-medium text-green-500 hover:underline">+ Avancement</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={`${card} text-sm text-gray-600`}>
              <p className="font-medium text-gray-900">Comment la note est calculée</p>
              <p className="mt-1">
                Même calcul que l&apos;ordre de mérite : avancement des tâches {internships.weights.progress}% · achèvement {internships.weights.completion}% · évaluation du tuteur{" "}
                {internships.weights.evaluation}% · rapports {internships.weights.reports}% · présence {internships.weights.presence}%. Le rang est donné dans la promotion (L3 / M2).{" "}
                <Link href="/merit" className="font-medium text-blue-700 hover:underline">
                  Voir l&apos;ordre de mérite
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
      {avis && projects && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setAvis(null)}>
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{avis === "PARTNER" ? "Avis des partenaires" : "Avis des bénéficiaires"}</h2>
              <button type="button" onClick={() => setAvis(null)} aria-label="Fermer" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              {avis === "PARTNER" ? projects.summary.satisfactionPartners : projects.summary.satisfactionBeneficiaries} questionnaire(s) pris en compte, par projet.
            </p>

            {(() => {
              const rows = projects.projects
                .map((p) => ({ p, s: avis === "PARTNER" ? p.satisfaction.partners : p.satisfaction.beneficiaries }))
                .filter((r) => r.s.count > 0);

              if (rows.length === 0) return <p className="py-6 text-center text-sm text-gray-500">Aucun avis enregistré pour le moment.</p>;

              return (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-2 py-2 font-semibold">Projet</th>
                      <th className="px-2 py-2 text-center font-semibold">Avis</th>
                      <th className="px-2 py-2 text-center font-semibold">Moyenne</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map(({ p, s }) => (
                      <tr key={p.projectId}>
                        <td className="px-2 py-3">
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.code}</p>
                        </td>
                        <td className="px-2 py-3 text-center text-gray-700">{s.count}</td>
                        <td className="px-2 py-3 text-center font-semibold text-gray-900">{s.average !== null ? `${s.average}/5` : "—"}</td>
                        <td className="px-2 py-3 text-right">
                          <Link href={`/evaluation-finale/projets/${p.projectId}`} className="font-medium text-blue-700 hover:underline">
                            Voir les avis
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}
      {modal && (
        <ProgressModal
          mode={modal.mode}
          initialId={modal.id}
          options={
            modal.mode === "project"
              ? (projects?.projects ?? []).map((p) => ({ id: p.projectId, label: `${p.name} (${p.code})` }))
              : (internships?.internships ?? []).map((i) => ({ id: i.id, label: `${i.student.firstName} ${i.student.lastName} — ${i.title}` }))
          }
          onClose={() => setModal(null)}
          onSaved={() => setReload((n) => n + 1)}
        />
      )}
    </AppLayout>
  );
}
