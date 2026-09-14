// src/services/api.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";

// Configuration de base
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const AI_API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8000";

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  status: number;
  message: string;
  errors?: string[];
}

// Classe principale pour les appels API
class ApiService {
  private client: AxiosInstance;
  private aiClient: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      timeout: 30000,
    });

    this.aiClient = axios.create({
      baseURL: AI_API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      timeout: 60000, // Plus de temps pour les appels IA
    });

    // Intercepteur pour ajouter le token d'authentification
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Intercepteur pour gérer les erreurs
    this.client.interceptors.response.use(
      (response) => response,
      this.handleError.bind(this)
    );

    this.aiClient.interceptors.response.use(
      (response) => response,
      this.handleError.bind(this)
    );
  }

  // Récupérer le token
  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken") || null;
    }
    return null;
  }

  // Gérer les erreurs
  private handleError(error: AxiosError): Promise<never> {
    const apiError: ApiError = {
      status: error.response?.status || 500,
      message: "Une erreur est survenue",
    };

    if (error.response?.data) {
      const data = error.response.data as any;
      apiError.message = data.message || data.error || apiError.message;
      apiError.errors = data.errors;
    }

    // Gestion des erreurs d'authentification
    if (apiError.status === 401) {
      if (typeof window !== "undefined") {
        // Rediriger vers la page de connexion
        window.location.href = "/login";
      }
    }

    return Promise.reject(apiError);
  }

  // Méthodes génériques
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // Méthodes spécifiques pour l'IA
  async aiGet<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.aiClient.get<T>(url, config);
    return response.data;
  }

  async aiPost<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.aiClient.post<T>(url, data, config);
    return response.data;
  }

  // Upload de fichiers
  async upload<T = any>(url: string, file: File, fieldName: string = "file"): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  // Upload multiple
  async uploadMultiple<T = any>(url: string, files: File[], fieldName: string = "files"): Promise<ApiResponse<T>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(fieldName, file);
    });

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
}

// Singleton
export const api = new ApiService();

export default api;