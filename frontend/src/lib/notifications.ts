"use client";

/* =========================================================
   TYPES
========================================================= */

export type NotificationType =
  | "Info"
  | "Succès"
  | "Alerte"
  | "Évaluation"
  | "Projet"
  | "Rapport"
  | "Jalon";

export type NotificationPriority =
  | "Faible"
  | "Normale"
  | "Haute"
  | "Urgente";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;

  recipient: string;

  projectId?: string;
  projectName?: string;

  isRead: boolean;

  actionUrl?: string;

  createdAt: string;
  expiresAt?: string;
}

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "ndao-hifanosika-notifications";

/* =========================================================
   DEFAULT NOTIFICATIONS
========================================================= */

const defaultNotifications: Notification[] = [
  {
    id: "NOT-001",
    title: "Rapport à valider",
    message:
      "Le rapport du projet Maison Digitale est disponible et nécessite une validation.",
    type: "Rapport",
    priority: "Haute",
    recipient: "Direction",
    projectId: "PROJ-001",
    projectName: "Maison Digitale",
    isRead: false,
    actionUrl: "/reports",
    createdAt: "2026-09-03T08:30:00",
  },

  {
    id: "NOT-002",
    title: "Jalon proche",
    message:
      "Le prochain jalon du projet Kids Preneur approche. Pensez à vérifier son état d'avancement.",
    type: "Jalon",
    priority: "Urgente",
    recipient: "Chef de projet",
    projectId: "PROJ-002",
    projectName: "Kids Preneur",
    isRead: false,
    actionUrl: "/milestones",
    createdAt: "2026-09-03T09:15:00",
  },

  {
    id: "NOT-003",
    title: "Évaluation disponible",
    message:
      "Une nouvelle évaluation est disponible pour le projet Ankizy Innov.",
    type: "Évaluation",
    priority: "Normale",
    recipient: "Équipe S&E",
    projectId: "PROJ-003",
    projectName: "Ankizy Innov",
    isRead: false,
    actionUrl: "/evaluations",
    createdAt: "2026-09-02T14:00:00",
  },

  {
    id: "NOT-004",
    title: "Activité terminée",
    message:
      "Une activité du projet Otrikasa a été déclarée comme terminée.",
    type: "Projet",
    priority: "Normale",
    recipient: "Direction",
    projectId: "PROJ-004",
    projectName: "Otrikasa",
    isRead: false,
    actionUrl: "/activities",
    createdAt: "2026-09-02T11:30:00",
  },

  {
    id: "NOT-005",
    title: "Rappel des indicateurs",
    message:
      "Veuillez mettre à jour les indicateurs de suivi du projet Maison Digitale.",
    type: "Alerte",
    priority: "Haute",
    recipient: "Équipe S&E",
    projectId: "PROJ-001",
    projectName: "Maison Digitale",
    isRead: false,
    actionUrl: "/projects",
    createdAt: "2026-09-01T16:45:00",
  },
];

/* =========================================================
   BROWSER CHECK
========================================================= */

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/* =========================================================
   VALIDATION
========================================================= */

function isNotificationType(
  value: unknown
): value is NotificationType {
  return (
    value === "Info" ||
    value === "Succès" ||
    value === "Alerte" ||
    value === "Évaluation" ||
    value === "Projet" ||
    value === "Rapport" ||
    value === "Jalon"
  );
}

function isNotificationPriority(
  value: unknown
): value is NotificationPriority {
  return (
    value === "Faible" ||
    value === "Normale" ||
    value === "Haute" ||
    value === "Urgente"
  );
}

function isValidNotification(
  value: unknown
): value is Notification {
  if (!value || typeof value !== "object") {
    return false;
  }

  const notification = value as Partial<Notification>;

  return (
    typeof notification.id === "string" &&
    typeof notification.title === "string" &&
    typeof notification.message === "string" &&
    isNotificationType(notification.type) &&
    isNotificationPriority(notification.priority) &&
    typeof notification.recipient === "string" &&
    typeof notification.isRead === "boolean" &&
    typeof notification.createdAt === "string"
  );
}

/* =========================================================
   INITIALISATION
========================================================= */

function initializeNotifications(): Notification[] {
  if (!isBrowser()) {
    return [...defaultNotifications];
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);

    /*
     * Première utilisation :
     * on crée les notifications par défaut.
     */
    if (!existing) {
      const initialData = [...defaultNotifications];

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(initialData)
      );

      return initialData;
    }

    const parsed: unknown = JSON.parse(existing);

    /*
     * Si le contenu n'est pas un tableau,
     * on remet les données par défaut.
     */
    if (!Array.isArray(parsed)) {
      const initialData = [...defaultNotifications];

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(initialData)
      );

      return initialData;
    }

    /*
     * On garde uniquement les notifications valides.
     */
    const validNotifications = parsed.filter(
      isValidNotification
    );

    /*
     * Si aucune notification valide n'existe,
     * on réinitialise.
     */
    if (validNotifications.length === 0) {
      const initialData = [...defaultNotifications];

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(initialData)
      );

      return initialData;
    }

    /*
     * Nettoyage automatique du localStorage
     * si certaines anciennes données étaient invalides.
     */
    if (validNotifications.length !== parsed.length) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(validNotifications)
      );
    }

    return validNotifications;
  } catch (error) {
    console.error(
      "Erreur lors de la lecture des notifications :",
      error
    );

    const initialData = [...defaultNotifications];

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(initialData)
      );
    } catch (storageError) {
      console.error(
        "Impossible d'initialiser les notifications :",
        storageError
      );
    }

    return initialData;
  }
}

/* =========================================================
   GET ALL
========================================================= */

export function getNotifications(): Notification[] {
  return initializeNotifications();
}

/* =========================================================
   SAVE
========================================================= */

export function saveNotifications(
  notifications: Notification[]
): Notification[] {
  if (!isBrowser()) {
    return notifications;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(notifications)
    );
  } catch (error) {
    console.error(
      "Erreur lors de la sauvegarde des notifications :",
      error
    );
  }

  return notifications;
}

/* =========================================================
   GET BY ID
========================================================= */

export function getNotificationById(
  id: string
): Notification | undefined {
  const notifications = getNotifications();

  return notifications.find(
    (notification) => notification.id === id
  );
}

/* =========================================================
   MARK AS READ
========================================================= */

export function markNotificationAsRead(
  id: string
): Notification | undefined {
  const notifications = getNotifications();

  const updated = notifications.map((notification) => {
    if (notification.id !== id) {
      return notification;
    }

    return {
      ...notification,
      isRead: true,
    };
  });

  saveNotifications(updated);

  return updated.find(
    (notification) => notification.id === id
  );
}

/* =========================================================
   MARK AS UNREAD
========================================================= */

export function markNotificationAsUnread(
  id: string
): Notification | undefined {
  const notifications = getNotifications();

  const updated = notifications.map((notification) => {
    if (notification.id !== id) {
      return notification;
    }

    return {
      ...notification,
      isRead: false,
    };
  });

  saveNotifications(updated);

  return updated.find(
    (notification) => notification.id === id
  );
}

/* =========================================================
   TOGGLE READ STATUS
========================================================= */

export function toggleNotificationReadStatus(
  id: string
): Notification | undefined {
  const notifications = getNotifications();

  const updated = notifications.map((notification) => {
    if (notification.id !== id) {
      return notification;
    }

    return {
      ...notification,
      isRead: !notification.isRead,
    };
  });

  saveNotifications(updated);

  return updated.find(
    (notification) => notification.id === id
  );
}

/* =========================================================
   MARK ALL AS READ
========================================================= */

export function markAllNotificationsAsRead(): Notification[] {
  const notifications = getNotifications();

  const updated = notifications.map((notification) => ({
    ...notification,
    isRead: true,
  }));

  return saveNotifications(updated);
}

/* =========================================================
   MARK ALL AS UNREAD
========================================================= */

export function markAllNotificationsAsUnread(): Notification[] {
  const notifications = getNotifications();

  const updated = notifications.map((notification) => ({
    ...notification,
    isRead: false,
  }));

  return saveNotifications(updated);
}

/* =========================================================
   DELETE
========================================================= */

export function deleteNotification(
  id: string
): Notification[] {
  const notifications = getNotifications();

  const updated = notifications.filter(
    (notification) => notification.id !== id
  );

  return saveNotifications(updated);
}

/* =========================================================
   CREATE
========================================================= */

export function createNotification(
  data: Omit<Notification, "id" | "createdAt">
): Notification {
  const notifications = getNotifications();

  const newNotification: Notification = {
    ...data,
    id: `NOT-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  const updated = [
    newNotification,
    ...notifications,
  ];

  saveNotifications(updated);

  return newNotification;
}

/* =========================================================
   FORMAT DATE
========================================================= */

export function formatNotificationDate(
  dateString: string
): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/* =========================================================
   FORMAT RELATIVE DATE
========================================================= */

export function formatNotificationRelativeDate(
  dateString: string
): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const now = Date.now();
  const diff = now - date.getTime();

  /*
   * Si la date est dans le futur.
   */
  if (diff < 0) {
    return "À l'instant";
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "À l'instant";
  }

  if (minutes < 60) {
    return `Il y a ${minutes} min`;
  }

  if (hours < 24) {
    return `Il y a ${hours} h`;
  }

  if (days === 1) {
    return "Hier";
  }

  if (days < 7) {
    return `Il y a ${days} jours`;
  }

  return formatNotificationDate(dateString);
}

/* =========================================================
   TYPE CLASS
========================================================= */

export function getNotificationTypeClass(
  type: NotificationType
): string {
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

/* =========================================================
   PRIORITY CLASS
========================================================= */

export function getNotificationPriorityClass(
  priority: NotificationPriority
): string {
  switch (priority) {
    case "Urgente":
      return "bg-red-100 text-red-700";

    case "Haute":
      return "bg-orange-100 text-orange-700";

    case "Normale":
      return "bg-blue-100 text-blue-700";

    case "Faible":
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/* =========================================================
   RESET STORAGE
   Utile pendant le développement
========================================================= */

export function resetNotifications(): Notification[] {
  const notifications = [...defaultNotifications];

  if (isBrowser()) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(notifications)
      );
    } catch (error) {
      console.error(
        "Erreur lors de la réinitialisation des notifications :",
        error
      );
    }
  }

  return notifications;
}