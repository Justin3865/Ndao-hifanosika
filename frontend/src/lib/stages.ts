/* =========================================================
   Helpers partagés pour les offres de stage
========================================================= */

export type InternshipOffer = {
  id: number | string;
  title: string;
  domain?: string | null;
  location?: string | null;
  duration?: string | null;
  deadline?: string | null;
  places?: number | null;
  description: string;
  createdAt?: string;
};

export type StoredUser = {
  id?: number | string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
};

export const getApiUrl = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

/**
 * Rôles autorisés à publier / modifier / retirer des offres et à traiter les candidatures.
 * ⚠️ Doit rester identique à OFFER_MANAGER_ROLES dans
 *    backend/src/routes/internshipOffers.routes.ts
 */
export const OFFER_MANAGER_ROLES = ["ADMIN", "RH", "COORDINATOR"];

export function canManageOffers(user: StoredUser | null) {
  const role = (user?.role || "").toUpperCase();
  return OFFER_MANAGER_ROLES.includes(role);
}

/** Alias conservé : les pages qui importent encore isAdmin continuent de fonctionner. */
export const isAdmin = canManageOffers;

export function isClosed(offer: InternshipOffer) {
  if (!offer.deadline) return false;
  const end = new Date(offer.deadline);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

export function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Appel API avec cookies + Bearer token si disponible */
export async function apiRequest(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(`${getApiUrl()}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error: any = new Error(data.message || "Une erreur est survenue.");
    error.status = response.status;
    throw error;
  }

  return data;
}

/** Mémorise la page demandée puis ouvre le modal connexion / inscription de l'accueil */
export function goToAuth(
  router: { push: (url: string) => void },
  redirectTo: string,
  mode: "login" | "register" = "login"
) {
  sessionStorage.setItem("postLoginRedirect", redirectTo);
  router.push(`/?auth=${mode}`);
}
