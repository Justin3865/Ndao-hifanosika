"use client";

import { maskMoney } from "@/lib/privacy";
import { Fragment, useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowDownCircle, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, ListChecks, PlayCircle, Search, Settings2, Target, Users } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import RuleEditor from "@/components/enrollment/RuleEditor";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/crud";
import { getStoredRole } from "@/lib/access";
import { toast } from "@/lib/toast";
import { scoreColor } from "@/lib/useLiveTargets";
import {
  STATUS_LABEL,
  STATUS_STYLE,
  type EnqueteRow,
  type EnrollmentOverview,
  type ProjectQuota,
  type SelectionSummary,
} from "@/lib/enrollment";

const fmtDate = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default function EnrollmentPage() {
  const [role, setRole] = useState("");
  useEffect(() => setRole(getStoredRole()), []);
  const canEnrollManually = role === "ADMIN" || role === "DIRECTION";

  const [overview, setOverview] = useState<EnrollmentOverview | null>(null);
  const [rows, setRows] = useState<EnqueteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [projectId, setProjectId] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [editing, setEditing] = useState<ProjectQuota | null>(null);
  const [running, setRunning] = useState<number | "all" | null>(null);
  const [selection, setSelection] = useState<SelectionSummary | null>(null);
  const [manualProject, setManualProject] = useState<Record<string, string>>({});

  // Détail des chiffres de la bannière : « enquêtes reçues » (toutes) ou « devenues bénéficiaires » (ENROLLED)
  const [detail, setDetail] = useState<"all" | "enrolled" | null>(null);
  const [detailRows, setDetailRows] = useState<EnqueteRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (!detail) return;

    let cancelled = false;
    setDetailLoading(true);
    setDetailError("");
    setDetailRows([]);

    api
      .get("/enrollment/enquetes", { params: { kind: "CANDIDATE", status: detail === "enrolled" ? "ENROLLED" : "", limit: 300 } })
      .then((res) => {
        if (!cancelled) setDetailRows(res.data?.data?.rows ?? []);
      })
      .catch((err) => {
        if (!cancelled) setDetailError(errorMessage(err, "Chargement impossible."));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [detail]);

  const closeDetail = useCallback(() => setDetail(null), []);

  const loadOverview = useCallback(() => {
    api
      .get("/enrollment/overview")
      .then((res) => setOverview(res.data?.data ?? null))
      .catch((err) => setError(errorMessage(err, "Chargement impossible.")));
  }, []);

  const loadRows = useCallback(() => {
    setLoading(true);

    api
      .get("/enrollment/enquetes", { params: { q: query, status, kind, projectId, limit: 150 } })
      .then((res) => {
        setRows(res.data?.data?.rows ?? []);
        setTotal(res.data?.data?.total ?? 0);
        setError("");
      })
      .catch((err) => setError(errorMessage(err, "Chargement impossible.")))
      .finally(() => setLoading(false));
  }, [query, status, kind, projectId]);

  useEffect(loadOverview, [loadOverview]);

  useEffect(() => {
    const timer = window.setTimeout(loadRows, 300);
    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const refresh = () => {
    loadOverview();
    loadRows();
  };

  // La sélection se lance toute seule à chaque nouvelle enquête de mission : on rafraîchit régulièrement
  useEffect(() => {
    const timer = window.setInterval(() => {
      loadOverview();
      loadRows();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [loadOverview, loadRows]);

  const runSelection = async (target: number | "all", dryRun: boolean) => {
    setRunning(target);

    try {
      const res = await api.post("/enrollment/select", { projectId: target === "all" ? undefined : target, dryRun });
      const data = res.data?.data as SelectionSummary;
      setSelection(data);

      if (!dryRun) {
        toast.success(data.enrolledNow ? `${data.enrolledNow} candidat(s) inscrit(s) comme bénéficiaires` : "Aucun nouveau bénéficiaire");
        refresh();
      }
    } catch (err) {
      toast.error(errorMessage(err, "Sélection impossible."));
    } finally {
      setRunning(null);
    }
  };

  // Quota non atteint alors que le plancher est atteint : on abaisse le seuil de 5 points et on relance la sélection du projet
  const lowerFloor = async (p: ProjectQuota) => {
    setRunning(p.projectId);

    try {
      const res = await api.post(`/enrollment/rules/${p.projectId}/lower`);
      const data = res.data?.data?.selection as SelectionSummary | undefined;
      if (data) setSelection(data);

      toast.success(`Seuil abaissé à ${p.nextFloor ?? 0}${data?.enrolledNow ? ` : ${data.enrolledNow} nouveau(x) bénéficiaire(s)` : ""}`);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Impossible d'abaisser le seuil."));
    } finally {
      setRunning(null);
    }
  };

  const enrollManually = async (row: EnqueteRow) => {
    const chosen = manualProject[row.key];
    if (!chosen) return;

    try {
      await api.post(`/enrollment/candidates/${row.id}/enroll`, { projectId: Number(chosen) });
      toast.success(`${row.name} est maintenant bénéficiaire`);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Inscription impossible."));
    }
  };

  const cards = overview
    ? [
        { label: "En attente d'évaluation", value: overview.totals.pending, icon: ClipboardList },
        { label: "Liste d'attente", value: overview.totals.waitlist, icon: ListChecks },
        { label: "Critères non remplis", value: overview.totals.notEligible, icon: Target },
        { label: "Devenus bénéficiaires", value: overview.totals.enrolled, icon: Users },
      ]
    : [];

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enquêtes &amp; sélection des bénéficiaires</h1>
          <p className="text-sm text-gray-500">
            Toutes les enquêtes réalisées en mission. L&apos;IA note chaque ménage ; selon les critères et le quota de chaque projet, les ménages les mieux classés deviennent bénéficiaires.
          </p>
        </div>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {cards.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {overview && (
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <button
              type="button"
              onClick={() => setDetail("all")}
              title="Afficher les enquêtes reçues"
              className="font-semibold underline decoration-dotted underline-offset-2 hover:decoration-solid"
            >
              {overview.totals.surveys} enquête(s) reçue(s)
            </button>{" "}
            →{" "}
            <button
              type="button"
              onClick={() => setDetail("enrolled")}
              title="Afficher les ménages devenus bénéficiaires"
              className="font-semibold underline decoration-dotted underline-offset-2 hover:decoration-solid"
            >
              {overview.totals.enrolled} devenue(s) bénéficiaire(s)
            </button>
            . Chaque nouvelle enquête relance la sélection automatiquement ; seuls les ménages sélectionnés reçoivent un matricule bénéficiaire. Prochain matricule bénéficiaire :{" "}
            <span className="font-mono">{overview.nextBeneficiaryMatricule}</span>
          </p>
        )}

        {/* ------------------------------ quotas et critères ------------------------------ */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Quota et critères par projet</h2>
              <p className="text-xs text-gray-500">Quota = « bénéficiaires visés » du projet.</p>
            </div>

            <button
              type="button"
              disabled={running !== null}
              onClick={() => void runSelection("all", false)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
            >
              <PlayCircle className="h-4 w-4" /> {running === "all" ? "Sélection en cours…" : "Lancer la sélection (tous les projets)"}
            </button>
          </div>

          {overview && overview.projects.length === 0 && <p className="py-4 text-center text-sm text-gray-500">Aucun projet en cours.</p>}

          <div className="grid gap-4 lg:grid-cols-2">
            {overview?.projects.map((p) => {
              const pct = p.target && p.target > 0 ? Math.min(100, Math.round((p.enrolled / p.target) * 100)) : 0;

              return (
                <div key={p.projectId} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        {p.rule.enabled
                          ? `${p.configured ? "Critères définis" : "Critères par défaut"} · ${p.rule.autoEnroll ? "inscription automatique" : "validation manuelle"} · score ${p.rule.topScore} → ${p.rule.minScore} (paliers de 5)`
                          : "Sélection désactivée"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-gray-900">
                      {p.enrolled}
                      {p.target !== null ? ` / ${p.target}` : ""}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-700" style={{ width: `${pct}%` }} />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {p.target === null
                      ? "Quota non défini (« bénéficiaires visés » du projet)."
                      : `${p.remaining} place(s) restante(s) · ${p.waitlist} en liste d'attente · ${p.enrolledFromSurveys} issu(s) des enquêtes`}
                  </p>

                  {p.shortfall > 0 && p.rule.enabled && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" /> Quota non atteint : il manque {p.shortfall} bénéficiaire(s)
                      </p>
                      <p className="mt-1">
                        Le seuil de score minimal ({p.rule.minScore}) est atteint. Ajoutez des enquêtes
                        {p.nextFloor !== null ? ` ou abaissez le seuil de 5 points (${p.rule.minScore} → ${p.nextFloor}).` : "."}
                        {p.nextFloor !== null && p.nextFloorCount > 0 ? ` ${p.nextFloorCount} ménage(s) éligible(s) ont un score entre ${p.nextFloor} et ${p.rule.minScore - 1}.` : ""}
                      </p>
                      {p.nextFloor !== null && (
                        <button
                          type="button"
                          disabled={running !== null}
                          onClick={() => void lowerFloor(p)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          <ArrowDownCircle className="h-3.5 w-3.5" /> Abaisser le seuil à {p.nextFloor}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setEditing(p)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      <Settings2 className="h-3.5 w-3.5" /> Critères
                    </button>
                    <button
                      type="button"
                      disabled={running !== null}
                      onClick={() => void runSelection(p.projectId, true)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Simuler
                    </button>
                    <button
                      type="button"
                      disabled={running !== null}
                      onClick={() => void runSelection(p.projectId, false)}
                      className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
                    >
                      {running === p.projectId ? "En cours…" : "Lancer la sélection"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {selection && (
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="mb-2 font-semibold">
                {selection.dryRun ? "Simulation (rien n'a été enregistré)" : `Sélection terminée : ${selection.enrolledNow} nouveau(x) bénéficiaire(s)`}
              </p>

              {selection.projects.length === 0 && <p>Aucun projet avec des critères actifs.</p>}

              <div className="space-y-2">
                {selection.projects.map((r) => (
                  <div key={r.projectId} className="rounded-lg bg-white/70 p-3">
                    <p className="font-medium">
                      {r.projectName} — {r.selected.length} retenu(s), {r.waitlisted} en attente, {r.ineligible} hors critères
                    </p>
                    {r.skipped && <p className="text-xs text-amber-800">{r.skipped}</p>}
                    {r.threshold !== null && !r.skipped && (
                      <p className="text-xs">
                        Seuil de score retenu : {r.threshold} (de {r.top} à {r.floor}, par paliers de 5)
                      </p>
                    )}
                    {r.shortfall > 0 && !r.skipped && (
                      <p className="text-xs text-amber-800">Quota non atteint : il manque {r.shortfall} bénéficiaire(s). Ajoutez des enquêtes ou abaissez le seuil de 5 points.</p>
                    )}
                    {!r.autoEnroll && selection.dryRun && <p className="text-xs">Validation manuelle : utilisez « Lancer la sélection ».</p>}
                    {r.selected.length > 0 && (
                      <p className="mt-1 text-xs">
                        {r.selected.map((s) => `${s.name} (${s.score})`).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------ toutes les enquêtes ------------------------------ */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-semibold text-gray-900">Enquêtes réalisées en mission</h2>
          <p className="mb-4 text-xs text-gray-500">
            {total} enquête(s). Recherche par nom, matricule d&apos;enquête (NH-…-ENQ-…), de bénéficiaire (BEN) ou d&apos;agent (AGT), téléphone ou localité.
          </p>

          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un enquêté / ménage…" className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm" />
            </div>

            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm">
              <option value="">Tous les statuts</option>
              {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>

            <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm">
              <option value="">Tous les ménages</option>
              <option value="CANDIDATE">Nouveaux ménages</option>
              <option value="BENEFICIARY">Bénéficiaires déjà inscrits</option>
            </select>

            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm">
              <option value="">Tous les projets</option>
              {overview?.projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <th className="py-2 pr-3">Ménage</th>
                  <th className="py-2 pr-3">Score IA</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Projet</th>
                  <th className="py-2 pr-3">Agent · mission</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-500">
                      Chargement…
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-500">
                      Aucune enquête trouvée.
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((r) => {
                    const open = expanded === r.key;

                    return (
                      <Fragment key={r.key}>
                        <tr onClick={() => setExpanded(open ? null : r.key)} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 pr-3">
                            <p className="font-semibold text-gray-900">{r.name}</p>
                            <p className="text-xs text-gray-500">
                              {r.code ?? "—"} · {r.kind === "CANDIDATE" ? "Nouveau ménage" : "Bénéficiaire inscrit"}
                              {r.beneficiaryMatricule ? ` · ${r.beneficiaryMatricule}` : ""}
                              {r.locality ? ` · ${r.locality}` : ""}
                            </p>
                          </td>
                          <td className="py-3 pr-3">
                            {r.score !== null ? (
                              <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: scoreColor(r.score) }}>
                                {r.score}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 pr-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                              {r.status === "ENROLLED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {STATUS_LABEL[r.status]}
                              {r.status === "WAITLIST" && r.waitlistRank ? ` #${r.waitlistRank}` : ""}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-gray-700">{r.projectName ?? r.targetProjectName ?? "—"}</td>
                          <td className="py-3 pr-3 text-xs text-gray-600">
                            {r.agentName}
                            {r.agentMatricule ? ` (${r.agentMatricule})` : ""}
                            {r.missionCode ? ` · ${r.missionCode}` : ""}
                          </td>
                          <td className="py-3 pr-3 text-xs text-gray-600">{fmtDate(r.surveyedAt)}</td>
                          <td className="text-gray-400">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</td>
                        </tr>

                        {open && (
                          <tr className="border-b border-gray-100 bg-slate-50">
                            <td colSpan={7} className="space-y-3 px-3 py-4 text-sm text-gray-700">
                              <p>
                                Ménage de {r.householdSize ?? "?"} personne(s) · {r.childrenUnder5 ?? 0} enfant(s) de moins de 5 ans · revenu{" "}
                                {r.monthlyIncome !== null ? maskMoney(`${r.monthlyIncome.toLocaleString("fr-FR")} Ar/mois`) : "non renseigné"}
                                {r.hasDisability ? " · handicap" : ""}
                                {r.vulnerable ? " · jugé vulnérable par l'agent" : ""}
                                {r.method ? ` · score ${r.method === "ML" ? "modèle IA" : "heuristique"}` : ""}
                              </p>

                              {r.decision?.reasons && r.decision.reasons.length > 0 && (
                                <div>
                                  <p className="font-medium text-gray-900">
                                    Dernière décision{r.decision.projectName ? ` — ${r.decision.projectName}` : ""}
                                    {r.decision.at ? ` (${fmtDate(r.decision.at)})` : ""}
                                  </p>
                                  <ul className="list-disc pl-5 text-xs">
                                    {r.decision.reasons.map((reason) => (
                                      <li key={reason}>{reason}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {r.status === "ENROLLED" && r.decision && !r.decision.reasons?.length && (
                                <p className="text-xs text-green-700">
                                  Retenu : rang {r.decision.rank ?? "—"} sur un quota de {r.decision.quota ?? "—"}, score {r.decision.score ?? "—"}.
                                </p>
                              )}

                              {r.beneficiaryId && (
                                <a href={`/beneficiaries/${r.beneficiaryId}`} className="inline-block text-xs font-medium text-blue-800 hover:underline">
                                  Ouvrir la fiche du bénéficiaire
                                </a>
                              )}

                              {canEnrollManually && r.kind === "CANDIDATE" && r.status !== "ENROLLED" && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={manualProject[r.key] ?? ""}
                                    onChange={(e) => setManualProject((cur) => ({ ...cur, [r.key]: e.target.value }))}
                                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                                  >
                                    <option value="">Inscrire manuellement dans…</option>
                                    {overview?.projects.map((p) => (
                                      <option key={p.projectId} value={p.projectId}>
                                        {p.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={!manualProject[r.key]}
                                    onClick={() => void enrollManually(r)}
                                    className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
                                  >
                                    Inscrire
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Modal
        isOpen={detail !== null}
        onClose={closeDetail}
        size="xl"
        title={detail === "enrolled" ? "Ménages devenus bénéficiaires" : "Enquêtes reçues"}
        description={
          detail === "enrolled"
            ? "Ménages enquêtés sélectionnés comme bénéficiaires."
            : "Ménages enquêtés et leur statut."
        }
      >
        {detailLoading && <p className="py-6 text-center text-sm text-gray-500">Chargement…</p>}
        {detailError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{detailError}</p>}
        {!detailLoading && !detailError && detailRows.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Aucune enquête.</p>}

        {detailRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <th className="py-2 pr-3">Ménage</th>
                  <th className="py-2 pr-3">Score IA</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Projet</th>
                  <th className="py-2 pr-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((r) => (
                  <tr key={r.key} className="border-b border-gray-100">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-500">
                        {r.code ?? "—"}
                        {r.beneficiaryMatricule ? ` · ${r.beneficiaryMatricule}` : ""}
                        {r.locality ? ` · ${r.locality}` : ""}
                      </p>
                      {r.beneficiaryId && (
                        <a href={`/beneficiaries/${r.beneficiaryId}`} className="text-xs font-medium text-blue-800 hover:underline">
                          Ouvrir la fiche
                        </a>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {r.score !== null ? (
                        <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: scoreColor(r.score) }}>
                          {r.score}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                        {r.status === "ENROLLED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {STATUS_LABEL[r.status]}
                        {r.status === "WAITLIST" && r.waitlistRank ? ` #${r.waitlistRank}` : ""}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-gray-700">{r.projectName ?? r.targetProjectName ?? "—"}</td>
                    <td className="py-3 pr-3 text-xs text-gray-600">{fmtDate(r.surveyedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {editing && (
        <RuleEditor
          project={editing}
          onClose={() => setEditing(null)}
          onSaved={(sel) => {
            setEditing(null);
            if (sel) setSelection(sel);
            refresh();
          }}
        />
      )}
    </AppLayout>
  );
}
