"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  FolderKanban,
  Info,
  LayoutDashboard,
  Trash2,
  User,
} from "lucide-react";

import {
  Notification,
  deleteNotification,
  formatNotificationDate,
  getNotificationById,
  getNotificationPriorityClass,
  getNotificationTypeClass,
  markNotificationAsRead,
  markNotificationAsUnread,
} from "@/lib/notifications";

function getTypeIcon(type: Notification["type"]) {
  switch (type) {
    case "Succès":
      return CheckCircle2;

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

function getIconContainerClass(
  type: Notification["type"]
) {
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

export default function NotificationDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [notification, setNotification] =
    useState<Notification | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Chargement de la notification.
   *
   * IMPORTANT :
   * dès qu'on ouvre une notification non lue,
   * elle devient automatiquement lue.
   */
  useEffect(() => {
    const found = getNotificationById(id);

    if (!found) {
      setNotification(null);
      setIsLoaded(true);
      return;
    }

    if (!found.isRead) {
      const updated = markNotificationAsRead(id);

      setNotification(updated ?? null);
    } else {
      setNotification(found);
    }

    setIsLoaded(true);
  }, [id]);

  /**
   * Toggle lu / non lu.
   */
  function handleToggleRead() {
    if (!notification) {
      return;
    }

    if (notification.isRead) {
      const updated = markNotificationAsUnread(
        notification.id
      );

      setNotification(updated ?? null);
    } else {
      const updated = markNotificationAsRead(
        notification.id
      );

      setNotification(updated ?? null);
    }
  }

  /**
   * Suppression.
   */
  function handleDelete() {
    if (!notification) {
      return;
    }

    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette notification ?"
    );

    if (!confirmed) {
      return;
    }

    deleteNotification(notification.id);

    router.push("/notifications");
    router.refresh();
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <Bell className="mx-auto h-10 w-10 animate-pulse text-blue-600" />

            <p className="mt-4 font-medium text-gray-700">
              Chargement de la notification...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /**
   * Notification introuvable.
   */
  if (!notification) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <Bell className="mx-auto h-14 w-14 text-gray-300" />

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Notification introuvable
            </h1>

            <p className="mt-2 text-gray-500">
              Cette notification n'existe plus ou a été
              supprimée.
            </p>

            <Link
              href="/notifications"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux notifications
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const Icon = getTypeIcon(notification.type);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 hover:text-blue-600"
          >
            <LayoutDashboard className="h-4 w-4" />
            Tableau de bord
          </Link>

          <ChevronRight className="h-4 w-4" />

          <Link
            href="/notifications"
            className="hover:text-blue-600"
          >
            Notifications
          </Link>

          <ChevronRight className="h-4 w-4" />

          <span className="font-medium text-gray-900">
            {notification.id}
          </span>
        </div>

        {/* Retour */}
        <Link
          href="/notifications"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux notifications
        </Link>

        {/* Notification */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-100 p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${getIconContainerClass(
                    notification.type
                  )}`}
                >
                  <Icon className="h-7 w-7" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getNotificationTypeClass(
                        notification.type
                      )}`}
                    >
                      {notification.type}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getNotificationPriorityClass(
                        notification.priority
                      )}`}
                    >
                      Priorité :{" "}
                      {notification.priority}
                    </span>

                    {notification.isRead ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        <Check className="h-3.5 w-3.5" />
                        Lu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        <Clock className="h-3.5 w-3.5" />
                        Non lu
                      </span>
                    )}
                  </div>

                  <h1 className="mt-4 text-2xl font-bold text-gray-900 md:text-3xl">
                    {notification.title}
                  </h1>

                  <p className="mt-2 text-sm text-gray-500">
                    Référence : {notification.id}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleToggleRead}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {notification.isRead ? (
                    <>
                      <Clock className="h-4 w-4" />
                      Marquer non lu
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Marquer lu
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-6 p-6 md:p-8">
            {/* Message */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Message
              </h2>

              <div className="mt-3 rounded-xl bg-gray-50 p-5">
                <p className="text-base leading-7 text-gray-700">
                  {notification.message}
                </p>
              </div>
            </div>

            {/* Informations */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Informations
              </h2>

              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />

                    <div>
                      <p className="text-xs text-gray-500">
                        Destinataire
                      </p>

                      <p className="mt-1 font-medium text-gray-900">
                        {notification.recipient}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-gray-400" />

                    <div>
                      <p className="text-xs text-gray-500">
                        Date de création
                      </p>

                      <p className="mt-1 font-medium text-gray-900">
                        {formatNotificationDate(
                          notification.createdAt
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {notification.projectName && (
                  <div className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                      <FolderKanban className="h-5 w-5 text-gray-400" />

                      <div>
                        <p className="text-xs text-gray-500">
                          Projet concerné
                        </p>

                        <p className="mt-1 font-medium text-gray-900">
                          {notification.projectName}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-gray-400" />

                    <div>
                      <p className="text-xs text-gray-500">
                        Statut
                      </p>

                      <p
                        className={`mt-1 font-medium ${
                          notification.isRead
                            ? "text-green-600"
                            : "text-blue-600"
                        }`}
                      >
                        {notification.isRead
                          ? "Notification lue"
                          : "Notification non lue"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            {notification.actionUrl && (
              <div className="border-t border-gray-100 pt-6">
                <Link
                  href={notification.actionUrl}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Ouvrir le module concerné
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}