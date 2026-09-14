"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  LogOut,
  Menu,
  ShieldCheck,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface HeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

type NotificationType =
  | "Information"
  | "Alerte"
  | "Rappel"
  | "Évaluation"
  | "Projet"
  | "Jalon"
  | "Activité"
  | "Système";

type NotificationPriority =
  | "Normale"
  | "Importante"
  | "Urgente";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;

  sender: {
    id: string;
    name: string;
    role: string;
  };

  recipient: {
    id: string;
    name: string;
    role: string;
  };

  source: string;

  reference?: {
    type: string;
    id: string;
    label: string;
    href?: string;
  };

  sentAt: string;
  receivedAt: string;
  readAt?: string;
  read: boolean;

  action?: {
    label: string;
    href: string;
  };
}

const initialNotifications: Notification[] = [
  {
    id: "NOT-2026-001",
    title: "Nouvelle évaluation disponible",
    message:
      "Une nouvelle évaluation du projet Maison Digitale est disponible. Veuillez consulter les résultats, vérifier les indicateurs concernés et effectuer les actions nécessaires avant la prochaine échéance. Cette notification vous informe que les données ont été enregistrées et sont maintenant disponibles pour consultation.",
    type: "Évaluation",
    priority: "Importante",
    sender: {
      id: "USR-001",
      name: "Administrateur S&E",
      role: "Administrateur",
    },
    recipient: {
      id: "USR-025",
      name: "Responsable Projet",
      role: "Chef de projet",
    },
    source: "Module Évaluations",
    reference: {
      type: "Évaluation",
      id: "EVAL-2026-001",
      label: "Évaluation Maison Digitale",
      href: "/evaluations/EVAL-2026-001",
    },
    sentAt: "08/09/2026 à 08:35",
    receivedAt: "08/09/2026 à 08:35",
    readAt: undefined,
    read: false,
    action: {
      label: "Ouvrir l'évaluation",
      href: "/evaluations/EVAL-2026-001",
    },
  },
  {
    id: "NOT-2026-002",
    title: "Jalon en retard",
    message:
      "Le jalon « Rapport trimestriel » du projet Kids Preneur n'a pas encore été atteint. La date prévue était le 07 septembre 2026. Veuillez vérifier son état, mettre à jour la progression et renseigner les informations nécessaires afin de permettre un suivi correct du projet.",
    type: "Jalon",
    priority: "Urgente",
    sender: {
      id: "SYSTEM",
      name: "Système Ndao Hifanosika",
      role: "Notification automatique",
    },
    recipient: {
      id: "USR-030",
      name: "Responsable Kids Preneur",
      role: "Responsable Projet",
    },
    source: "Module Jalons",
    reference: {
      type: "Jalon",
      id: "JAL-2026-008",
      label: "Rapport trimestriel",
      href: "/milestones/JAL-2026-008",
    },
    sentAt: "08/09/2026 à 07:20",
    receivedAt: "08/09/2026 à 07:20",
    readAt: undefined,
    read: false,
    action: {
      label: "Voir le jalon",
      href: "/milestones/JAL-2026-008",
    },
  },
  {
    id: "NOT-2026-003",
    title: "Nouvelle activité enregistrée",
    message:
      "Une nouvelle activité vient d'être enregistrée dans le projet Ankizy Innov. Les informations relatives à l'activité sont maintenant disponibles dans le module Activités. Vous pouvez consulter les détails et vérifier les indicateurs associés.",
    type: "Activité",
    priority: "Normale",
    sender: {
      id: "USR-045",
      name: "Coordinateur Projet",
      role: "Coordinateur",
    },
    recipient: {
      id: "USR-010",
      name: "Responsable S&E",
      role: "Responsable Suivi & Évaluation",
    },
    source: "Module Activités",
    reference: {
      type: "Activité",
      id: "ACT-2026-015",
      label: "Atelier Ankizy Innov",
      href: "/activities/ACT-2026-015",
    },
    sentAt: "08/09/2026 à 06:50",
    receivedAt: "08/09/2026 à 06:51",
    readAt: "08/09/2026 à 07:10",
    read: true,
    action: {
      label: "Voir l'activité",
      href: "/activities/ACT-2026-015",
    },
  },
  {
    id: "NOT-2026-004",
    title: "Rappel de mise à jour",
    message:
      "Les données de suivi du projet Otrikasa doivent être mises à jour. Merci de vérifier les activités réalisées, les bénéficiaires concernés et les indicateurs de performance avant la prochaine réunion de suivi.",
    type: "Rappel",
    priority: "Importante",
    sender: {
      id: "SYSTEM",
      name: "Système Ndao Hifanosika",
      role: "Notification automatique",
    },
    recipient: {
      id: "USR-018",
      name: "Équipe Otrikasa",
      role: "Équipe Projet",
    },
    source: "Système de suivi",
    reference: {
      type: "Projet",
      id: "PROJ-2026-004",
      label: "Projet Otrikasa",
      href: "/projects/PROJ-2026-004",
    },
    sentAt: "07/09/2026 à 16:30",
    receivedAt: "07/09/2026 à 16:30",
    readAt: undefined,
    read: false,
    action: {
      label: "Voir le projet",
      href: "/projects/PROJ-2026-004",
    },
  },
];

export default function Header({
  mobileMenuOpen,
  setMobileMenuOpen,
}: HeaderProps) {
  const router = useRouter();

  const notificationRef = useRef<HTMLDivElement>(null);

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);

  const [logoutModalOpen, setLogoutModalOpen] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  /* =========================================================
     CLIC EXTÉRIEUR NOTIFICATION
  ========================================================= */

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target as Node
        )
      ) {
        setNotificationOpen(false);
        setSelectedNotification(null);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* =========================================================
     ESCAPE MODAL
  ========================================================= */

  useEffect(() => {
    if (!logoutModalOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !isLoggingOut
      ) {
        setLogoutModalOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [logoutModalOpen, isLoggingOut]);

  /* =========================================================
     BLOQUER SCROLL MODALE
  ========================================================= */

  useEffect(() => {
    if (logoutModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [logoutModalOpen]);

  /* =========================================================
     SIDEBAR
  ========================================================= */

  function toggleSidebar() {
    setNotificationOpen(false);
    setSelectedNotification(null);
    setMobileMenuOpen(!mobileMenuOpen);
  }

  /* =========================================================
     DÉCONNEXION
  ========================================================= */

  function openLogoutModal() {
    setNotificationOpen(false);
    setSelectedNotification(null);
    setMobileMenuOpen(false);
    setLogoutModalOpen(true);
  }

  function cancelLogout() {
    if (isLoggingOut) {
      return;
    }

    setLogoutModalOpen(false);
  }

  function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("userId");
      localStorage.removeItem("userNom");
      localStorage.removeItem("userPrenom");
      localStorage.removeItem("userRole");
    } catch (error) {
      console.error(
        "Erreur lors de la suppression de la session :",
        error
      );
    }

    setNotificationOpen(false);
    setSelectedNotification(null);
    setMobileMenuOpen(false);

    window.setTimeout(() => {
      setLogoutModalOpen(false);
      router.replace("/");
      router.refresh();
    }, 450);
  }

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  function openNotification(
    notification: Notification
  ) {
    const updatedNotification = {
      ...notification,
      read: true,
      readAt:
        notification.readAt ??
        new Date().toLocaleString("fr-FR"),
    };

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? updatedNotification
          : item
      )
    );

    setSelectedNotification(updatedNotification);
    setNotificationOpen(true);
  }

  function closeDetails() {
    setSelectedNotification(null);
  }

  function closeNotifications() {
    setNotificationOpen(false);
    setSelectedNotification(null);
  }

  function markAsRead(id: string) {
    const readAt =
      new Date().toLocaleString("fr-FR");

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              read: true,
              readAt,
            }
          : notification
      )
    );

    setSelectedNotification((current) =>
      current && current.id === id
        ? {
            ...current,
            read: true,
            readAt,
          }
        : current
    );
  }

  function markAllAsRead() {
    const readAt =
      new Date().toLocaleString("fr-FR");

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
        readAt:
          notification.readAt ?? readAt,
      }))
    );

    setSelectedNotification((current) =>
      current
        ? {
            ...current,
            read: true,
            readAt:
              current.readAt ?? readAt,
          }
        : null
    );
  }

  function deleteNotification(id: string) {
    setNotifications((current) =>
      current.filter(
        (notification) =>
          notification.id !== id
      )
    );

    setSelectedNotification(null);
  }

  function deleteAllNotifications() {
    setNotifications([]);
    setSelectedNotification(null);
  }

  function getPriorityClass(
    priority: NotificationPriority
  ) {
    switch (priority) {
      case "Urgente":
        return "bg-red-100 text-red-700";

      case "Importante":
        return "bg-orange-100 text-orange-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function getTypeClass(
    type: NotificationType
  ) {
    switch (type) {
      case "Alerte":
        return "bg-red-100 text-red-700";

      case "Évaluation":
        return "bg-purple-100 text-purple-700";

      case "Projet":
        return "bg-blue-100 text-blue-700";

      case "Jalon":
        return "bg-orange-100 text-orange-700";

      case "Activité":
        return "bg-green-100 text-green-700";

      case "Rappel":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <>
      {/* =========================================================
          HEADER
      ========================================================= */}

      <header className="fixed inset-x-0 top-0 z-[100] h-16 overflow-visible border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="flex h-full w-full min-w-0 items-center gap-1 px-1.5 sm:gap-2 sm:px-4 md:px-6">

          {/* MENU MOBILE */}

          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-blue-50 hover:text-blue-600 active:scale-95 sm:h-11 sm:w-11 lg:hidden"
            aria-label={
              mobileMenuOpen
                ? "Fermer le menu"
                : "Ouvrir le menu"
            }
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {/* =====================================================
              LOGO + NOM
          ===================================================== */}

          <Link
            href="/dashboard"
            onClick={() => {
              setMobileMenuOpen(false);
              setNotificationOpen(false);
              setSelectedNotification(null);
            }}
            className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3"
          >
            <Image
              src="/logos/ndao-hifanosika.png"
              alt="Ndao Hifanosika"
              width={48}
              height={48}
              priority
              className="h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11 md:h-12 md:w-12"
            />

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[12px] font-bold leading-tight text-gray-900 sm:text-sm md:text-base">
                Ndao Hifanosika
              </h1>

              <p className="hidden truncate text-[11px] leading-tight text-gray-500 sm:block sm:text-xs">
                Suivi & Évaluation
              </p>
            </div>
          </Link>

          {/* =====================================================
              ACTIONS
          ===================================================== */}

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">

            {/* ===================================================
                NOTIFICATIONS
            =================================================== */}

            <div
              ref={notificationRef}
              className="relative"
            >
              <button
                type="button"
                onClick={() => {
                  setNotificationOpen(
                    (current) => !current
                  );

                  setSelectedNotification(null);
                  setMobileMenuOpen(false);
                }}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  notificationOpen
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                title="Notifications"
              >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount > 9
                      ? "9+"
                      : unreadCount}
                  </span>
                )}
              </button>

              {/* =================================================
                  PANNEAU NOTIFICATIONS MOBILE
              ================================================= */}

              {notificationOpen &&
                !selectedNotification && (
                  <div
                    className="
                      fixed
                      left-2
                      right-2
                      top-[68px]
                      z-[150]
                      flex
                      max-h-[calc(100dvh-80px)]
                      flex-col
                      overflow-hidden
                      rounded-2xl
                      border
                      border-gray-200
                      bg-white
                      shadow-2xl

                      sm:absolute
                      sm:left-auto
                      sm:right-0
                      sm:top-12
                      sm:w-[460px]
                      sm:max-w-[calc(100vw-2rem)]
                    "
                  >
                    {/* HEADER NOTIFICATION */}

                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-4">
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-gray-900">
                          Notifications
                        </h2>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {unreadCount} non lue
                          {unreadCount > 1
                            ? "s"
                            : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="hidden rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 sm:block"
                          >
                            Tout lire
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={closeNotifications}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                          aria-label="Fermer"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* LISTE */}

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                            <Bell className="h-7 w-7 text-gray-400" />
                          </div>

                          <p className="text-sm font-semibold text-gray-700">
                            Aucune notification
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Vous êtes à jour.
                          </p>
                        </div>
                      ) : (
                        notifications.map(
                          (notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() =>
                                openNotification(
                                  notification
                                )
                              }
                              className={`flex w-full gap-3 border-b border-gray-100 p-4 text-left transition hover:bg-gray-50 ${
                                notification.read
                                  ? "bg-white"
                                  : "bg-blue-50"
                              }`}
                            >
                              <div className="pt-1.5">
                                <span
                                  className={`block h-2.5 w-2.5 rounded-full ${
                                    notification.read
                                      ? "bg-gray-300"
                                      : "bg-blue-600"
                                  }`}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                                    {
                                      notification.title
                                    }
                                  </h3>

                                  <span className="shrink-0 text-[10px] text-gray-400">
                                    {
                                      notification.sentAt
                                    }
                                  </span>
                                </div>

                                <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-gray-600">
                                  {
                                    notification.message
                                  }
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${getTypeClass(
                                      notification.type
                                    )}`}
                                  >
                                    {
                                      notification.type
                                    }
                                  </span>

                                  <span
                                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${getPriorityClass(
                                      notification.priority
                                    )}`}
                                  >
                                    {
                                      notification.priority
                                    }
                                  </span>

                                  <span className="text-xs font-semibold text-blue-600">
                                    Voir le détail →
                                  </span>
                                </div>
                              </div>
                            </button>
                          )
                        )
                      )}
                    </div>

                    {/* FOOTER NOTIFICATION */}

                    {notifications.length > 0 && (
                      <div className="shrink-0 border-t border-gray-200 p-3">
                        <button
                          type="button"
                          onClick={
                            deleteAllNotifications
                          }
                          className="w-full rounded-lg px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Supprimer toutes les
                          notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* ===================================================
                PROFIL
            =================================================== */}

            <Link
              href="/profile"
              onClick={() => {
                setMobileMenuOpen(false);
                setNotificationOpen(false);
                setSelectedNotification(null);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-blue-50 hover:text-blue-600 md:w-auto md:gap-2 md:px-3"
              aria-label="Profil"
              title="Profil"
            >
              <UserCircle className="h-5 w-5" />

              <span className="hidden text-sm font-medium lg:inline">
                Profil
              </span>
            </Link>

            {/* ===================================================
                DÉCONNEXION
            =================================================== */}

            <button
              type="button"
              onClick={openLogoutModal}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-red-50 hover:text-red-600 md:w-auto md:gap-2 md:px-3"
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <LogOut className="h-5 w-5" />

              <span className="hidden text-sm font-medium lg:inline">
                Déconnexion
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ESPACE SOUS HEADER */}

      <div className="h-16" />

      {/* =========================================================
          MODALE DÉCONNEXION
      ========================================================= */}

      {logoutModalOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isLoggingOut
            ) {
              cancelLogout();
            }
          }}
        >
          <div
            className="w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.28)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-description"
          >
            <div className="relative px-6 pb-2 pt-7 sm:px-8 sm:pt-8">
              <button
                type="button"
                onClick={cancelLogout}
                disabled={isLoggingOut}
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 scale-125 rounded-full bg-red-100/60 blur-xl" />

                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-8 border-red-50 bg-red-100">
                    <LogOut className="h-8 w-8 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <h2
                  id="logout-title"
                  className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
                >
                  Confirmer la déconnexion
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Vous êtes sur le point de quitter
                  votre espace de travail.
                </p>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <div
                id="logout-description"
                className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4"
              >
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      Votre session sera sécurisée
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Les informations locales de
                      votre session seront supprimées
                      et vous serez redirigé vers la
                      page d'accueil.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />

                <p className="text-xs leading-5 text-gray-500">
                  Vous pourrez vous reconnecter à
                  tout moment avec vos identifiants.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 bg-gray-50/80 px-6 py-5 sm:px-8">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelLogout}
                  disabled={isLoggingOut}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoggingOut ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Déconnexion...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />
                      Se déconnecter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          DÉTAIL NOTIFICATION
      ========================================================= */}

      {selectedNotification && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-3 sm:p-5 md:p-8"
          onClick={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* HEADER DÉTAIL */}

            <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:flex">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                    Détail de la notification
                  </h2>

                  <p className="truncate text-xs text-gray-500">
                    ID : {selectedNotification.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeNotifications}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* CONTENU */}

            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-4xl p-5 sm:p-7 md:p-8">

                <div className="mb-7">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getTypeClass(
                        selectedNotification.type
                      )}`}
                    >
                      {selectedNotification.type}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getPriorityClass(
                        selectedNotification.priority
                      )}`}
                    >
                      Priorité :{" "}
                      {selectedNotification.priority}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        selectedNotification.read
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {selectedNotification.read
                        ? "Lue"
                        : "Non lue"}
                    </span>
                  </div>

                  <h1 className="break-words text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                    {selectedNotification.title}
                  </h1>
                </div>

                {/* EXPÉDITEUR / DESTINATAIRE */}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <p className="mb-4 text-xs font-bold uppercase tracking-wide text-gray-500">
                      Expéditeur
                    </p>

                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <UserCircle className="h-6 w-6 text-blue-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="break-words font-semibold text-gray-900">
                          {
                            selectedNotification.sender
                              .name
                          }
                        </p>

                        <p className="mt-1 break-words text-xs text-gray-500">
                          {
                            selectedNotification.sender
                              .role
                          }
                        </p>

                        <p className="mt-1 break-all text-[11px] text-gray-400">
                          ID :{" "}
                          {
                            selectedNotification.sender
                              .id
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <p className="mb-4 text-xs font-bold uppercase tracking-wide text-gray-500">
                      Destinataire
                    </p>

                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <UserCircle className="h-6 w-6 text-blue-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="break-words font-semibold text-gray-900">
                          {
                            selectedNotification
                              .recipient.name
                          }
                        </p>

                        <p className="mt-1 break-words text-xs text-gray-500">
                          {
                            selectedNotification
                              .recipient.role
                          }
                        </p>

                        <p className="mt-1 break-all text-[11px] text-gray-400">
                          ID :{" "}
                          {
                            selectedNotification
                              .recipient.id
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* INFORMATIONS */}

                <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
                  <h3 className="mb-5 text-base font-bold text-gray-900">
                    Informations de transmission
                  </h3>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">

                    <div>
                      <p className="text-xs text-gray-500">
                        Origine
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                        {
                          selectedNotification.source
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Type
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {
                          selectedNotification.type
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Priorité
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {
                          selectedNotification.priority
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Date / heure d'envoi
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                        {
                          selectedNotification.sentAt
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Date / heure de réception
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                        {
                          selectedNotification.receivedAt
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Date / heure de lecture
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                        {
                          selectedNotification.readAt ??
                          "Pas encore lue"
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* ÉLÉMENT CONCERNÉ */}

                {selectedNotification.reference && (
                  <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="mb-4 text-base font-bold text-gray-900">
                      Élément concerné
                    </h3>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                      <div>
                        <p className="text-xs text-gray-500">
                          Type
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {
                            selectedNotification
                              .reference.type
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Identifiant
                        </p>

                        <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                          {
                            selectedNotification
                              .reference.id
                          }
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-500">
                          Nom
                        </p>

                        <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                          {
                            selectedNotification
                              .reference.label
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* MESSAGE */}

                <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-gray-900">
                      Message
                    </h3>

                    <span className="text-xs text-gray-400">
                      Message complet
                    </span>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-5 sm:p-6">
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700 sm:text-base">
                      {
                        selectedNotification.message
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex shrink-0 flex-col gap-3 border-t border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

              <button
                type="button"
                onClick={() =>
                  deleteNotification(
                    selectedNotification.id
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>

              <div className="flex flex-col gap-2 sm:flex-row">

                {!selectedNotification.read && (
                  <button
                    type="button"
                    onClick={() =>
                      markAsRead(
                        selectedNotification.id
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Check className="h-4 w-4" />
                    Marquer comme lu
                  </button>
                )}

                {selectedNotification.action && (
                  <Link
                    href={
                      selectedNotification.action.href
                    }
                    onClick={closeNotifications}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    {
                      selectedNotification.action.label
                    }
                  </Link>
                )}

                <button
                  type="button"
                  onClick={closeNotifications}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}