
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { canAccessPath } from "@/lib/access";

export interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallbackPath?: string;
  className?: string;
}

interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  status?: string;
}

/**
 * Maka ny utilisateur tena connecté ao amin'ny localStorage.
 */
function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");

    // Tsy authentifié raha tsy misy token
    if (!token) {
      return null;
    }

    // Tsy misy utilisateur
    if (!userData) {
      return null;
    }

    const user = JSON.parse(userData) as AuthUser;

    // Vérification fanampiny
    if (!user || typeof user !== "object") {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Erreur lecture utilisateur:", error);
    return null;
  }
}

/**
 * Manamarina raha manana permission ilay utilisateur.
 */
function checkUserAccess(
  user: AuthUser,
  requiredRoles: string[],
  requiredPermissions: string[]
): boolean {
  const userRole = user.role?.trim().toUpperCase() || "";

  const userPermissions = Array.isArray(user.permissions)
    ? user.permissions.map((permission) =>
        String(permission).trim().toLowerCase()
      )
    : [];

  /**
   * ROLE
   *
   * Raha misy requiredRoles:
   * -> tsy maintsy ao anatin'io role io ilay utilisateur.
   */
  const hasRequiredRole =
    requiredRoles.length === 0 ||
    requiredRoles.some(
      (role) => role.trim().toUpperCase() === userRole
    );

  /**
   * PERMISSIONS
   *
   * Raha misy requiredPermissions:
   * -> tsy maintsy manana permission REHETRA ilaina ilay utilisateur.
   */
  const hasRequiredPermissions =
    requiredPermissions.length === 0 ||
    requiredPermissions.every((permission) =>
      userPermissions.includes(permission.trim().toLowerCase())
    );

  return hasRequiredRole && hasRequiredPermissions;
}

/**
 * Mémoire du dernier utilisateur vérifié. Chaque page remonte son propre <AppLayout>,
 * donc ce composant est recréé à chaque navigation : sans cette mémoire il repassait
 * par l'écran « Vérification des accès... » et toute la page (menu + en-tête) clignotait.
 */
let lastVerifiedUser: AuthUser | null = null;

export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallbackPath = "/login",
  className,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Navigation côté client : on réutilise le dernier utilisateur vérifié (pas d'écran de chargement).
  // Au tout premier chargement la mémoire est vide -> même rendu que le serveur (pas d'erreur d'hydratation).
  // On relit le localStorage (jamais le cache seul) : après une déconnexion / changement de compte, rien de périmé.
  const remembered = lastVerifiedUser ? getStoredUser() : null;
  const rememberedAccess =
    remembered !== null &&
    checkUserAccess(remembered, requiredRoles, requiredPermissions) &&
    (requiredRoles.length > 0 || requiredPermissions.length > 0 || canAccessPath(remembered.role, pathname));

  const [isLoading, setIsLoading] = useState(remembered === null);
  const [isAuthenticated, setIsAuthenticated] = useState(remembered !== null);
  const [hasAccess, setHasAccess] = useState(rememberedAccess);

  useEffect(() => {
    const checkAuth = () => {
      const user = getStoredUser();

      // Tsy connecté
      if (!user) {
        lastVerifiedUser = null;
        setIsAuthenticated(false);
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      lastVerifiedUser = user;
      setIsAuthenticated(true);

      /**
       * Vérification réelle amin'ny role + permissions
       * an'ilay utilisateur connecté.
       */
      const access = checkUserAccess(
        user,
        requiredRoles,
        requiredPermissions
      );

      /**
       * Contrôle par chemin (matrice rôle -> routes de lib/access.ts).
       * Ignoré si la page demande explicitement requiredRoles /
       * requiredPermissions.
       */
      const pathAllowed =
        requiredRoles.length > 0 ||
        requiredPermissions.length > 0 ||
        canAccessPath(user.role, pathname);

      setHasAccess(access && pathAllowed);
      setIsLoading(false);
    };

    checkAuth();
  }, [requiredRoles, requiredPermissions, pathname]);

  /**
   * Tsy authentifié -> Login
   */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = `${fallbackPath}?returnUrl=${encodeURIComponent(
        pathname
      )}`;

      router.replace(redirectUrl);
    }
  }, [
    isLoading,
    isAuthenticated,
    fallbackPath,
    pathname,
    router,
  ]);

  /**
   * Authentifié fa tsy manana permission:
   * -> /403
   *
   * Tsy alefa any /dashboard intsony satria
   * mety hiteraka boucle na hanome impression hoe afaka miditra izy.
   */
  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasAccess) {
      router.replace(`/403?from=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, hasAccess, router, pathname]);

  /**
   * Loading
   */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />

          <p className="text-muted-foreground text-sm">
            Vérification des accès...
          </p>
        </div>
      </div>
    );
  }

  /**
   * Raha tsy authentifié na tsy manana accès
   * -> tsy aseho ny contenu.
   */
  if (!isAuthenticated || !hasAccess) {
    return null;
  }

  /**
   * Accès autorisé
   */
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
}

/**
 * HOC pour protéger un composant.
 */
export function withProtection<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, "children">
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Hook pour vérifier les permissions.
 */
export function usePermissions(
  requiredPermissions: string[] = []
) {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = () => {
      const user = getStoredUser();

      if (!user) {
        setHasPermissions(false);
        setIsLoading(false);
        return;
      }

      const userPermissions = Array.isArray(user.permissions)
        ? user.permissions.map((permission) =>
            String(permission).trim().toLowerCase()
          )
        : [];

      const hasAll =
        requiredPermissions.length === 0 ||
        requiredPermissions.every((permission) =>
          userPermissions.includes(
            permission.trim().toLowerCase()
          )
        );

      setHasPermissions(hasAll);
      setIsLoading(false);
    };

    checkPermissions();
  }, [requiredPermissions]);

  return {
    hasPermissions,
    isLoading,
  };
}
