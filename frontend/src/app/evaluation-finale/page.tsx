"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, GraduationCap, Briefcase } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { PercentBar, PhaseTag, ScoreBar, Stat, VerdictTag, card, th } from "@/components/final-evaluation/parts";
import { getStoredRole } from "@/lib/access";
import { errorMessage } from "@/lib/crud";
import {
  InternshipsOverview,
  Level,
  PROJECT_READ_ROLES,
  ProjectsOverview,
  fetchInternshipEvaluations,
  fetchProjectEvaluations,
  fmt20,
} from "@/lib/finalEvaluation";

type Tab = "projects" | "internships";

export default function FinalEvaluationPage() {
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<Tab>("projects");
  const [level, setLevel] = useState<Level | "ALL">("ALL");
  const [projects, setProjects] = useState<ProjectsOverview | null>(null);
  const [internships, setInternships] = useState<InternshipsOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const canSeeProjects = PROJECT_READ_ROLES.includes(role);

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
  }, [role, tab, canSeeProjects]);

  const stages = useMemo(
    () => (internships?.internships ?? []).filter((item) => level === "ALL" || item.level === level),
    [internships, level],
  );

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

          <div className="flex flex-wrap gap-2">
            {canSeeProjects && (
              <button type="button" className={tabClass(tab === "projects")} onClick={() => setTab("projects")}>
                <Briefcase className="h-4 w-4" /> Projets
              </button>
            )}
            <button type="button" className={tabClass(tab === "internships")} onClick={() => setTab("internships")}>
              <GraduationCap className="h-4 w-4" /> Stages
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading && <p className="text-sm text-gray-500">Calcul en cours...</p>}

        {/* ------------------------- PROJETS ------------------------- */}
        {tab === "projects" && projects && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Projets évalués" value={`${projects.summary.evaluated}/${projects.summary.count}`} hint={`${projects.summary.final} évaluation(s) finale(s)`} />
              <Stat label="Moyenne générale" value={fmt20(projects.summary.average)} />
              <Stat label="Avis des partenaires" value={String(projects.summary.satisfactionPartners)} hint="questionnaires pris en compte" />
              <Stat label="Avis des bénéficiaires" value={String(projects.summary.satisfactionBeneficiaries)} hint="questionnaires pris en compte" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {projects.projects.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">Aucun projet à évaluer.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className={th}>Rang</th>
                        <th className={th}>Projet</th>
                        <th className={th}>Phase</th>
                        <th className={th}>Note</th>
                        <th className={th}>Mention</th>
                        <th className={th}>Partenaires</th>
                        <th className={th}>Bénéficiaires</th>
                        <th className={th}>Fiabilité</th>
                        <th className={th} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projects.projects.map((project) => (
                        <tr key={project.projectId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-700">{project.rank || "—"}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{project.name}</p>
                            <p className="text-xs text-gray-500">{project.code}</p>
                          </td>
                          <td className="px-4 py-3">
                            <PhaseTag phase={project.phase} />
                          </td>
                          <td className="px-4 py-3">
                            <ScoreBar value={project.score} />
                          </td>
                          <td className="px-4 py-3">
                            <VerdictTag verdict={project.verdict} />
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {project.satisfaction.partners.average !== null ? `${project.satisfaction.partners.average}/5 (${project.satisfaction.partners.count})` : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {project.satisfaction.beneficiaries.average !== null ? `${project.satisfaction.beneficiaries.average}/5 (${project.satisfaction.beneficiaries.count})` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <PercentBar value={project.coverage} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/evaluation-finale/projets/${project.projectId}`} className="font-medium text-blue-700 hover:underline">
                              Détail
                            </Link>
                          </td>
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
              {(["ALL", "L3", "M2"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLevel(value)}
                  className={`px-5 py-3 text-sm font-medium ${level === value ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  {value === "ALL" ? "Tous" : value}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {stages.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">Aucun stage à évaluer.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className={th}>Rang</th>
                        <th className={th}>Stagiaire</th>
                        <th className={th}>Stage</th>
                        <th className={th}>Phase</th>
                        <th className={th}>Note</th>
                        <th className={th}>Mention</th>
                        <th className={th}>Avancement</th>
                        <th className={th}>Achèvement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stages.map((stage) => (
                        <tr key={stage.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-700">{stage.rank ? `${stage.rank}/${stage.cohortSize}` : "—"}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">
                              {stage.student.firstName} {stage.student.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{stage.level}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900">{stage.title}</p>
                            {stage.project && <p className="text-xs text-gray-500">{stage.project.name}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <PhaseTag phase={stage.phase} />
                          </td>
                          <td className="px-4 py-3">
                            <ScoreBar value={stage.score} />
                          </td>
                          <td className="px-4 py-3">
                            <VerdictTag verdict={stage.verdict} />
                          </td>
                          <td className="px-4 py-3">
                            <PercentBar value={stage.components.progress} />
                          </td>
                          <td className="px-4 py-3">
                            <PercentBar value={stage.components.completion} />
                          </td>
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
    </AppLayout>
  );
}
