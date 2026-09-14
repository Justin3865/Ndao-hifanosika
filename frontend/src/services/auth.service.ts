// src/services/auth.service.ts
import api, { ApiResponse } from "./api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  department?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    position?: string;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordResetData {
  email: string;
}

export interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
}

class AuthService {
  private readonly basePath = "/auth";

  // Connexion
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(`${this.basePath}/login`, credentials);
    
    if (response.success && response.data) {
      // Stocker les tokens
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      this.setUser(response.data.user);
    }

    return response.data!;
  }

  // Inscription
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(`${this.basePath}/register`, data);
    
    if (response.success && response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      this.setUser(response.data.user);
    }

    return response.data!;
  }

  // Déconnexion
  async logout(): Promise<void> {
    try {
      await api.post(`${this.basePath}/logout`);
    } finally {
      this.clearTokens();
      this.clearUser();
    }
  }

  // Rafraîchir le token
  async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await api.post<{ accessToken: string }>(`${this.basePath}/refresh`, {
        refreshToken,
      });

      if (response.success && response.data) {
        this.setAccessToken(response.data.accessToken);
        return response.data.accessToken;
      }
      return null;
    } catch (error) {
      this.clearTokens();
      return null;
    }
  }

  // Demande de réinitialisation du mot de passe
  async requestPasswordReset(email: string): Promise<ApiResponse> {
    return api.post(`${this.basePath}/forgot-password`, { email });
  }

  // Réinitialisation du mot de passe
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return api.post(`${this.basePath}/reset-password`, {
      token,
      newPassword,
    });
  }

  // Changer le mot de passe (authentifié)
  async changePassword(data: PasswordUpdateData): Promise<ApiResponse> {
    return api.post(`${this.basePath}/change-password`, data);
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    // Vérifier si le token est expiré
    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) return false;
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  // Récupérer l'utilisateur connecté
  getUser(): AuthResponse["user"] | null {
    if (typeof window === "undefined") return null;
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  // Gestion des tokens
  private setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  }

  private setAccessToken(accessToken: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("accessToken", accessToken);
  }

  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
  }

  private clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  private setUser(user: AuthResponse["user"]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("user", JSON.stringify(user));
  }

  private clearUser(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("user");
  }

  // Décoder le token JWT
  private decodeToken(token: string): any {
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  // Récupérer les permissions de l'utilisateur
  getUserPermissions(): string[] {
    const user = this.getUser();
    if (!user) return [];
    
    // Simuler des permissions basées sur le rôle
    const permissionsMap: Record<string, string[]> = {
      admin: ["read", "write", "delete", "manage_users", "manage_permissions"],
      directeur: ["read", "write", "manage_reports"],
      rh: ["read", "write", "manage_members"],
      daf: ["read", "write", "manage_budget"],
      communication: ["read", "write"],
      coordinateur: ["read", "write", "manage_projects"],
      tuteur: ["read", "write"],
      stagiaire: ["read"],
    };

    return permissionsMap[user.role] || ["read"];
  }

  // Vérifier si l'utilisateur a une permission
  hasPermission(permission: string): boolean {
    const permissions = this.getUserPermissions();
    return permissions.includes(permission);
  }

  // Vérifier si l'utilisateur a un rôle
  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  // Vérifier si l'utilisateur a un des rôles
  hasAnyRole(roles: string[]): boolean {
    const user = this.getUser();
    return user ? roles.includes(user.role) : false;
  }
}

// Singleton
export const authService = new AuthService();

export default authService;