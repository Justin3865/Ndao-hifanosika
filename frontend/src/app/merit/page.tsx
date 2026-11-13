"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Medal, Trophy } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { getStoredRole } from "@/lib/access";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import {
  Group,
  HistoryData,
  Level,
  MeritData,
  MeritKey,
  MeritRow,
  closeMeritPeriod,
  reopenMeritGroup,
  fetchMerit,
  fetchMeritHistory,
} from "@/lib/activitySpace";
import { confirmDialog, toast } from "@/lib/toast";

const CLOSERS = ["ADMIN", "DIRECTION", "COORDINATOR", "RH"];
const BADGE: Record<string, string> = {
  Excellent: "bg-green-100 text-green-700",
  "Très bien": "bg-green-100 text-green-700",
  Bien: "bg-blue-100 text-blue-700",
  Passable: "bg-amber-100 text-amber-800",
  "À améliorer": "bg-amber-100 text-amber-800",
};
const MEDAL = ["text-amber-500", "text-slate-400", "text-blue-500"];
const COMPONENT_LABELS: Array<[MeritKey, string]> = [
  ["progress", "Avancement"],
  ["completion", "Achèvement"],
  ["evaluation", "Éval. tuteur"],
  ["reports", "Rapports"],
  ["presence", "Présence"],
];

const fmt20 = (value: number) => value.toFixed(2).replace(/\.?0+$/, "");

const th = "px-2 py-3 font-semibold";
const card = "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm";

function Rank({ rank }: { rank: number }) {
  return rank <= 3 ? (
    <span className={`inline-flex items-center gap-1 font-bold ${MEDAL[rank - 1]}`}>
      <Medal className="h-5 w-5" />
      {rank}
    </span>
  ) : (
    <span className="font-semibold text-gray-700">{rank}</span>
  );
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, (value / 20) * 100))}%` }} />
      </div>
      <span className="shrink-0 text-sm font-semibold text-gray-900">{fmt20(value)}/20</span>
    </div>
  );
}

function BadgeTag({ badge }: { badge: string | null }) {
  return badge ? (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${BADGE[badge] ?? "bg-gray-100 text-gray-700"}`}>{badge}</span>
  ) : null;
}

function RankingTable({ rows, highlightId }: { rows: MeritRow[]; highlightId?: number | null }) {
  if (rows.length === 0) return <p className="px-4 py-8 text-center text-sm text-gray-500">Aucun stagiaire classé pour cette période.</p>;

  return (
    <div className="overflow-hidden">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          {[5, 14, 14, 9, 9, 7, 8, 8, 14, 12].map((w, i) => (
            <col key={i} style={{ width: `${w}%` }} />
          ))}
        </colgroup>
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className={th}>Rang</th>
            <th className={th}>Stagiaire</th>
            <th className={th}>Moyenne</th>
            {COMPONENT_LABELS.map(([, label]) => (
              <th key={label} className={th}>
                {label}
              </th>
            ))}
            <th className={th}>Stage</th>
            <th className={th}>Mention</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.userId} className={row.userId === highlightId ? "bg-blue-50" : "hover:bg-gray-50"}>
              <td className="px-2 py-3">
                <Rank rank={row.rank} />
              </td>
              <td className="px-2 py-3 font-medium text-gray-900">{row.name}</td>
              <td className="px-2 py-3">
                <ScoreBar value={row.score} />
              </td>
              {COMPONENT_LABELS.map(([key]) => (
                <td key={key} className="px-2 py-3 text-gray-700">
                  {row.components?.[key] === null || row.components?.[key] === undefined ? "—" : `${row.components[key]}%`}
                </td>
              ))}
              <td className="px-2 py-3 text-gray-700">
                {row.counts ? `${row.counts.tasksDone}/${row.counts.tasks} tâche(s) terminée(s)` : "—"}
                {row.stage?.durationMonths ? (
                  <span className="block text-xs text-gray-500">Durée : {row.stage.durationMonths} mois</span>
                ) : null}
              </td>
              <td className="px-2 py-3">
                <BadgeTag badge={row.badge} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MeritPage() {
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<"ranking" | "history">("ranking");
  const [level, setLevel] = useState<Group>("L3");
  const [period, setPeriod] = useState(String(new Date().getFullYear()));
  const [merit, setMerit] = useState<MeritData | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [historyPeriod, setHistoryPeriod] = useState<string | undefined>(undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const isIntern = role.startsWith("STAGIAIRE_");
  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i)), []);

  useEffect(() => {
    const current = getStoredRole();
    setRole(current);
    if (current === "STAGIAIRE_M2") setLevel("M2");
  }, []);

  const loadRanking = useCallback(async () => {
    setLoading(true);

    try {
      setMerit(await fetchMerit(period));
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger l'ordre de mérite."));
    } finally {
      setLoading(false);
    }
  }, [period]);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchMeritHistory(historyPeriod));
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger l'historique."));
    }
  }, [historyPeriod]);

  useEffect(() => {
    if (role) void loadRanking();
  }, [role, loadRanking]);

  const reopen = async () => {
    if (!(await confirmDialog(`Rouvrir ${groupLabel} ${period} ? Sa clôture sera supprimée de l'historique et ses stagiaires reviendront dans le classement en cours.`))) return;

    try {
      await reopenMeritGroup(period, level);
      toast.success(`${groupLabel} ${period} rouvert.`);
      setHistory(null);
      await loadRanking();
    } catch (err) {
      toast.error(errorMessage(err, "Réouverture impossible."));
    }
  };

  // stagiaire : ouvre directement le groupe où il figure (L3, M2 ou Autre)
  useEffect(() => {
    if (!isIntern || !merit) return;
    const own = (["L3", "M2", "AUTRE"] as Group[]).find((group) => merit.cohorts[group]?.length > 0);
    if (own) setLevel(own);
  }, [isIntern, merit]);

  useEffect(() => {
    if (role && tab === "history") void loadHistory();
  }, [role, tab, loadHistory]);

  const groupLabel = level === "AUTRE" ? "Autre" : level;

  const close = async () => {
    if (!(await confirmDialog(`Clôturer ${groupLabel} ${period} et enregistrer son classement dans l'historique ? Les autres groupes ne sont pas touchés.`))) return;

    setClosing(true);

    try {
      await closeMeritPeriod(period, level);
      toast.success(`Classement ${groupLabel} ${period} enregistré dans l'historique.`);
      setHistory(null);
      setHistoryPeriod(period);
      await loadRanking(); // le classement en cours de ce groupe est maintenant vide
    } catch (err) {
      toast.error(errorMessage(err, "Clôture impossible."));
    } finally {
      setClosing(false);
    }
  };

  const rows = merit?.cohorts[level] ?? [];
  const mine = isIntern ? rows[0] : undefined;
  // Tableau d'honneur : réservé aux stagiaires ayant au moins 16/20 (sinon aucun)
  const honor = (merit?.honor[level] ?? []).filter((entry) => entry.score >= 16);
  const historyRows = history?.cohorts?.[level] ?? [];

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${active ? "bg-blue-700 text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Trophy className="h-6 w-6 text-amber-500" /> Ordre de mérite
            </h1>
            <p className="text-sm text-gray-500">
              {isIntern ? "Votre position parmi les stagiaires de votre promotion." : "Classement des stagiaires par promotion (moyenne sur 20)."}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <div className="flex gap-2 [&>button]:flex-1 [&>button]:justify-center">
              <button type="button" className={tabClass(tab === "ranking")} onClick={() => setTab("ranking")}>
                <Trophy className="h-4 w-4" /> Classement
              </button>
              <button type="button" className={tabClass(tab === "history")} onClick={() => setTab("history")}>
                <History className="h-4 w-4" /> Historique
              </button>
            </div>

            {tab === "ranking" && CLOSERS.includes(role) && (
              <button
                type="button"
                disabled={closing || merit?.groups?.[level]?.closed}
                onClick={close}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
              >
                <History className="h-4 w-4" />
                {merit?.groups?.[level]?.closed ? `${groupLabel} ${period} clôturé` : `Clôturer ${groupLabel} ${period}`}
              </button>
            )}
          </div>
        </div>

        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>}

        {/* ------------------------- CLASSEMENT ------------------------- */}
        {tab === "ranking" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500">
                {years.map((year) => (
                  <option key={year} value={year}>
                    Année {year}
                  </option>
                ))}
              </select>

              {!isIntern && (
                <div className="inline-flex overflow-hidden rounded-xl border border-gray-300 bg-white">
                  {(["L3", "M2", "AUTRE"] as Array<Level | "AUTRE">).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLevel(value)}
                      className={`px-5 py-3 text-sm font-medium ${level === value ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      {value === "AUTRE" ? "Autre" : value}
                    </button>
                  ))}
                </div>
              )}

            </div>

            {merit?.groups?.[level]?.closedAt && !merit.groups[level].closed && (
              <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
                {groupLabel} {merit.period} clôturé le {new Date(merit.groups[level].closedAt as string).toLocaleDateString("fr-FR")} : seuls les stagiaires ayant un nouvel avancement depuis cette date sont classés. Le reste est dans l&apos;historique.
                {CLOSERS.includes(role) && (
                  <button type="button" onClick={reopen} className="ml-3 rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500/20">
                    Rouvrir
                  </button>
                )}
              </div>
            )}

            {merit?.groups?.[level]?.closed && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
                <span>
                  {groupLabel} {merit.period} est clôturé : tous les stagiaires de ce groupe sont dans l&apos;historique. Aucun classement en cours.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryPeriod(merit.period);
                    setTab("history");
                  }}
                  className="rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500/20"
                >
                  Voir l&apos;historique
                </button>
                {CLOSERS.includes(role) && (
                  <button type="button" onClick={reopen} className="rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500/20">
                    Rouvrir
                  </button>
                )}
              </div>
            )}

            {loading && <p className="text-sm text-gray-500">Chargement...</p>}

            {merit && isIntern && (
              <div className={card}>
                {mine ? (
                  <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                      <p className="text-sm text-gray-500">
                        Votre position — {groupLabel}, {merit.period}
                      </p>
                      <p className="mt-1 text-4xl font-bold text-gray-900">
                        {mine.rank}
                        <span className="text-xl font-medium text-gray-500"> / {mine.cohortSize}</span>
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                        Moyenne {fmt20(mine.score)}/20 <BadgeTag badge={mine.badge} />
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      {COMPONENT_LABELS.map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between gap-4">
                          <span className="text-gray-500">
                            {label} <span className="text-xs">({merit.weights[key]}%)</span>
                          </span>
                          <span className="font-semibold text-gray-900">{mine.components?.[key] === null || mine.components?.[key] === undefined ? "—" : `${mine.components[key]}%`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Vous n&apos;êtes pas encore classé en {merit.period} : votre classement apparaît dès que votre stage a des tâches suivies ou une évaluation du tuteur.
                  </p>
                )}
              </div>
            )}

            {merit && honor.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                {honor.map((entry) => (
                  <div key={entry.rank} className={`${card} text-center`}>
                    <Medal className={`mx-auto h-8 w-8 ${MEDAL[entry.rank - 1] ?? "text-gray-400"}`} />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Tableau d&apos;honneur — {entry.rank}{entry.rank === 1 ? "er" : "e"}</p>
                    <p className="mt-1 font-semibold text-gray-900">{entry.name}</p>
                    <p className="text-sm text-gray-600">{fmt20(entry.score)}/20</p>
                  </div>
                ))}
              </div>
            )}

            {merit && !isIntern && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <RankingTable rows={rows} />
              </div>
            )}

            {merit && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
                <p className="font-medium text-gray-900">Comment le score est calculé</p>
                <p className="mt-1">
                  Moyenne sur 20 calculée automatiquement à partir du stage : avancement des tâches {merit.weights.progress}% · achèvement (tâches terminées) {merit.weights.completion}% · évaluation du tuteur{" "}
                  {merit.weights.evaluation}% · rapports rendus {merit.weights.reports}% · présence pointée {merit.weights.presence}% (ignorée tant qu&apos;aucun pointage GPS n&apos;existe). Une donnée absente est ignorée (poids réajustés). Classement séparé L3 / M2 / Autre (chaque groupe se clôture séparément), égalité de moyenne = même rang.
                  {merit.averages?.[level] !== undefined && merit.averages?.[level] !== null ? ` Moyenne du groupe ${groupLabel} : ${fmt20(merit.averages[level] as number)}/20.` : ""}
                  {merit.unranked !== undefined ? ` ${merit.unranked} stagiaire(s) sans participation ne sont pas classés.` : ""}
                </p>
              </div>
            )}
          </>
        )}

        {/* ------------------------- HISTORIQUE ------------------------- */}
        {tab === "history" && history && (
          <>
            {history.scope === "self" ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {history.mine.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-gray-500">Aucune période clôturée pour le moment.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className={th}>Période</th>
                        <th className={th}>Promotion</th>
                        <th className={th}>Rang</th>
                        <th className={th}>Score</th>
                        <th className={th}>Mention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.mine.map((row) => (
                        <tr key={row.period}>
                          <td className="px-2 py-3 font-medium text-gray-900">{row.period}</td>
                          <td className="px-2 py-3 text-gray-700">{row.level}</td>
                          <td className="px-2 py-3 text-gray-700">
                            {row.rank} / {row.cohortSize}
                          </td>
                          <td className="px-2 py-3">
                            <ScoreBar value={row.score} />
                          </td>
                          <td className="px-2 py-3">
                            <BadgeTag badge={row.badge} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={history.selected ?? ""}
                    onChange={(e) => setHistoryPeriod(e.target.value || undefined)}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    {history.periods.length === 0 && <option value="">Aucune période clôturée</option>}
                    {history.periods.map((entry) => (
                      <option key={entry.period} value={entry.period}>
                        {entry.period} — {entry.count} stagiaire(s), clôturée le {fmtDateTime(entry.closedAt)}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex overflow-hidden rounded-xl border border-gray-300 bg-white">
                    {(["L3", "M2", "AUTRE"] as Array<Level | "AUTRE">).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLevel(value)}
                        className={`px-5 py-3 text-sm font-medium ${level === value ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                      >
                        {value === "AUTRE" ? "Autre" : value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <RankingTable rows={historyRows} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
