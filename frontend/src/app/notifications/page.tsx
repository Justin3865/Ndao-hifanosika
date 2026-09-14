"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  FileText,
  Info,
  LayoutDashboard,
  Search,
  Trash2,
  X,
  CircleCheck,
  FolderKanban,
  Award,
  ClipboardCheck,
} from "lucide-react";

import {
  Notification,
  NotificationPriority,
  NotificationType,
  deleteNotification,
  formatNotificationRelativeDate,
  getNotificationPriorityClass,
  getNotificationTypeClass,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
} from "@/lib/notifications";

type ReadFilter = "Toutes" | "Non lues" | "Lues";

const typeOptions: Array<NotificationType | "Tous"> = [
  "Tous",
  "Info",
  "Succès",
  "Alerte",
  "Évaluation",
  "Projet",
  "Rapport",
  "Jalon",
];

const priorityOptions: Array<NotificationPriority | "Toutes"> = [
  "Toutes",
  "Faible",
  "Normale",
  "Haute",
  "Urgente",
];

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case "Succès":
      return CircleCheck;

    case "Alerte":
      return AlertTriangle;

    case "Évaluation":
      return ClipboardCheck;

    case "Projet":
      return FolderKanban;

    case "Rapport":
      return FileText;

    case "Jalon":
      return Award;

    case "Info":
    default:
      return Info;
  }
}

function getTypeIconBackground(type: NotificationType) {
  switch (type) {
    case "Succès":
      return "bg-green-100 text-green-700";

    case "Alerte":
      return "bg-orange-100 text-orange-700";

    case "Évaluation":
      return "bg-purple-100 text-purple-700";

    case "Projet":
      return "bg-blue-100 text-blue-700";

    case "Rapport":
      return "bg-indigo-100 text-indigo-700";

    case "Jalon":
      return "bg-yellow-100 text-yellow-700";

    case "Info":
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);

  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] =
    useState<ReadFilter>("Toutes");

  const [typeFilter, setTypeFilter] = useState<
    NotificationType | "Tous"
  >("Tous");

  const [priorityFilter, setPriorityFilter] = useState<
    NotificationPriority | "Toutes"
  >("Toutes");

  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Chargement initial depuis localStorage.
   */
  useEffect(() => {
    const data = getNotifications();

    setNotifications(data);
    setIsLoaded(true);
  }, []);

  /**
   * Statistiques.
   */
  const total = notifications.length;

  const unread = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  const read = notifications.filter(
    (notification) => notification.isRead
  ).length;

  const urgent = notifications.filter(
    (notification) =>
      notification.priority === "Urgente" &&
      !notification.isRead
  ).length;

  /**
   * Recherche et filtres.
   */
  const filteredNotifications = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return [...notifications]
      .filter((notification) => {
        if (readFilter === "Non lues") {
          return !notification.isRead;
        }

        if (readFilter === "Lues") {
          return notification.isRead;
        }

        return true;
      })
      .filter((notification) => {
        if (typeFilter === "Tous") {
          return true;
        }

        return notification.type === typeFilter;
      })
      .filter((notification) => {
        if (priorityFilter === "Toutes") {
          return true;
        }

        return notification.priority === priorityFilter;
      })
      .filter((notification) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          notification.title
            .toLowerCase()
            .includes(normalizedSearch) ||
          notification.message
            .toLowerCase()
            .includes(normalizedSearch) ||
          notification.type
            .toLowerCase()
            .includes(normalizedSearch) ||
          notification.recipient
            .toLowerCase()
            .includes(normalizedSearch) ||
          notification.projectName
            ?.toLowerCase()
            .includes(normalizedSearch)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [
    notifications,
    search,
    readFilter,
    typeFilter,
    priorityFilter,
  ]);

  /**
   * Marquer comme lu.
   */
  function handleMarkAsRead(id: string) {
    markNotificationAsRead(id);

    setNotifications(getNotifications());
  }

  /**
   * Marquer comme non lu.
   */
  function handleMarkAsUnread(id: string) {
    markNotificationAsUnread(id);

    setNotifications(getNotifications());
  }

  /**
   * Marquer toutes comme lues.
   */
  function handleMarkAllAsRead() {
    markAllNotificationsAsRead();

    setNotifications(getNotifications());
  }

  /**
   * Supprimer.
   */
  function handleDelete(id: string) {
    const notification = notifications.find(
      (item) => item.id === id
    );

    if (!notification) {
      return;
    }

    const confirmed = window.confirm(
      `Voulez-vous supprimer la notification "${notification.title}" ?`
    );

    if (!confirmed) {
      return;
    }

    deleteNotification(id);

    setNotifications(getNotifications());
  }

  /**
   * Réinitialiser les filtres.
   */
  function resetFilters() {
    setSearch("");
    setReadFilter("Toutes");
    setTypeFilter("Tous");
    setPriorityFilter("Toutes");
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <Bell className="mx-auto mb-4 h-10 w-10 animate-pulse text-blue-600" />

            <h1 className="text-xl font-semibold text-gray-900">
              Chargement des notifications...
            </h1>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 hover:text-blue-600"
          >
            <LayoutDashboard className="h-4 w-4" />
            Tableau de bord
          </Link>

          <ChevronRight className="h-4 w-4" />

          <span className="font-medium text-gray-900">
            Notifications
          </span>
        </div>

        {/* Header */}
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <Bell className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                  Notifications
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Consultez et gérez les notifications de la
                  plateforme Ndao Hifanosika.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={unread === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </button>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setReadFilter("Toutes")}
            className="rounded-xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Total
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {total}
                </p>
              </div>

              <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                <Bell className="h-6 w-6" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setReadFilter("Non lues")}
            className="rounded-xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Non lues
                </p>

                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {unread}
                </p>
              </div>

              <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setReadFilter("Lues")}
            className="rounded-xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Lues
                </p>

                <p className="mt-2 text-3xl font-bold text-green-600">
                  {read}
                </p>
              </div>

              <div className="rounded-xl bg-green-100 p-3 text-green-600">
                <Check className="h-6 w-6" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setPriorityFilter("Urgente")
            }
            className="rounded-xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Urgentes non lues
                </p>

                <p className="mt-2 text-3xl font-bold text-red-600">
                  {urgent}
                </p>
              </div>

              <div className="rounded-xl bg-red-100 p-3 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </button>
        </section>

        {/* Filters */}
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Rechercher..."
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Statut */}
            <select
              value={readFilter}
              onChange={(event) =>
                setReadFilter(
                  event.target.value as ReadFilter
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="Toutes">
                Toutes les notifications
              </option>

              <option value="Non lues">
                Non lues
              </option>

              <option value="Lues">
                Lues
              </option>
            </select>

            {/* Type */}
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value as
                    | NotificationType
                    | "Tous"
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type === "Tous"
                    ? "Tous les types"
                    : type}
                </option>
              ))}
            </select>

            {/* Priorité */}
            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value as
                    | NotificationPriority
                    | "Toutes"
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              {priorityOptions.map((priority) => (
                <option
                  key={priority}
                  value={priority}
                >
                  {priority === "Toutes"
                    ? "Toutes les priorités"
                    : priority}
                </option>
              ))}
            </select>
          </div>

          {(search ||
            readFilter !== "Toutes" ||
            typeFilter !== "Tous" ||
            priorityFilter !== "Toutes") && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                {filteredNotifications.length} notification
                {filteredNotifications.length > 1
                  ? "s"
                  : ""}{" "}
                trouvée
                {filteredNotifications.length > 1
                  ? "s"
                  : ""}
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
                Réinitialiser
              </button>
            </div>
          )}
        </section>

        {/* Liste */}
        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Liste des notifications
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredNotifications.length} résultat
              {filteredNotifications.length > 1
                ? "s"
                : ""}
            </p>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-300" />

              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Aucune notification
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Aucune notification ne correspond aux
                filtres sélectionnés.
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map(
                (notification) => {
                  const Icon = getTypeIcon(
                    notification.type
                  );

                  return (
                    <div
                      key={notification.id}
                      className={`group p-5 transition hover:bg-gray-50 ${
                        !notification.isRead
                          ? "bg-blue-50/40"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${getTypeIconBackground(
                            notification.type
                          )}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Contenu */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col justify-between gap-2 md:flex-row">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {!notification.isRead && (
                                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                                )}

                                <h3
                                  className={`text-base ${
                                    notification.isRead
                                      ? "font-medium text-gray-700"
                                      : "font-bold text-gray-900"
                                  }`}
                                >
                                  {notification.title}
                                </h3>

                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${getNotificationTypeClass(
                                    notification.type
                                  )}`}
                                >
                                  {notification.type}
                                </span>

                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${getNotificationPriorityClass(
                                    notification.priority
                                  )}`}
                                >
                                  {notification.priority}
                                </span>
                              </div>

                              <p className="mt-2 text-sm leading-6 text-gray-600">
                                {notification.message}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                                <span>
                                  {formatNotificationRelativeDate(
                                    notification.createdAt
                                  )}
                                </span>

                                <span>
                                  Destinataire :{" "}
                                  {notification.recipient}
                                </span>

                                {notification.projectName && (
                                  <span>
                                    Projet :{" "}
                                    {
                                      notification.projectName
                                    }
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex shrink-0 items-center gap-2">
                              <Link
                                href={`/notifications/${notification.id}`}
                                onClick={() => {
                                  if (
                                    !notification.isRead
                                  ) {
                                    handleMarkAsRead(
                                      notification.id
                                    );
                                  }
                                }}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                              >
                                Voir
                              </Link>

                              <button
                                type="button"
                                title={
                                  notification.isRead
                                    ? "Marquer comme non lu"
                                    : "Marquer comme lu"
                                }
                                onClick={() => {
                                  if (
                                    notification.isRead
                                  ) {
                                    handleMarkAsUnread(
                                      notification.id
                                    );
                                  } else {
                                    handleMarkAsRead(
                                      notification.id
                                    );
                                  }
                                }}
                                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100"
                              >
                                {notification.isRead ? (
                                  <Clock className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                title="Supprimer"
                                onClick={() =>
                                  handleDelete(
                                    notification.id
                                  )
                                }
                                className="rounded-lg border border-gray-200 bg-white p-2 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}