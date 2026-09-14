// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import authService, { LoginCredentials, RegisterData, AuthResponse } from "@/services/auth.service";

export interface UseAuthReturn {
  user: AuthResponse["user"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  error: string | null;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger l'utilisateur au montage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = authService.getUser();
        if (storedUser && authService.isAuthenticated()) {
          setUser(storedUser);
        } else if (storedUser) {
          // Le token est expiré, essayer de le rafraîchir
          const newToken = await authService.refreshToken();
          if (newToken) {
            setUser(storedUser);
          } else {
            authService.clearTokens();
            authService.clearUser();
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'utilisateur:", err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Connexion
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      return response;
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Inscription
  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(data);
      setUser(response.user);
      return response;
    } catch (err: any) {
      setError(err.message || "Erreur d'inscription");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Déconnexion
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Erreur lors de la déconnexion:", err);
      // Même en cas d'erreur, on nettoie
      authService.clearTokens();
      authService.clearUser();
      setUser(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Rafraîchir le token
  const refreshToken = useCallback(async () => {
    try {
      const newToken = await authService.refreshToken();
      if (newToken) {
        const storedUser = authService.getUser();
        if (storedUser) {
          setUser(storedUser);
        }
      }
      return newToken;
    } catch (err) {
      console.error("Erreur lors du rafraîchissement du token:", err);
      return null;
    }
  }, []);

  // Permissions
  const hasPermission = useCallback((permission: string): boolean => {
    return authService.hasPermission(permission);
  }, []);

  const hasRole = useCallback((role: string): boolean => {
    return authService.hasRole(role);
  }, []);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return authService.hasAnyRole(roles);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && authService.isAuthenticated(),
    login,
    register,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
    hasAnyRole,
    error,
    clearError,
  };
}

// Hook simplifié pour vérifier l'authentification
export function useIsAuthenticated(): boolean {
  const { isAuthenticated, isLoading } = useAuth();
  return !isLoading && isAuthenticated;
}

// Hook pour obtenir l'utilisateur
export function useUser(): AuthResponse["user"] | null {
  const { user } = useAuth();
  return user;
}

// Hook pour les permissions
export function usePermissions(requiredPermissions: string[] = []): {
  hasAll: boolean;
  hasAny: boolean;
  isLoading: boolean;
} {
  const { hasPermission, isLoading } = useAuth();
  const [hasAll, setHasAll] = useState(false);
  const [hasAny, setHasAny] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setHasAll(requiredPermissions.every((p) => hasPermission(p)));
      setHasAny(requiredPermissions.some((p) => hasPermission(p)));
    }
  }, [isLoading, requiredPermissions, hasPermission]);

  return { hasAll, hasAny, isLoading };
}

export default useAuth;