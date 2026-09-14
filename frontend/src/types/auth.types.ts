// src/types/auth.types.ts
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  role?: string;
  department?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  position?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Constantes des rôles
export type UserRole = 
  | "admin"
  | "directeur"
  | "rh"
  | "daf"
  | "communication"
  | "coordinateur"
  | "tuteur"
  | "stagiaire";

export const ROLES: Record<UserRole, string> = {
  admin: "Administrateur",
  directeur: "Direction",
  rh: "Ressources Humaines",
  daf: "DAF",
  communication: "Communication",
  coordinateur: "Coordinateur",
  tuteur: "Tuteur",
  stagiaire: "Stagiaire",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  directeur: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  rh: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  daf: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  communication: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  coordinateur: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  tuteur: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  stagiaire: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};