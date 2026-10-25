"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Eye, List, Pencil, Plus, Search, Send, Trash2, Trophy } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { StatusBadge } from "@/components/crud/StatusBadge";
import { getStoredRole } from "@/lib/access";
import {
  Item,
  canSeeBudget,
  errorMessage,
  exportCsv,
  fmtDate,
  fmtMoney,
  removeItem,
  statusOptions,
} from "@/lib/crud";
import api from "@/lib/axios";
import { activitiesConfig } from "@/lib/resources";
import {
  MyMerit,
  MyParticipation,
  PARTICIPATION_COLORS,
  PARTICIPATION_LABELS,
  currentUserId,
  fetchMine,
  fetchMyMerit,
  joinActivity,
} from "@/lib/activitySpace";
import { confirmDialog, toast } from "@/lib/toast";

const PAGE_SIZE = 10;
const DAY = 24 * 3600 * 1000;
const ACTIVITY_STATUS = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const startOfDay = (value: Date | string) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/** Badge d'échéance : « Aujourd'hui », « Demain », « Dans 3 j », « Dépassée »… */
function dueBadge(activity: Item): { text: string; className: string } | null {
  if (activity.status === "CANCELLED" || activity.status === "COMPLETED") return null;

  const today = startOfDay(new Date());
  const start = activity.startDate ? startOfDay(activity.startDate) : null;
  const end = activity.endDate ? startOfDay(activity.endDate) : null;

  if (end !== null && end < today) return { text: "Dépassée", className: "bg-red-100 text-red-700" };
  if (start !== null && start > today) {
    const days = Math.round((start - today) / DAY);
    if (days === 1) return { text: "Demain", className: "bg-amber-100 text-amber-800" };
    if (days <= 7) return { text: `Dans ${days} j`, className: "bg-blue-100 text-blue-700" };
    return null;
  }
  if (start !== null && start <= today && (end === null || end >= today)) {
    return { text: start === today ? "Aujourd'hui" : "En cours", className: "bg-green-100 text-green-700" };
  }

  return null;
}

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const CHIP: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-200 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700 line-through",
};

function Calendar({ items }: { items: Item[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // semaine commençant le lundi
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const todayKey = startOfDay(new Date());

  const dated = items.filter((item) => item.startDate || item.endDate);

  const forDay = (day: number) => {
    const time = new Date(year, month, day).getTime();

    return dated.filter((item) => {
      const start = startOfDay(item.startDate ?? item.endDate);
      const end = startOfDay(item.endDate ?? item.startDate);
      return time >= start && time <= end;
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Mois précédent">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-semibold text-gray-900">
          {MONTHS[month]} {year}
        </p>
        <button type="button" className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Mois suivant">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-gray-500">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: cells }, (_, index) => {
          const day = index - offset + 1;
          const valid = day >= 1 && day <= days;
          const list = valid ? forDay(day) : [];
          const isToday = valid && new Date(year, month, day).getTime() === todayKey;

          return (
            <div
              key={index}
              className={`min-h-[84px] rounded-lg border p-1 text-xs ${valid ? "border-gray-200" : "border-transparent"} ${isToday ? "ring-2 ring-blue-400" : ""}`}
            >
              {valid && <p className="mb-1 text-right font-medium text-gray-500">{day}</p>}
              <div className="space-y-1">
                {list.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`/activities/${item.id}`}
                    title={item.title}
                    className={`block truncate rounded px-1.5 py-0.5 ${CHIP[item.status] ?? CHIP.PLANNED}`}
                  >
                    {item.title}
                  </Link>
                ))}
                {list.length > 3 && <p className="px-1 text-gray-500">+{list.length - 3} autre(s)</p>}
              </div>
            </div>
          );
        })}
      </div>

      {items.length > dated.length && (
        <p className="mt-3 text-xs text-gray-500">{items.length - dated.length} activité(s) sans date ne sont pas affichées dans le calendrier.</p>
      )}
    </div>
  );
}

export function ActivitiesBoard() {
  const config = activitiesConfig;

  const [items, setItems] = useState<Item[]>([]);
  const [mine, setMine] = useState<Map<number, MyParticipation>>(new Map());
  const [accepted, setAccepted] = useState<Map<number, number>>(new Map());
  const [merit, setMerit] = useState<MyMerit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [view, setView] = useState<"table" | "calendar">("table");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);

  const isIntern = role.startsWith("STAGIAIRE_");

  const loadParticipation = useCallback(async (currentRole: string) => {
    if (!currentRole.startsWith("STAGIAIRE_")) return;

    try {
      const data = await fetchMine();
      setMine(new Map(data.mine.map((row) => [row.activityId, row])));
      setAccepted(new Map(data.accepted.map((row) => [row.activityId, row.count])));
      setMerit(await fetchMyMerit());
    } catch {
      /* tables non créées ou service indisponible : la liste reste utilisable */
    }
  }, []);

  useEffect(() => {
    const current = getStoredRole();
    setRole(current);
    setUserId(currentUserId());

    api
      .get(config.endpoint)
      .then((res) => setItems(res.data?.[config.listKey] ?? []))
      .catch((err) => setError(errorMessage(err, "Impossible de charger les données.")))
      .finally(() => setLoading(false));

    void loadParticipation(current);
  }, [config, loadParticipation]);

  const showBudget = canSeeBudget(role);
  const canCreate = config.createRoles.includes(role);
  const canEdit = config.editRoles.includes(role);
  const canDelete = config.deleteRoles.includes(role);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      if (query && !config.searchOf(item).toLowerCase().includes(query)) return false;
      if (status && item.status !== status) return false;

      if (onlyMine) {
        if (isIntern) {
          const participation = mine.get(item.id);
          return participation && participation.status !== "REJECTED";
        }
        return userId !== null && item.createdById === userId;
      }

      return true;
    });
  }, [items, search, status, onlyMine, isIntern, mine, userId, config]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const handleDelete = async (item: Item) => {
    if (!(await confirmDialog(`Supprimer « ${config.titleOf(item)} » ?`))) return;

    try {
      await removeItem(config, item.id);
      toast.success("Suppression effectuée.");
      setItems((rows) => rows.filter((row) => row.id !== item.id));
    } catch (err) {
      toast.error(errorMessage(err, "Suppression impossible."));
    }
  };

  const participate = async (item: Item) => {
    setBusyId(item.id);

    try {
      await joinActivity(item.id, "");
      toast.success("Demande envoyée à votre tuteur.");
      await loadParticipation(role);
    } catch (err) {
      toast.error(errorMessage(err, "Demande impossible."));
    } finally {
      setBusyId(null);
    }
  };

  const exportFields = config.fields.filter((field) => showBudget || !/budget/i.test(field.name));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
            <p className="text-sm text-gray-500">{items.length} élément(s)</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex overflow-hidden rounded-xl border border-gray-300 bg-white">
              <button
                type="button"
                onClick={() => setView("table")}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium ${view === "table" ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <List className="h-4 w-4" /> Tableau
              </button>
              <button
                type="button"
                onClick={() => setView("calendar")}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium ${view === "calendar" ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <CalendarDays className="h-4 w-4" /> Calendrier
              </button>
            </div>

            <button
              type="button"
              onClick={() => exportCsv("activities.csv", exportFields, filtered)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </button>

            {canCreate && (
              <Link
                href="/activities/create"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-800"
              >
                <Plus className="h-5 w-5" />
                Ajouter
              </Link>
            )}
          </div>
        </div>

        {isIntern && merit && (
          <Link
            href="/merit"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 transition hover:bg-amber-100"
          >
            <span className="inline-flex items-center gap-3">
              <Trophy className="h-5 w-5" />
              {merit.rank !== null ? (
                <span>
                  Ordre de mérite {merit.period} ({merit.level}) : vous êtes <strong>{merit.rank}
                  {merit.rank === 1 ? "er" : "e"}</strong> sur {merit.cohortSize} — score {merit.score}/100 ({merit.badge})
                </span>
              ) : (
                <span>Participez à une activité pour entrer dans l&apos;ordre de mérite {merit.period}.</span>
              )}
            </span>
            <span className="font-medium underline">Voir le classement</span>
          </Link>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher..."
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="">Tous les statuts</option>
            {statusOptions(ACTIVITY_STATUS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {(isIntern || canCreate) && (
            <button
              type="button"
              onClick={() => {
                setOnlyMine(!onlyMine);
                setPage(1);
              }}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                onlyMine ? "border-blue-700 bg-blue-700 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {isIntern ? "Mes activités" : "Créées par moi"}
            </button>
          )}
        </div>

        {loading && <p className="text-sm text-gray-500">Chargement...</p>}

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!loading && !error && view === "calendar" && <Calendar items={filtered} />}

        {!loading && !error && view === "table" && (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Activité</th>
                  <th className="px-4 py-3 font-semibold">Projet</th>
                  <th className="px-4 py-3 font-semibold">Lieu</th>
                  <th className="px-4 py-3 font-semibold">Période</th>
                  {showBudget && <th className="px-4 py-3 font-semibold">Budget</th>}
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">{isIntern ? "Ma participation" : "Participants"}</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={showBudget ? 8 : 7} className="px-4 py-10 text-center text-gray-500">
                      Aucun élément trouvé.
                    </td>
                  </tr>
                )}

                {visible.map((item) => {
                  const badge = dueBadge(item);
                  const participation = mine.get(item.id);
                  const closed = item.status === "CANCELLED" || item.status === "COMPLETED";

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">
                        <span className="font-medium text-gray-900">{item.title}</span>
                        {badge && <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.text}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.project?.name ?? `#${item.projectId}`}</td>
                      <td className="px-4 py-3 text-gray-700">{item.location || "—"}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {fmtDate(item.startDate)} → {fmtDate(item.endDate)}
                      </td>
                      {showBudget && <td className="px-4 py-3 text-gray-700">{fmtMoney(item.budget)}</td>}
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {isIntern ? (
                          participation ? (
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${PARTICIPATION_COLORS[participation.status]}`}>
                              {PARTICIPATION_LABELS[participation.status]}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={closed || busyId === item.id}
                              onClick={() => participate(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-40"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Participer
                            </button>
                          )
                        ) : (
                          `${accepted.get(item.id) ?? "—"}`
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link href={`/activities/${item.id}`} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Voir">
                            <Eye className="h-4 w-4" />
                          </Link>
                          {canEdit && (
                            <Link href={`/activities/${item.id}/edit`} className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="Modifier">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}
                          {canDelete && (
                            <button type="button" onClick={() => handleDelete(item)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Supprimer">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {view === "table" && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {current} / {totalPages} — {filtered.length} résultat(s)
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40">
                Précédent
              </button>
              <button type="button" disabled={current === totalPages} onClick={() => setPage(current + 1)} className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40">
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
