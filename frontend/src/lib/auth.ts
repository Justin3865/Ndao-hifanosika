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
}

// ============================================================
// UTILISATEUR CONNECTÉ
// ============================================================

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const user = localStorage.getItem("user");

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

  return localStorage.getItem("accessToken");
};

// ============================================================
// REFRESH TOKEN
// ============================================================

export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("refreshToken");
};

// ============================================================
// AUTHENTIFICATION
// ============================================================

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const token = getAccessToken();

  return Boolean(token);
};

// ============================================================
// RÔLE
// ============================================================

export const hasRole = (role: string): boolean => {
  const user = getCurrentUser();

  if (!user) {
    return false;
  }

  return user.role === role;
};

export const hasAnyRole = (
  roles: string[],
): boolean => {
  const user = getCurrentUser();

  if (!user) {
    return false;
  }

  return roles.includes(user.role);
};

// ============================================================
// PERMISSIONS
// ============================================================

export const hasPermissions = (
  permissions: string[],
): boolean => {
  return permissions.every((permission) =>
    authService.hasPermission(permission),
  );
};

export const hasPermission = (
  permission: string,
): boolean => {
  return authService.hasPermission(permission);
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

    // Nettoyage local même si le backend échoue
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }

    throw error;
  }
};

// ============================================================
// REDIRECTION LOGIN
// ============================================================

export const redirectToLogin = (
  returnUrl?: string,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  const url = returnUrl
    ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
    : "/login";

  window.location.href = url;
};

// ============================================================
// REDIRECTION DASHBOARD
// ============================================================

export const redirectToDashboard = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href = "/dashboard";
};

// ============================================================
// PROTECTION DES ROUTES
// ============================================================

export const protectRoute = (
  requiredRoles?: string[],
  requiredPermissions?: string[],
): boolean => {
  // ----------------------------------------------------------
  // Vérification authentification
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
  // Vérification des rôles
  // ----------------------------------------------------------

  if (
    requiredRoles &&
    requiredRoles.length > 0
  ) {
    if (!hasAnyRole(requiredRoles)) {
      redirectToDashboard();

      return false;
    }
  }

  // ----------------------------------------------------------
  // Vérification des permissions
  // ----------------------------------------------------------

  if (
    requiredPermissions &&
    requiredPermissions.length > 0
  ) {
    if (!hasPermissions(requiredPermissions)) {
      redirectToDashboard();

      return false;
    }
  }

  return true;
};