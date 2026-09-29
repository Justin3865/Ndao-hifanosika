import api, { ApiResponse } from "./api";

// ============================================================
// TYPES
// ============================================================

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

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  position?: string;
  avatar?: string;
  status?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
}

// ============================================================
// SERVICE AUTHENTIFICATION
// ============================================================

class AuthService {
  private readonly basePath = "/auth";

  // ==========================================================
  // CONNEXION
  // ==========================================================

  async login(
    credentials: LoginCredentials
  ): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.basePath}/login`,
      credentials
    );

    if (!response.success || !response.data) {
      throw new Error(
        response.message || "Échec de la connexion"
      );
    }

    const authData = response.data;

    // Un compte doit être ACTIVE pour accéder à la plateforme.
    if (
      authData.user?.status?.trim().toUpperCase() !==
      "ACTIVE"
    ) {
      this.clearAuthentication();

      throw new Error(
        "Votre compte n'est pas encore actif."
      );
    }

    // Stocker les informations de connexion
    this.setTokens(
      authData.accessToken,
      authData.refreshToken
    );

    this.setUser(authData.user);

    return authData;
  }

  // ==========================================================
  // INSCRIPTION
  // ==========================================================

  async register(
    data: RegisterData
  ): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      `${this.basePath}/register`,
      data
    );

    if (!response.success || !response.data) {
      throw new Error(
        response.message || "Échec de l'inscription"
      );
    }

    const authData = response.data;

    /*
     * Une inscription peut créer un compte PENDING.
     *
     * Un utilisateur PENDING ne doit pas être considéré
     * comme authentifié.
     */

    if (
      authData.accessToken &&
      authData.refreshToken &&
      authData.user?.status?.trim().toUpperCase() ===
        "ACTIVE"
    ) {
      this.setTokens(
        authData.accessToken,
        authData.refreshToken
      );

      this.setUser(authData.user);
    } else {
      // Si le compte est PENDING ou n'a pas de token,
      // aucun accès authentifié ne doit être conservé.
      this.clearAuthentication();

      if (authData.user) {
        // On conserve uniquement les informations nécessaires
        // au résultat de l'inscription si le backend les fournit.
        // Le compte n'est cependant pas considéré connecté.
      }
    }

    return authData;
  }

  // ==========================================================
  // DÉCONNEXION
  // ==========================================================

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();

      if (refreshToken) {
        await api.post(`${this.basePath}/logout`, {
          refreshToken,
        });
      }
    } catch {
      /*
       * Même si le backend refuse le logout,
       * le nettoyage local doit quand même être effectué.
       */
    } finally {
      this.clearAuthentication();

      if (typeof window !== "undefined") {
        // Le login actuel est une modal sur la page d'accueil.
        window.location.href = "/";
      }
    }
  }

  // ==========================================================
  // RAFRAÎCHIR LE TOKEN
  // ==========================================================

  async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await api.post<{
        accessToken: string;
        refreshToken?: string;
        expiresIn?: number;
      }>(
        `${this.basePath}/refresh`,
        {
          refreshToken,
        }
      );

      if (
        response.success &&
        response.data?.accessToken
      ) {
        this.setAccessToken(
          response.data.accessToken
        );

        // Le backend peut éventuellement fournir
        // un nouveau refresh token.
        if (response.data.refreshToken) {
          localStorage.setItem(
            "refreshToken",
            response.data.refreshToken
          );
        }

        return response.data.accessToken;
      }

      return null;
    } catch {
      this.clearAuthentication();
      return null;
    }
  }

  // ==========================================================
  // MOT DE PASSE OUBLIÉ
  // ==========================================================

  async requestPasswordReset(
    email: string
  ): Promise<ApiResponse> {
    return api.post(
      `${this.basePath}/forgot-password`,
      { email }
    );
  }

  // ==========================================================
  // RÉINITIALISATION DU MOT DE PASSE
  // ==========================================================

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<ApiResponse> {
    return api.post(
      `${this.basePath}/reset-password`,
      {
        token,
        newPassword,
      }
    );
  }

  // ==========================================================
  // CHANGEMENT DU MOT DE PASSE
  // ==========================================================

  async changePassword(
    data: PasswordUpdateData
  ): Promise<ApiResponse> {
    return api.post(
      `${this.basePath}/change-password`,
      data
    );
  }

  // ==========================================================
  // UTILISATEUR AUTHENTIFIÉ
  // ==========================================================

  isAuthenticated(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    const token = this.getAccessToken();
    const user = this.getUser();

    // Aucun token
    if (!token) {
      return false;
    }

    // Aucun utilisateur
    if (!user) {
      return false;
    }

    // Le compte doit être ACTIVE
    if (
      user.status?.trim().toUpperCase() !==
      "ACTIVE"
    ) {
      return false;
    }

    try {
      const payload = this.decodeToken(token);

      if (!payload) {
        return false;
      }

      // Vérifier l'expiration du JWT
      if (payload.exp) {
        return (
          payload.exp * 1000 >
          Date.now()
        );
      }

      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================
  // UTILISATEUR COURANT
  // ==========================================================

  getUser(): AuthUser | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const user = localStorage.getItem("user");

      if (!user) {
        return null;
      }

      return JSON.parse(user) as AuthUser;
    } catch {
      return null;
    }
  }

  // ==========================================================
  // ACCESS TOKEN
  // ==========================================================

  getAccessToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("accessToken");
  }

  // ==========================================================
  // REFRESH TOKEN
  // ==========================================================

  getRefreshToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("refreshToken");
  }

  // ==========================================================
  // STOCKER LES TOKENS
  // ==========================================================

  private setTokens(
    accessToken: string,
    refreshToken: string
  ): void {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(
      "accessToken",
      accessToken
    );

    localStorage.setItem(
      "refreshToken",
      refreshToken
    );
  }

  // ==========================================================
  // MODIFIER ACCESS TOKEN
  // ==========================================================

  private setAccessToken(
    accessToken: string
  ): void {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(
      "accessToken",
      accessToken
    );
  }

  // ==========================================================
  // STOCKER UTILISATEUR
  // ==========================================================

  private setUser(user: AuthUser): void {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );
  }

  // ==========================================================
  // SUPPRIMER TOKENS
  // ==========================================================

  private clearTokens(): void {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  // ==========================================================
  // SUPPRIMER UTILISATEUR
  // ==========================================================

  private clearUser(): void {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem("user");
  }

  // ==========================================================
  // NETTOYAGE COMPLET
  // ==========================================================

  private clearAuthentication(): void {
    this.clearTokens();
    this.clearUser();
  }

  // ==========================================================
  // DÉCODER JWT
  // ==========================================================

  private decodeToken(token: string): any {
    try {
      const parts = token.split(".");

      if (parts.length !== 3) {
        return null;
      }

      const base64Url = parts[1];

      const base64 = base64Url
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(
            (char) =>
              `%${(
                "00" +
                char.charCodeAt(0).toString(16)
              ).slice(-2)}`
          )
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  // ==========================================================
  // PERMISSIONS
  // ==========================================================

  getUserPermissions(): string[] {
    const user = this.getUser();

    if (
      !user ||
      user.status?.trim().toUpperCase() !==
        "ACTIVE"
    ) {
      return [];
    }

    /*
     * Ces permissions servent au contrôle de l'interface.
     *
     * La sécurité réelle devra également être vérifiée
     * côté backend.
     */

    const permissionsMap: Record<string, string[]> = {
      ADMIN: [
        "read",
        "write",
        "delete",
        "manage_users",
        "manage_permissions",
        "manage_projects",
        "manage_reports",
        "manage_budget",
      ],

      DIRECTION: [
        "read",
        "write",
        "manage_reports",
        "manage_projects",
      ],

      DSI: [
        "read",
        "write",
        "manage_users",
        "manage_permissions",
      ],

      DAF: [
        "read",
        "write",
        "manage_budget",
        "manage_reports",
      ],

      RH: [
        "read",
        "write",
        "manage_members",
      ],

      COMMUNICATION: [
        "read",
        "write",
      ],

      COORDINATOR: [
        "read",
        "write",
        "manage_projects",
      ],

      TUTEUR_L3: [
        "read",
        "write",
      ],

      TUTEUR_M2: [
        "read",
        "write",
      ],

      STAGIAIRE_L3: [
        "read",
      ],

      STAGIAIRE_M2: [
        "read",
      ],
    };

    const role =
      user.role?.trim().toUpperCase();

    return permissionsMap[role] || [];
  }

  // ==========================================================
  // VÉRIFIER UNE PERMISSION
  // ==========================================================

  hasPermission(
    permission: string
  ): boolean {
    const normalizedPermission =
      permission.trim().toLowerCase();

    return this
      .getUserPermissions()
      .map((item) =>
        item.trim().toLowerCase()
      )
      .includes(normalizedPermission);
  }

  // ==========================================================
  // VÉRIFIER UN RÔLE
  // ==========================================================

  hasRole(role: string): boolean {
    const user = this.getUser();

    if (
      !user ||
      user.status?.trim().toUpperCase() !==
        "ACTIVE"
    ) {
      return false;
    }

    return (
      user.role?.trim().toUpperCase() ===
      role.trim().toUpperCase()
    );
  }

  // ==========================================================
  // VÉRIFIER PLUSIEURS RÔLES
  // ==========================================================

  hasAnyRole(
    roles: string[]
  ): boolean {
    const user = this.getUser();

    if (
      !user ||
      user.status?.trim().toUpperCase() !==
        "ACTIVE"
    ) {
      return false;
    }

    const userRole =
      user.role?.trim().toUpperCase();

    return roles.some(
      (role) =>
        role.trim().toUpperCase() ===
        userRole
    );
  }
}

// ============================================================
// SINGLETON
// ============================================================

export const authService =
  new AuthService();

export default authService;