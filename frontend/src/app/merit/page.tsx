"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Medal, Trophy } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { getStoredRole } from "@/lib/access";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import {
  HistoryData,
  Level,
  MeritData,
  MeritRow,
  closeMeritPeriod,
  fetchMerit,
  fetchMeritHistory,
} from "@/lib/activitySpace";
import { confirmDialog, toast } from "@/lib/toast";

const CLOSERS = ["ADMIN", "DIRECTION", "COORDINATOR", "RH"];
const BADGE: Record<string, string> = {
  Excellent: "bg-green-100 text-green-700",
  "Très bien": "bg-blue-100 text-blue-700",
  Bien: "bg-amber-100 text-amber-800",
  "À améliorer": "bg-red-100 text-red-700",
};
const MEDAL = ["text-amber-500", "text-slate-400", "text-orange-600"];
const COMPONENT_LABELS: Array<[keyof NonNullable<MeritRow["components"]>, string]> = [
  ["quality", "Qualité"],
  ["engagement", "Rapports"],
  ["presence", "Présence"],
  ["volume", "Volume"],
];

const th = "px-4 py-3 font-semibold";
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
      <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function BadgeTag({ badge }: { badge: string | null }) {
  return badge ? (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${BADGE[badge] ?? "bg-gray-100 text-gray-700"}`}>{badge}</span>
  ) : null;
}

function RankingTable({ rows, highlightId }: { rows: MeritRow[]; highlightId?: number | null }) {
  if (rows.length === 0) return <p className="px-4 py-8 text-center text-sm text-gray-500">Aucun stagiaire classé pour cette période.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className={th}>Rang</th>
            <th className={th}>Stagiaire</th>
            <th className={th}>Score</th>
            {COMPONENT_LABELS.map(([, label]) => (
              <th key={label} className={th}>
                {label}
              </th>
            ))}
            <th className={th}>Participations</th>
            <th className={th}>Mention</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.userId} className={row.userId === highlightId ? "bg-blue-50" : "hover:bg-gray-50"}>
              <td className="px-4 py-3">
                <Rank rank={row.rank} />
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
              <td className="px-4 py-3">
                <ScoreBar value={row.score} />
              </td>
              {COMPONENT_LABELS.map(([key]) => (
                <td key={key} className="px-4 py-3 text-gray-700">
                  {row.components?.[key] === null || row.components?.[key] === undefined ? "—" : `${row.components[key]}%`}
                </td>
              ))}
              <td className="px-4 py-3 text-gray-700">
                {row.counts ? `${row.counts.participations} (${row.counts.rated} notée(s))` : "—"}
              </td>
              <td className="px-4 py-3">
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
  const [level, setLevel] = useState<Level>("L3");
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

  useEffect(() => {
    if (role && tab === "history") void loadHistory();
  }, [role, tab, loadHistory]);

  const close = async () => {
    if (!(await confirmDialog(`Clôturer la période ${period} et enregistrer le classement dans l'historique ?`))) return;

    setClosing(true);

    try {
      await closeMeritPeriod(period);
      toast.success(`Classement ${period} enregistré dans l'historique.`);
      setHistory(null);
    } catch (err) {
      toast.error(errorMessage(err, "Clôture impossible."));
    } finally {
      setClosing(false);
    }
  };

  const rows = merit?.cohorts[level] ?? [];
  const mine = isIntern ? rows[0] : undefined;
  const honor = merit?.honor[level] ?? [];

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
              {isIntern ? "Votre position parmi les stagiaires de votre promotion." : "Classement des stagiaires selon leur participation aux activités."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={tabClass(tab === "ranking")} onClick={() => setTab("ranking")}>
              <Trophy className="h-4 w-4" /> Classement
            </button>
            <button type="button" className={tabClass(tab === "history")} onClick={() => setTab("history")}>
              <History className="h-4 w-4" /> Historique
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

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
                  {(["L3", "M2"] as Level[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLevel(value)}
                      className={`px-5 py-3 text-sm font-medium ${level === value ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}

              {CLOSERS.includes(role) && (
                <button
                  type="button"
                  disabled={closing}
                  onClick={close}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl border border-blue-600 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
                >
                  <History className="h-4 w-4" />
                  Clôturer la période {period}
                </button>
              )}
            </div>

            {loading && <p className="text-sm text-gray-500">Chargement...</p>}

            {merit && isIntern && (
              <div className={card}>
                {mine ? (
                  <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                      <p className="text-sm text-gray-500">
                        Votre position — promotion {level}, {merit.period}
                      </p>
                      <p className="mt-1 text-4xl font-bold text-gray-900">
                        {mine.rank}
                        <span className="text-xl font-medium text-gray-500"> / {mine.cohortSize}</span>
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                        Score {mine.score}/100 <BadgeTag badge={mine.badge} />
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      {COMPONENT_LABELS.map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between gap-4">
                          <span className="text-gray-500">
                            {label} <span className="text-xs">({merit.weights[key]}%)</span>
                          </span>
                          <span className="font-semibold text-gray-900">{mine.components?.[key] === null ? "—" : `${mine.components?.[key]}%`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Vous n&apos;êtes pas encore classé en {merit.period} : demandez à participer à une activité depuis la page « Activités ».
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
                    <p className="text-sm text-gray-600">{entry.score}/100</p>
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
                  Qualité {merit.weights.quality}% (moyenne des notes du tuteur) · Rapports rendus {merit.weights.engagement}% · Présence pointée {merit.weights.presence}% · Volume{" "}
                  {merit.weights.volume}% (objectif : {merit.target} activités). Seules les participations acceptées comptent ; classement séparé L3 / M2, égalité de score = même rang.
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
                          <td className="px-4 py-3 font-medium text-gray-900">{row.period}</td>
                          <td className="px-4 py-3 text-gray-700">{row.level}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.rank} / {row.cohortSize}
                          </td>
                          <td className="px-4 py-3">
                            <ScoreBar value={row.score} />
                          </td>
                          <td className="px-4 py-3">
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
                    {(["L3", "M2"] as Level[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLevel(value)}
                        className={`px-5 py-3 text-sm font-medium ${level === value ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <RankingTable rows={history.cohorts?.[level] ?? []} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
