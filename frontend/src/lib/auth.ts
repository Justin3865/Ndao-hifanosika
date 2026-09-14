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

// Récupérer l'utilisateur connecté
export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

// Récupérer le token d'accès
export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
};

// Récupérer le token de rafraîchissement
export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
};

// Vérifier si l'utilisateur est authentifié
export const isAuthenticated = (): boolean => {
  return authService.isAuthenticated();
};

// Vérifier si l'utilisateur a un rôle spécifique
export const hasRole = (role: string): boolean => {
  const user = getCurrentUser();
  return user?.role === role;
};

// Vérifier si l'utilisateur a l'un des rôles
export const hasAnyRole = (roles: string[]): boolean => {
  const user = getCurrentUser();
  return user ? roles.includes(user.role) : false;
};

// Vérifier si l'utilisateur a toutes les permissions
export const hasPermissions = (permissions: string[]): boolean => {
  return permissions.every((permission) => authService.hasPermission(permission));
};

// Vérifier si l'utilisateur a une permission
export const hasPermission = (permission: string): boolean => {
  return authService.hasPermission(permission);
};

// Déconnexion
export const logout = async (): Promise<void> => {
  await authService.logout();
};

// Rediriger vers la page de connexion
export const redirectToLogin = (returnUrl?: string): void => {
  if (typeof window === "undefined") return;
  const url = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login";
  window.location.href = url;
};

// Rediriger vers le dashboard
export const redirectToDashboard = (): void => {
  if (typeof window === "undefined") return;
  window.location.href = "/dashboard";
};

// Middleware de protection des routes
export const protectRoute = (requiredRoles?: string[], requiredPermissions?: string[]): boolean => {
  if (!isAuthenticated()) {
    redirectToLogin(typeof window !== "undefined" ? window.location.pathname : undefined);
    return false;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasAnyRole(requiredRoles)) {
      redirectToDashboard();
      return false;
    }
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasPermissions(requiredPermissions)) {
      redirectToDashboard();
      return false;
    }
  }

  return true;
};