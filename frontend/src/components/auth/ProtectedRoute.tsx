// src/components/auth/ProtectedRoute.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

export interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallbackPath?: string;
  className?: string;
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallbackPath = "/login",
  className,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Simuler l'authentification et les permissions
  useEffect(() => {
    const checkAuth = async () => {
      // Simuler un appel API
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Simulation d'un utilisateur connecté
      const user = {
        id: "1",
        name: "Jean Dupont",
        email: "jean.dupont@ndao-hifanosika.org",
        role: "admin",
        permissions: ["read", "write", "delete"],
      };

      const isAuth = !!user;
      setIsAuthenticated(isAuth);

      if (isAuth) {
        // Vérifier les rôles
        const hasRequiredRole = requiredRoles.length === 0 || requiredRoles.includes(user.role);
        
        // Vérifier les permissions
        const hasRequiredPermissions = requiredPermissions.length === 0 || 
          requiredPermissions.every((perm) => user.permissions.includes(perm));

        setHasAccess(hasRequiredRole && hasRequiredPermissions);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [requiredRoles, requiredPermissions]);

  // Rediriger si non authentifié
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = `${fallbackPath}?returnUrl=${encodeURIComponent(pathname)}`;
      router.push(redirectUrl);
    }
  }, [isLoading, isAuthenticated, fallbackPath, pathname, router]);

  // Rediriger si pas d'accès
  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasAccess) {
      router.push("/dashboard");
    }
  }, [isLoading, isAuthenticated, hasAccess, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground text-sm">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasAccess) {
    return null;
  }

  return <div className={cn(className)}>{children}</div>;
}

// HOC pour protéger un composant
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

// Hook pour vérifier les permissions
export function usePermissions(requiredPermissions: string[] = []) {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      // Simuler la vérification des permissions
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      // Simulation d'un utilisateur
      const userPermissions = ["read", "write", "delete"];
      const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));
      setHasPermissions(hasAll);
      setIsLoading(false);
    };

    checkPermissions();
  }, [requiredPermissions]);

  return { hasPermissions, isLoading };
}