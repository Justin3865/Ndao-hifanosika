// src/lib/axios.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from "axios";
import { authService } from "@/services/auth.service";

// Configuration de base
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_TIMEOUT = 30000;

// Types pour les réponses
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

// Instance Axios
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Intercepteur de requête - Ajout du token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse - Gestion des erreurs
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Si erreur 401 et pas déjà retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Essayer de rafraîchir le token
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          if (response.data.success && response.data.data?.accessToken) {
            localStorage.setItem("accessToken", response.data.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
            return axiosInstance(originalRequest);
          }
        }
      } catch (refreshError) {
        // Si le refresh échoue, rediriger vers login
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Fonction pour gérer les erreurs
export const handleApiError = (error: any): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return {
      status: axiosError.response?.status || 500,
      message: (axiosError.response?.data as any)?.message || "Une erreur est survenue",
      errors: (axiosError.response?.data as any)?.errors,
    };
  }
  return {
    status: 500,
    message: error.message || "Une erreur est survenue",
  };
};

// Fonction pour les requêtes GET
export const apiGet = async <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  try {
    const response = await axiosInstance.get<ApiResponse<T>>(url, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Fonction pour les requêtes POST
export const apiPost = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  try {
    const response = await axiosInstance.post<ApiResponse<T>>(url, data, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Fonction pour les requêtes PUT
export const apiPut = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  try {
    const response = await axiosInstance.put<ApiResponse<T>>(url, data, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Fonction pour les requêtes PATCH
export const apiPatch = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  try {
    const response = await axiosInstance.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Fonction pour les requêtes DELETE
export const apiDelete = async <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  try {
    const response = await axiosInstance.delete<ApiResponse<T>>(url, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Fonction pour les uploads de fichiers
export const apiUpload = async <T = any>(
  url: string,
  file: File,
  fieldName: string = "file",
  additionalData?: Record<string, any>
): Promise<ApiResponse<T>> => {
  const formData = new FormData();
  formData.append(fieldName, file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  return apiPost<T>(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Fonction pour les uploads multiples
export const apiUploadMultiple = async <T = any>(
  url: string,
  files: File[],
  fieldName: string = "files",
  additionalData?: Record<string, any>
): Promise<ApiResponse<T>> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append(fieldName, file);
  });
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  return apiPost<T>(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export default axiosInstance;