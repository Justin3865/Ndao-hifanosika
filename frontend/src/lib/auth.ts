// src/lib/auth.ts

import { authService } from "@/services/auth.service";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  position?: string;
  avatar?: string;
  status?: string;
}

// ============================================================
// UTILISATEUR CONNECTÉ
// ============================================================

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const user =
      localStorage.getItem("user");

    if (!user) {
      return null;
    }

    return JSON.parse(user) as User;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de l'utilisateur :",
      error,
    );

    return null;
  }
};

// ============================================================
// ACCESS TOKEN
// ============================================================

export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(
    "accessToken",
  );
};

// ============================================================
// REFRESH TOKEN
// ============================================================

export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(
    "refreshToken",
  );
};

// ============================================================
// AUTHENTIFICATION
// ============================================================

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const user =
    getCurrentUser();

  if (!user) {
    return false;
  }

  // Seul un compte ACTIVE peut accéder
  if (
    user.status?.trim().toUpperCase() !==
    "ACTIVE"
  ) {
    return false;
  }

  // Vérification JWT + expiration
  return authService.isAuthenticated();
};

// ============================================================
// RÔLE
// ============================================================

export const hasRole = (
  role: string,
): boolean => {
  const user =
    getCurrentUser();

  if (!user || !isAuthenticated()) {
    return false;
  }

  return (
    user.role?.trim().toUpperCase() ===
    role.trim().toUpperCase()
  );
};

export const hasAnyRole = (
  roles: string[],
): boolean => {
  const user =
    getCurrentUser();

  if (!user || !isAuthenticated()) {
    return false;
  }

  const userRole =
    user.role?.trim().toUpperCase();

  return roles.some(
    (role) =>
      role.trim().toUpperCase() ===
      userRole,
  );
};

// ============================================================
// PERMISSIONS
// ============================================================

export const hasPermissions = (
  permissions: string[],
): boolean => {
  if (!isAuthenticated()) {
    return false;
  }

  return permissions.every(
    (permission) =>
      authService.hasPermission(
        permission,
      ),
  );
};

export const hasPermission = (
  permission: string,
): boolean => {
  if (!isAuthenticated()) {
    return false;
  }

  return authService.hasPermission(
    permission,
  );
};

// ============================================================
// LOGOUT
// ============================================================

export const logout = async (): Promise<void> => {
  try {
    await authService.logout();
  } catch (error) {
    console.error(
      "Erreur lors de la déconnexion :",
      error,
    );

    if (typeof window !== "undefined") {
      localStorage.removeItem(
        "accessToken",
      );

      localStorage.removeItem(
        "refreshToken",
      );

      localStorage.removeItem(
        "user",
      );
    }

    throw error;
  }
};

// ============================================================
// REDIRECTION VERS LOGIN
// ============================================================

export const redirectToLogin = (
  returnUrl?: string,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  /*
   * Le système actuel utilise LoginModal
   * sur la page d'accueil.
   */

  const url = returnUrl
    ? `/?login=true&returnUrl=${encodeURIComponent(
        returnUrl,
      )}`
    : "/?login=true";

  window.location.href = url;
};

// ============================================================
// REDIRECTION DASHBOARD
// ============================================================

export const redirectToDashboard = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href =
    "/dashboard";
};

// ============================================================
// PROTECTION DES ROUTES
// ============================================================

export const protectRoute = (
  requiredRoles: string[] = [],
  requiredPermissions: string[] = [],
): boolean => {
  // ----------------------------------------------------------
  // AUTHENTIFICATION
  // ----------------------------------------------------------

  if (!isAuthenticated()) {
    redirectToLogin(
      typeof window !== "undefined"
        ? window.location.pathname
        : undefined,
    );

    return false;
  }

  // ----------------------------------------------------------
  // RÔLES
  // ----------------------------------------------------------

  if (
    requiredRoles.length > 0 &&
    !hasAnyRole(requiredRoles)
  ) {
    redirectToDashboard();

    return false;
  }

  // ----------------------------------------------------------
  // PERMISSIONS
  // ----------------------------------------------------------

  if (
    requiredPermissions.length > 0 &&
    !hasPermissions(
      requiredPermissions,
    )
  ) {
    redirectToDashboard();

    return false;
  }

  return true;
};